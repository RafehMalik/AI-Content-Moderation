package server

import (
	"github.com/gin-gonic/gin"
	"github.com/rafehmalik/ai-content-moderation/internal/config"
	"github.com/rafehmalik/ai-content-moderation/internal/handlers"
	middleware "github.com/rafehmalik/ai-content-moderation/internal/middlewares"
	"log"
	"os"
)

func New(cfg *config.Config) *gin.Engine {
	r := gin.Default()

	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Authorization,Content-Type")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	r.Static("/uploads", "./uploads")

	// Ensure uploads directory exists so file saves don't fail
	if err := os.MkdirAll("uploads", 0755); err != nil {
		log.Printf("warning: could not create uploads directory: %v", err)
	}

	// Public
	r.POST("/api/register", handlers.Register)
	r.POST("/api/login", handlers.Login)

	// User routes
	user := r.Group("/api").Use(middleware.AuthRequired(cfg.JWTSECRET))
	{
		user.POST("/submit", handlers.SubmitImages)
		user.GET("/submissions", handlers.GetMySubmissions)
		user.GET("/submissions/:id", handlers.GetSubmission)
		user.POST("/appeals", handlers.CreateAppeal)
		user.GET("/appeals/my", handlers.GetMyAppeals)
	}

	// Admin routes
	admin := r.Group("/api/admin").Use(
		middleware.AuthRequired(cfg.JWTSECRET),
		middleware.AdminOnly,
	)
	{
		admin.GET("/appeals", handlers.GetAllAppeals)
		admin.PATCH("/appeals/:id", handlers.ReviewAppeal)
		admin.GET("/policies", handlers.GetPolicies)
		admin.PUT("/policies/:id", handlers.UpdatePolicy)
		admin.PATCH("/verdicts/:id", handlers.OverrideVerdict)
		admin.GET("/analytics", handlers.GetAnalytics)
		admin.GET("/users", handlers.GetAllUsers)
		admin.GET("/submissions", handlers.GetAllSubmissionsAdmin)
	}

	return r
}
