package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rafehmalik/ai-content-moderation/internal/models"
	"github.com/rafehmalik/ai-content-moderation/internal/repository"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ── User: file an appeal ──────────────────────────────────────────────────────

func CreateAppeal(c *gin.Context) {
	userIDStr := c.GetString("userID")
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user"})
		return
	}

	var body struct {
		SubmissionID string `json:"submissionId" binding:"required"`
		Reason       string `json:"reason"       binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	subID, err := primitive.ObjectIDFromHex(body.SubmissionID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid submissionId"})
		return
	}

	// Verify submission exists and belongs to this user
	submission, err := repository.GetSubmissionByID(subID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "submission not found"})
		return
	}
	if submission.UserID.Hex() != userIDStr {
		c.JSON(http.StatusForbidden, gin.H{"error": "not your submission"})
		return
	}

	// Only Flagged or Blocked submissions can be appealed
	verdicts, err := repository.GetVerdictsBySubmission(subID)
	if err != nil || len(verdicts) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no verdicts found for this submission"})
		return
	}

	// Check at least one verdict is Flagged or Blocked
	appealable := false
	for _, v := range verdicts {
		if v.Outcome == "Flagged" || v.Outcome == "Blocked" {
			appealable = true
			break
		}
	}
	if !appealable {
		c.JSON(http.StatusBadRequest, gin.H{"error": "only Flagged or Blocked submissions can be appealed"})
		return
	}

	// Prevent duplicate appeals
	existing, _ := repository.GetAppealBySubmission(subID)
	if existing != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "appeal already exists for this submission"})
		return
	}

	appeal := &models.Appeal{
		SubmissionID: subID,
		UserID:       userID,
		Reason:       body.Reason,
		Status:       "Pending",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := repository.CreateAppeal(appeal); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create appeal"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"appeal": appeal})
}

// ── User: view my appeals ─────────────────────────────────────────────────────

func GetMyAppeals(c *gin.Context) {
	userIDStr := c.GetString("userID")
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user"})
		return
	}

	appeals, err := repository.GetAppealsByUser(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not fetch appeals"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"appeals": appeals})
}

// ── Admin: view all pending appeals ──────────────────────────────────────────

func GetAllAppeals(c *gin.Context) {
	// Optional filter: ?status=Pending
	status := c.Query("status")

	appeals, err := repository.GetAllAppeals()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not fetch appeals"})
		return
	}

	// Attach user name and submission info to each appeal for the admin UI
	type AppealDetail struct {
		models.Appeal
		UserName  string   `json:"userName"`
		ImageURLs []string `json:"imageUrls"`
	}

	var result []AppealDetail
	for _, a := range appeals {
		if status != "" && a.Status != status {
			continue
		}

		user, _ := repository.FindUserByID(a.UserID)
		submission, _ := repository.GetSubmissionByID(a.SubmissionID)

		detail := AppealDetail{Appeal: a}
		if user != nil {
			detail.UserName = user.Name
		}
		if submission != nil {
			detail.ImageURLs = submission.Images
		}
		result = append(result, detail)
	}

	c.JSON(http.StatusOK, gin.H{"appeals": result})
}

// ── Admin: accept or reject an appeal ────────────────────────────────────────

func ReviewAppeal(c *gin.Context) {
	idStr := c.Param("id")
	appealID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid appeal id"})
		return
	}

	var body struct {
		Status        string `json:"status"        binding:"required"` // Accepted | Rejected
		AdminResponse string `json:"adminResponse"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if body.Status != "Accepted" && body.Status != "Rejected" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "status must be Accepted or Rejected"})
		return
	}

	// Fetch the appeal to get submissionId
	appeal, err := repository.GetAppealByID(appealID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "appeal not found"})
		return
	}

	if appeal.Status != "Pending" {
		c.JSON(http.StatusConflict, gin.H{"error": "appeal already reviewed"})
		return
	}

	// Update appeal status
	if err := repository.UpdateAppealStatus(appealID, body.Status, body.AdminResponse); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not update appeal"})
		return
	}

	// If accepted → override all verdicts on this submission to Approved
	if body.Status == "Accepted" {
		verdicts, _ := repository.GetVerdictsBySubmission(appeal.SubmissionID)
		adminID := c.GetString("userID")
		for _, v := range verdicts {
			repository.UpdateVerdictOutcome(v.ID, "Approved", "admin:"+adminID)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "appeal reviewed",
		"status":  body.Status,
	})
}
