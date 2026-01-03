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
		api.GET("/stop-routes", handlers.GetAllStopRoutes)
		api.PUT("/stops/:id/routes", handlers.UpdateStopRoutes)

		api.GET("/routes", handlers.GetRoutes)
		api.POST("/routes", handlers.CreateRoute)
		api.PUT("/routes/:id", handlers.UpdateRoute)
		api.DELETE("/routes/:id", handlers.DeleteRoute)

		api.GET("/routes/:id/stops", handlers.GetRouteStops)
		api.POST("/routes/:id/stops", handlers.AddStopToRoute)
		api.PUT("/routes/:id/stops", handlers.UpdateRouteStops)

		api.GET("/trips", handlers.GetTrips)
		api.POST("/trips", handlers.CreateTrip)
		api.PUT("/trips/:id", handlers.UpdateTrip)
		api.DELETE("/trips/:id", handlers.DeleteTrip)

		api.GET("/shapes/:shape_id", handlers.GetShape)
		api.POST("/shapes/bulk", handlers.GetBulkShapes)
		api.POST("/shapes", handlers.CreateShape)
		api.PUT("/shapes/:shape_id", handlers.UpdateShape)
		api.DELETE("/shapes/:shape_id", handlers.DeleteShape)

		api.GET("/export/gtfs", handlers.ExportGTFS)
	}

	r.Run(":8080")
}
