package repository

import (
	"context"

	"github.com/rafehmalik/ai-content-moderation/internal/database"
	"github.com/rafehmalik/ai-content-moderation/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func CreateSubmission(s *models.Submission) error {
	s.ID = primitive.NewObjectID()
	_, err := database.Col("submissions").InsertOne(context.Background(), s)
	return err
}

func GetSubmissionsByUser(userID primitive.ObjectID) ([]models.Submission, error) {
	var results []models.Submission
	opts := options.Find().SetSort(bson.M{"createdAt": -1})
	cur, err := database.Col("submissions").Find(context.Background(),
		bson.M{"userId": userID}, opts)
	if err != nil {
		return nil, err
	}
	cur.All(context.Background(), &results)
	return results, nil
}

func GetSubmissionByID(id primitive.ObjectID) (*models.Submission, error) {
	var s models.Submission
	err := database.Col("submissions").FindOne(context.Background(), bson.M{"_id": id}).Decode(&s)
	return &s, err
}
