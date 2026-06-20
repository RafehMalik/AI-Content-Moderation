package repository

import (
	"context"

	"github.com/rafehmalik/ai-content-moderation/internal/database"
	"github.com/rafehmalik/ai-content-moderation/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func CreateUser(u *models.User) error {
	u.ID = primitive.NewObjectID()
	_, err := database.Col("users").InsertOne(context.Background(), u)
	return err
}

func FindUserByEmail(email string) (*models.User, error) {
	var u models.User
	err := database.Col("users").FindOne(context.Background(), bson.M{"email": email}).Decode(&u)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func FindUserByID(id primitive.ObjectID) (*models.User, error) {
	var u models.User
	err := database.Col("users").FindOne(context.Background(), bson.M{"_id": id}).Decode(&u)
	return &u, err
}
