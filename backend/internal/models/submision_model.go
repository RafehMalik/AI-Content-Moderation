package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Submission struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    primitive.ObjectID `bson:"userId"        json:"userId"`
	Images    []string           `bson:"images"        json:"images"` // file paths or URLs
	CreatedAt time.Time          `bson:"createdAt"     json:"createdAt"`
}
