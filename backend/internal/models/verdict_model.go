package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Outcome values: "Approved" | "Flagged" | "Blocked"
type CategoryResult struct {
	Category   string  `bson:"category"   json:"category"`
	Detected   bool    `bson:"detected"   json:"detected"`
	Confidence float64 `bson:"confidence" json:"confidence"`
	Reason     string  `bson:"reason"     json:"reason"`
}

type Verdict struct {
	ID              primitive.ObjectID `bson:"_id,omitempty"    json:"id"`
	SubmissionID    primitive.ObjectID `bson:"submissionId"     json:"submissionId"`
	ImageURL        string             `bson:"imageUrl"         json:"imageUrl"`
	Outcome         string             `bson:"outcome"          json:"outcome"`
	PolicyVersion   string             `bson:"policyVersion"    json:"policyVersion"`
	CategoryResults []CategoryResult   `bson:"categoryResults"  json:"categoryResults"`
	CreatedAt       time.Time          `bson:"createdAt"        json:"createdAt"`
	OverriddenBy    string             `bson:"overriddenBy,omitempty" json:"overriddenBy,omitempty"`
}
