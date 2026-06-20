package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	database "github.com/rafehmalik/ai-content-moderation/internal/database"
	"github.com/rafehmalik/ai-content-moderation/internal/repository"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ── Policy Management ─────────────────────────────────────────────────────────

func GetPolicies(c *gin.Context) {
	policies, err := repository.GetAllPolicies()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not fetch policies"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"policies": policies})
}

func UpdatePolicy(c *gin.Context) {
	idStr := c.Param("id")
	policyID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid policy id"})
		return
	}

	var body struct {
		Enabled   bool    `json:"enabled"`
		Threshold float64 `json:"threshold" binding:"required,min=0,max=100"`
		Action    string  `json:"action"    binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if body.Action != "AutoBlock" && body.Action != "FlagReview" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "action must be AutoBlock or FlagReview"})
		return
	}

	if err := repository.UpdatePolicy(policyID, body.Enabled, body.Threshold, body.Action); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not update policy"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "policy updated"})
}

// ── Manual Verdict Override ───────────────────────────────────────────────────

func OverrideVerdict(c *gin.Context) {
	idStr := c.Param("id")
	verdictID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid verdict id"})
		return
	}

	var body struct {
		Outcome string `json:"outcome" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	allowed := map[string]bool{"Approved": true, "Flagged": true, "Blocked": true}
	if !allowed[body.Outcome] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "outcome must be Approved, Flagged, or Blocked"})
		return
	}

	adminID := c.GetString("userID")
	if err := repository.UpdateVerdictOutcome(verdictID, body.Outcome, "admin:"+adminID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not override verdict"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "verdict overridden", "newOutcome": body.Outcome})
}

// ── Analytics Dashboard ───────────────────────────────────────────────────────

func GetAnalytics(c *gin.Context) {
	ctx := context.Background()

	// ── 1. Total submissions ──────────────────────────────────────────────────
	totalSubmissions, _ := database.Col("submissions").CountDocuments(ctx, bson.M{})

	// Today's submissions
	startOfDay := time.Now().Truncate(24 * time.Hour)
	todayCount, _ := database.Col("submissions").CountDocuments(ctx,
		bson.M{"createdAt": bson.M{"$gte": startOfDay}})

	// This week
	startOfWeek := time.Now().AddDate(0, 0, -7)
	weekCount, _ := database.Col("submissions").CountDocuments(ctx,
		bson.M{"createdAt": bson.M{"$gte": startOfWeek}})

	// ── 2. Verdict distribution by outcome ───────────────────────────────────
	outcomePipeline := bson.A{
		bson.M{"$group": bson.M{
			"_id":   "$outcome",
			"count": bson.M{"$sum": 1},
		}},
	}
	outcomeCur, _ := database.Col("verdicts").Aggregate(ctx, outcomePipeline)
	var outcomeStats []struct {
		Outcome string `bson:"_id"`
		Count   int    `bson:"count"`
	}
	outcomeCur.All(ctx, &outcomeStats)

	// ── 3. Category detection counts ─────────────────────────────────────────
	categoryPipeline := bson.A{
		bson.M{"$unwind": "$categoryResults"},
		bson.M{"$match": bson.M{"categoryResults.detected": true}},
		bson.M{"$group": bson.M{
			"_id":   "$categoryResults.category",
			"count": bson.M{"$sum": 1},
		}},
		bson.M{"$sort": bson.M{"count": -1}},
	}
	catCur, _ := database.Col("verdicts").Aggregate(ctx, categoryPipeline)
	var categoryStats []struct {
		Category string `bson:"_id"`
		Count    int    `bson:"count"`
	}
	catCur.All(ctx, &categoryStats)

	// ── 4. Appeal stats ───────────────────────────────────────────────────────
	totalAppeals, _ := database.Col("appeals").CountDocuments(ctx, bson.M{})
	acceptedAppeals, _ := database.Col("appeals").CountDocuments(ctx, bson.M{"status": "Accepted"})
	rejectedAppeals, _ := database.Col("appeals").CountDocuments(ctx, bson.M{"status": "Rejected"})
	pendingAppeals, _ := database.Col("appeals").CountDocuments(ctx, bson.M{"status": "Pending"})

	// ── 5. Top users by submission count ─────────────────────────────────────
	topSubmittersPipeline := bson.A{
		bson.M{"$group": bson.M{
			"_id":   "$userId",
			"count": bson.M{"$sum": 1},
		}},
		bson.M{"$sort": bson.M{"count": -1}},
		bson.M{"$limit": 5},
		bson.M{"$lookup": bson.M{
			"from":         "users",
			"localField":   "_id",
			"foreignField": "_id",
			"as":           "user",
		}},
		bson.M{"$unwind": "$user"},
		bson.M{"$project": bson.M{
			"count":    1,
			"userName": "$user.name",
			"email":    "$user.email",
		}},
	}
	topSubCur, _ := database.Col("submissions").Aggregate(ctx, topSubmittersPipeline)
	var topSubmitters []struct {
		UserID   primitive.ObjectID `bson:"_id"`
		UserName string             `bson:"userName"`
		Email    string             `bson:"email"`
		Count    int                `bson:"count"`
	}
	topSubCur.All(ctx, &topSubmitters)

	// ── 6. Top users by violation count ──────────────────────────────────────
	topViolatorsPipeline := bson.A{
		// Join submissions to get userId on each verdict
		bson.M{"$match": bson.M{"outcome": bson.M{"$in": bson.A{"Flagged", "Blocked"}}}},
		bson.M{"$lookup": bson.M{
			"from":         "submissions",
			"localField":   "submissionId",
			"foreignField": "_id",
			"as":           "submission",
		}},
		bson.M{"$unwind": "$submission"},
		bson.M{"$group": bson.M{
			"_id":   "$submission.userId",
			"count": bson.M{"$sum": 1},
		}},
		bson.M{"$sort": bson.M{"count": -1}},
		bson.M{"$limit": 5},
		bson.M{"$lookup": bson.M{
			"from":         "users",
			"localField":   "_id",
			"foreignField": "_id",
			"as":           "user",
		}},
		bson.M{"$unwind": "$user"},
		bson.M{"$project": bson.M{
			"count":    1,
			"userName": "$user.name",
			"email":    "$user.email",
		}},
	}
	topViolCur, _ := database.Col("verdicts").Aggregate(ctx, topViolatorsPipeline)
	var topViolators []struct {
		UserID   primitive.ObjectID `bson:"_id"`
		UserName string             `bson:"userName"`
		Email    string             `bson:"email"`
		Count    int                `bson:"count"`
	}
	topViolCur.All(ctx, &topViolators)

	// ── 7. Submissions over time (last 7 days, grouped by date) ──────────────
	timelinePipeline := bson.A{
		bson.M{"$match": bson.M{"createdAt": bson.M{"$gte": startOfWeek}}},
		bson.M{"$group": bson.M{
			"_id": bson.M{
				"$dateToString": bson.M{
					"format": "%Y-%m-%d",
					"date":   "$createdAt",
				},
			},
			"count": bson.M{"$sum": 1},
		}},
		bson.M{"$sort": bson.M{"_id": 1}},
	}
	timelineCur, _ := database.Col("submissions").Aggregate(ctx, timelinePipeline)
	var timeline []struct {
		Date  string `bson:"_id"`
		Count int    `bson:"count"`
	}
	timelineCur.All(ctx, &timeline)

	// ── Assemble response ─────────────────────────────────────────────────────
	c.JSON(http.StatusOK, gin.H{
		"submissions": gin.H{
			"total":    totalSubmissions,
			"today":    todayCount,
			"week":     weekCount,
			"timeline": timeline,
		},
		"verdicts": gin.H{
			"byOutcome":  outcomeStats,
			"byCategory": categoryStats,
		},
		"appeals": gin.H{
			"total":    totalAppeals,
			"pending":  pendingAppeals,
			"accepted": acceptedAppeals,
			"rejected": rejectedAppeals,
		},
		"topUsers": gin.H{
			"bySubmissions": topSubmitters,
			"byViolations":  topViolators,
		},
	})
}
