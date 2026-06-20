package handlers

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	database "github.com/rafehmalik/ai-content-moderation/internal/database"
	"go.mongodb.org/mongo-driver/bson"
)

func GetAllUsers(c *gin.Context) {
	ctx := context.Background()

	cur, err := database.Col("users").Find(ctx, bson.M{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not fetch users"})
		return
	}

	var users []bson.M
	cur.All(ctx, &users)

	// Strip password field before returning
	for _, u := range users {
		delete(u, "password")
	}

	c.JSON(http.StatusOK, gin.H{"users": users})
}
