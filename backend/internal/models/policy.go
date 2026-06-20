package models

import "go.mongodb.org/mongo-driver/bson/primitive"

// Action: "AutoBlock" | "FlagReview"
// Category names match the 6 moderation categories exactly
type Policy struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Category  string             `bson:"category"      json:"category"`
	Enabled   bool               `bson:"enabled"       json:"enabled"`
	Threshold float64            `bson:"threshold"     json:"threshold"` // 0–100
	Action    string             `bson:"action"        json:"action"`
	Version   string             `bson:"version"       json:"version"` // e.g. "v3"
}
