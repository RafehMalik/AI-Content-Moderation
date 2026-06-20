package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Status: "Pending" | "Accepted" | "Rejected"
type Appeal struct {
	ID            primitive.ObjectID `bson:"_id,omitempty"  json:"id"`
	SubmissionID  primitive.ObjectID `bson:"submissionId"   json:"submissionId"`
	UserID        primitive.ObjectID `bson:"userId"         json:"userId"`
	Reason        string             `bson:"reason"         json:"reason"`
	Status        string             `bson:"status"         json:"status"`
	AdminResponse string             `bson:"adminResponse,omitempty" json:"adminResponse,omitempty"`
	CreatedAt     time.Time          `bson:"createdAt"      json:"createdAt"`
	UpdatedAt     time.Time          `bson:"updatedAt"      json:"updatedAt"`
}
