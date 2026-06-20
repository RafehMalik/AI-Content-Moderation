package repository

import (
	"context"

	"github.com/rafehmalik/ai-content-moderation/internal/database"
	"github.com/rafehmalik/ai-content-moderation/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func GetAllPolicies() ([]models.Policy, error) {
	var policies []models.Policy
	cur, err := database.Col("policies").Find(context.Background(), bson.M{})
	if err != nil {
		return nil, err
	}
	cur.All(context.Background(), &policies)
	return policies, nil
}

func UpdatePolicy(id primitive.ObjectID, enabled bool, threshold float64, action string) error {
	_, err := database.Col("policies").UpdateOne(context.Background(),
		bson.M{"_id": id},
		bson.M{"$set": bson.M{
			"enabled":   enabled,
			"threshold": threshold,
			"action":    action,
		}})
	return err
}

// SeedPolicies inserts the 6 default categories once on first run
func SeedPolicies() {
	count, _ := database.Col("policies").CountDocuments(context.Background(), bson.M{})
	if count > 0 {
		return
	}
	categories := []string{
		"Graphic Violence", "Hate Symbols", "Self-Harm",
		"Extremist Propaganda", "Weapons & Contraband", "Harassment & Humiliation",
	}
	var docs []interface{}
	for _, cat := range categories {
		docs = append(docs, models.Policy{
			ID:        primitive.NewObjectID(),
			Category:  cat,
			Enabled:   true,
			Threshold: 70,
			Action:    "FlagReview",
			Version:   "v1",
		})
	}
	database.Col("policies").InsertMany(context.Background(), docs)
}
