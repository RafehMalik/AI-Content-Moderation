package repository

import (
	"context"

	"github.com/rafehmalik/ai-content-moderation/internal/database"
	"github.com/rafehmalik/ai-content-moderation/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func CreateAppeal(a *models.Appeal) error {
	a.ID = primitive.NewObjectID()
	_, err := database.Col("appeals").InsertOne(context.Background(), a)
	return err
}

func GetAllAppeals() ([]models.Appeal, error) {
	var appeals []models.Appeal
	cur, err := database.Col("appeals").Find(context.Background(), bson.M{})
	if err != nil {
		return nil, err
	}
	cur.All(context.Background(), &appeals)
	return appeals, nil
}

func GetAppealsByUser(userID primitive.ObjectID) ([]models.Appeal, error) {
	var appeals []models.Appeal
	cur, err := database.Col("appeals").Find(context.Background(),
		bson.M{"userId": userID})
	if err != nil {
		return nil, err
	}
	cur.All(context.Background(), &appeals)
	return appeals, nil
}

func UpdateAppealStatus(id primitive.ObjectID, status, response string) error {
	_, err := database.Col("appeals").UpdateOne(context.Background(),
		bson.M{"_id": id},
		bson.M{"$set": bson.M{"status": status, "adminResponse": response}})
	return err
}
func GetAppealBySubmission(submissionID primitive.ObjectID) (*models.Appeal, error) {
	var a models.Appeal
	err := database.Col("appeals").FindOne(
		context.Background(),
		bson.M{"submissionId": submissionID},
	).Decode(&a)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func GetAppealByID(id primitive.ObjectID) (*models.Appeal, error) {
	var a models.Appeal
	err := database.Col("appeals").FindOne(
		context.Background(),
		bson.M{"_id": id},
	).Decode(&a)
	if err != nil {
		return nil, err
	}
	return &a, nil
}
