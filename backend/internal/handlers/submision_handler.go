package handlers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	database "github.com/rafehmalik/ai-content-moderation/internal/database"
	"github.com/rafehmalik/ai-content-moderation/internal/models"
	"github.com/rafehmalik/ai-content-moderation/internal/repository"
	"github.com/rafehmalik/ai-content-moderation/internal/services"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func SubmitImages(c *gin.Context) {
	// Log incoming auth header for debugging
	logHeader := c.GetHeader("Authorization")
	log.Printf("[submit] incoming Authorization: %s", logHeader)

	// Get user from JWT middleware
	userIDStr := c.GetString("userID")
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user"})
		return
	}

	// Parse multipart form (max 32MB)
	if err := c.Request.ParseMultipartForm(32 << 20); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "could not parse form"})
		return
	}

	files := c.Request.MultipartForm.File["images"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no images provided"})
		return
	}

	// Create submission record first
	submission := &models.Submission{
		UserID:    userID,
		CreatedAt: time.Now(),
	}

	var savedPaths []string
	var verdicts []models.Verdict
	var savedFilesInfo []map[string]interface{}

	for _, fileHeader := range files {
		// Validate file type
		ext := filepath.Ext(fileHeader.Filename)
		allowed := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true}
		if !allowed[ext] {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("file type %s not allowed", ext)})
			return
		}

		// Save file to disk under uploads/
		savePath := fmt.Sprintf("uploads/%d_%s", time.Now().UnixNano(), fileHeader.Filename)
		if err := c.SaveUploadedFile(fileHeader, savePath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save file"})
			return
		}
		// Log saved path and size for debugging differences between clients
		if info, err := os.Stat(savePath); err == nil {
			log.Printf("[submit] saved file=%s size=%d bytes originalName=%s", savePath, info.Size(), fileHeader.Filename)
			savedFilesInfo = append(savedFilesInfo, map[string]interface{}{"path": savePath, "size": info.Size(), "originalName": fileHeader.Filename})
		} else {
			log.Printf("[submit] saved file=%s stat error: %v", savePath, err)
			savedFilesInfo = append(savedFilesInfo, map[string]interface{}{"path": savePath, "size": 0, "originalName": fileHeader.Filename, "statError": err.Error()})
		}
		savedPaths = append(savedPaths, savePath)

		// Run AI moderation on this image
		categoryResults, outcome, policyVersion, err := services.ModerateImage(savePath)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "moderation failed: " + err.Error()})
			return
		}

		verdicts = append(verdicts, models.Verdict{
			ImageURL:        "/" + savePath,
			Outcome:         outcome,
			PolicyVersion:   policyVersion,
			CategoryResults: categoryResults,
			CreatedAt:       time.Now(),
		})
	}

	// Save submission
	submission.Images = savedPaths
	if err := repository.CreateSubmission(submission); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save submission"})
		return
	}

	// Save a verdict per image, linked to submission
	var savedVerdicts []models.Verdict
	for i := range verdicts {
		verdicts[i].SubmissionID = submission.ID
		if err := repository.CreateVerdict(&verdicts[i]); err != nil {
			continue
		}
		savedVerdicts = append(savedVerdicts, verdicts[i])
	}

	c.JSON(http.StatusCreated, gin.H{
		"submission": submission,
		"verdicts":   savedVerdicts,
		"debug": gin.H{
			"authorization": logHeader,
			"saved_files":   savedFilesInfo,
		},
	})
}

func GetMySubmissions(c *gin.Context) {
	userIDStr := c.GetString("userID")
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user"})
		return
	}

	// Read optional query filters
	outcome := c.Query("outcome")   // e.g. ?outcome=Blocked
	category := c.Query("category") // e.g. ?category=Weapons & Contraband
	from := c.Query("from")         // e.g. ?from=2025-01-01
	to := c.Query("to")             // e.g. ?to=2025-12-31

	submissions, err := repository.GetSubmissionsByUser(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not fetch submissions"})
		return
	}

	// For each submission attach its verdicts
	type SubmissionWithVerdicts struct {
		models.Submission
		Verdicts []models.Verdict `json:"verdicts"`
	}

	var result []SubmissionWithVerdicts
	for _, sub := range submissions {
		verdicts, _ := repository.GetVerdictsBySubmission(sub.ID)

		// Apply filters at this level
		if outcome != "" || category != "" || from != "" || to != "" {
			if !matchesFilter(sub, verdicts, outcome, category, from, to) {
				continue
			}
		}

		result = append(result, SubmissionWithVerdicts{
			Submission: sub,
			Verdicts:   verdicts,
		})
	}

	c.JSON(http.StatusOK, gin.H{"submissions": result})
}

func GetSubmission(c *gin.Context) {
	idStr := c.Param("id")
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	submission, err := repository.GetSubmissionByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "submission not found"})
		return
	}

	// Only owner or admin can view
	userIDStr := c.GetString("userID")
	role := c.GetString("role")
	if submission.UserID.Hex() != userIDStr && role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	verdicts, _ := repository.GetVerdictsBySubmission(id)
	appeal, _ := repository.GetAppealBySubmission(id)

	c.JSON(http.StatusOK, gin.H{
		"submission": submission,
		"verdicts":   verdicts,
		"appeal":     appeal,
	})
}

// matchesFilter checks if a submission matches the query filters
func matchesFilter(
	sub models.Submission,
	verdicts []models.Verdict,
	outcome, category, from, to string,
) bool {
	for _, v := range verdicts {
		// Outcome filter
		if outcome != "" && v.Outcome != outcome {
			continue
		}
		// Category filter — check if any category result matches
		if category != "" {
			found := false
			for _, cr := range v.CategoryResults {
				if cr.Category == category && cr.Detected {
					found = true
					break
				}
			}
			if !found {
				continue
			}
		}
		// Date range filter
		if from != "" {
			fromTime, err := time.Parse("2006-01-02", from)
			if err == nil && sub.CreatedAt.Before(fromTime) {
				continue
			}
		}
		if to != "" {
			toTime, err := time.Parse("2006-01-02", to)
			if err == nil && sub.CreatedAt.After(toTime) {
				continue
			}
		}
		return true
	}
	return false
}

// Admin: see ALL submissions across all users
func GetAllSubmissionsAdmin(c *gin.Context) {
	ctx := context.Background()

	cur, err := database.Col("submissions").Find(ctx, bson.M{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not fetch submissions"})
		return
	}

	var submissions []bson.M
	cur.All(ctx, &submissions)

	c.JSON(http.StatusOK, gin.H{"submissions": submissions})
}
