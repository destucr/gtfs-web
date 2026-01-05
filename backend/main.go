package main

import (
	"gtfs-cms/database"
	"gtfs-cms/handlers"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	database.Connect()

	r := gin.Default()

	// CORS Setup
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "http://localhost:3000"}, // Vite default port
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	api := r.Group("/api")
	{
		api.GET("/agencies", handlers.GetAgencies)
		api.POST("/agencies", handlers.CreateAgency)
		api.PUT("/agencies/:id", handlers.UpdateAgency)
		api.DELETE("/agencies/:id", handlers.DeleteAgency)

		api.GET("/stops", handlers.GetStops)
		api.POST("/stops", handlers.CreateStop)
		             api.PUT("/stops/:id", handlers.UpdateStop)
		             api.DELETE("/stops/:id", handlers.DeleteStop)
		             api.GET("/stops/:id/routes", handlers.GetStopRoutes)
		             api.GET("/stops/:id/times", handlers.GetStopTimes)
		             api.GET("/stop-routes", handlers.GetAllStopRoutes)
		
		api.PUT("/stops/:id/routes", handlers.UpdateStopRoutes)

		api.GET("/routes", handlers.GetRoutes)
		api.POST("/routes", handlers.CreateRoute)
		api.PUT("/routes/:id", handlers.UpdateRoute)
		api.DELETE("/routes/:id", handlers.DeleteRoute)

		api.GET("/trips/:id/stops", handlers.GetTripStops)
		api.POST("/trips/:id/stops", handlers.AddStopToTrip)
		api.PUT("/trips/:id/stops", handlers.UpdateTripStops)

		api.GET("/trips", handlers.GetTrips)
		api.POST("/trips", handlers.CreateTrip)
		api.PUT("/trips/:id", handlers.UpdateTrip)
		api.DELETE("/trips/:id", handlers.DeleteTrip)

		             api.GET("/shapes/:shape_id", handlers.GetShape)

		             api.GET("/shapes", handlers.GetUniqueShapes)

		             api.POST("/shapes/bulk", handlers.GetBulkShapes)

		
		api.POST("/shapes", handlers.CreateShape)
		api.PUT("/shapes/:shape_id", handlers.UpdateShape)
		api.DELETE("/shapes/:shape_id", handlers.DeleteShape)

		api.GET("/export/gtfs", handlers.ExportGTFS)
		api.GET("/activity-logs", handlers.GetActivityLogs)

		api.GET("/settings", handlers.GetSettings)
		api.PUT("/settings", handlers.UpdateSetting)
	}

	r.Run(":8080")
}
