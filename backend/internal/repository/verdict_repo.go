package repository

import (
	"context"

	"github.com/rafehmalik/ai-content-moderation/internal/database"
	"github.com/rafehmalik/ai-content-moderation/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func CreateVerdict(v *models.Verdict) error {
	v.ID = primitive.NewObjectID()
	_, err := database.Col("verdicts").InsertOne(context.Background(), v)
	return err
}

func GetVerdictsBySubmission(subID primitive.ObjectID) ([]models.Verdict, error) {
	var verdicts []models.Verdict
	cur, err := database.Col("verdicts").Find(context.Background(),
		bson.M{"submissionId": subID})
	if err != nil {
		return nil, err
	}
	cur.All(context.Background(), &verdicts)
	return verdicts, nil
}

func UpdateVerdictOutcome(id primitive.ObjectID, outcome, overriddenBy string) error {
	_, err := database.Col("verdicts").UpdateOne(context.Background(),
		bson.M{"_id": id},
		bson.M{"$set": bson.M{"outcome": outcome, "overriddenBy": overriddenBy}})
	return err
}
