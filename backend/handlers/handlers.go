package handlers

import (
	"fmt"
	"gtfs-cms/database"
	"gtfs-cms/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

// --- Agency ---

func GetAgencies(c *gin.Context) {
	var agencies []models.Agency
	database.DB.Find(&agencies)
	c.JSON(http.StatusOK, agencies)
}

func CreateAgency(c *gin.Context) {
	var agency models.Agency
	if err := c.ShouldBindJSON(&agency); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	database.DB.Create(&agency)
	c.JSON(http.StatusOK, agency)
}

func UpdateAgency(c *gin.Context) {
	id := c.Param("id")
	var agency models.Agency
	if err := database.DB.First(&agency, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Agency not found"})
		return
	}
	if err := c.ShouldBindJSON(&agency); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	database.DB.Save(&agency)
	c.JSON(http.StatusOK, agency)
}

func DeleteAgency(c *gin.Context) {
	id := c.Param("id")
	database.DB.Delete(&models.Agency{}, id)
	c.JSON(http.StatusOK, gin.H{"message": "Agency deleted"})
}

// --- Stop ---

func GetStops(c *gin.Context) {
	var stops []models.Stop
	database.DB.Find(&stops)
	c.JSON(http.StatusOK, stops)
}

func CreateStop(c *gin.Context) {
	var stop models.Stop
	if err := c.ShouldBindJSON(&stop); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	database.DB.Create(&stop)
	c.JSON(http.StatusOK, stop)
}

func UpdateStop(c *gin.Context) {
	id := c.Param("id")
	var stop models.Stop
	if err := database.DB.First(&stop, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Stop not found"})
		return
	}
	if err := c.ShouldBindJSON(&stop); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	database.DB.Save(&stop)
	c.JSON(http.StatusOK, stop)
}

func DeleteStop(c *gin.Context) {
	id := c.Param("id")
	database.DB.Delete(&models.Stop{}, id)
	c.JSON(http.StatusOK, gin.H{"message": "Stop deleted"})
}

// --- Route ---

func GetRoutes(c *gin.Context) {
	var routes []models.Route
	database.DB.Find(&routes)
	c.JSON(http.StatusOK, routes)
}

func CreateRoute(c *gin.Context) {
	var route models.Route
	if err := c.ShouldBindJSON(&route); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	database.DB.Create(&route)
	c.JSON(http.StatusOK, route)
}

func UpdateRoute(c *gin.Context) {
	id := c.Param("id")
	var route models.Route
	if err := database.DB.First(&route, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Route not found"})
		return
	}
	if err := c.ShouldBindJSON(&route); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	database.DB.Save(&route)
	c.JSON(http.StatusOK, route)
}

func DeleteRoute(c *gin.Context) {
	id := c.Param("id")
	database.DB.Delete(&models.Route{}, id)
	c.JSON(http.StatusOK, gin.H{"message": "Route deleted"})
}

// --- Trip ---

func GetTrips(c *gin.Context) {
	var trips []models.Trip
	database.DB.Preload("Route").Find(&trips)
	c.JSON(http.StatusOK, trips)
}

func CreateTrip(c *gin.Context) {
	var trip models.Trip
	if err := c.ShouldBindJSON(&trip); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	database.DB.Create(&trip)
	c.JSON(http.StatusOK, trip)
}

func UpdateTrip(c *gin.Context) {
	id := c.Param("id")
	var trip models.Trip
	if err := database.DB.First(&trip, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Trip not found"})
		return
	}
	if err := c.ShouldBindJSON(&trip); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	database.DB.Save(&trip)
	c.JSON(http.StatusOK, trip)
}

func DeleteTrip(c *gin.Context) {
	id := c.Param("id")
	database.DB.Delete(&models.Trip{}, id)
	c.JSON(http.StatusOK, gin.H{"message": "Trip deleted"})
}

// --- StopRoutes ---

func GetStopRoutes(c *gin.Context) {
	stopID := c.Param("id")
	var routeStops []models.RouteStop
	database.DB.Preload("Stop").Where("stop_id = ?", stopID).Find(&routeStops)
	
	var routeIDs []uint
	for _, rs := range routeStops {
		routeIDs = append(routeIDs, rs.RouteID)
	}
	
	var routes []models.Route
	if len(routeIDs) > 0 {
		database.DB.Where("id IN ?", routeIDs).Find(&routes)
	}
	c.JSON(http.StatusOK, routes)
}

func GetAllStopRoutes(c *gin.Context) {
	var routeStops []models.RouteStop
	// Preload Route to get names/colors directly if possible, 
	// but models.RouteStop only has Stop relation. 
	// Let's just get the raw associations.
	database.DB.Find(&routeStops)
	c.JSON(http.StatusOK, routeStops)
}

func UpdateStopRoutes(c *gin.Context) {
	stopID := castToUint(c.Param("id"))
	var selectedRouteIDs []uint
	if err := c.ShouldBindJSON(&selectedRouteIDs); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx := database.DB.Begin()
	// 1. Remove existing route assignments for this stop
	tx.Where("stop_id = ?", stopID).Delete(&models.RouteStop{})
	
	// 2. Add new assignments
	for _, rid := range selectedRouteIDs {
		tx.Create(&models.RouteStop{
			RouteID:  rid,
			StopID:   stopID,
			Sequence: 1, // Default sequence, usually managed in Route Studio
		})
	}
	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Stop route assignments updated"})
}

// --- RouteStops ---

func GetRouteStops(c *gin.Context) {
	routeID := c.Param("id")
	var routeStops []models.RouteStop
	database.DB.Preload("Stop").Where("route_id = ?", routeID).Order("sequence asc").Find(&routeStops)
	c.JSON(http.StatusOK, routeStops)
}

func AddStopToRoute(c *gin.Context) {
	var rs models.RouteStop
	if err := c.ShouldBindJSON(&rs); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	database.DB.Create(&rs)
	c.JSON(http.StatusOK, rs)
}

func UpdateRouteStops(c *gin.Context) {
	routeID := c.Param("id")
	var routeStops []models.RouteStop
	if err := c.ShouldBindJSON(&routeStops); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx := database.DB.Begin()
	tx.Where("route_id = ?", routeID).Delete(&models.RouteStop{})
	for _, rs := range routeStops {
		rs.RouteID = uint(castToUint(routeID)) // Helper would be needed or just simple cast
		tx.Create(&rs)
	}
	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Route stops updated"})
}

func castToUint(s string) uint {
	var i uint
	fmt.Sscanf(s, "%d", &i)
	return i
}

// --- Shape ---

// GetShape returns points for a specific shape_id
func GetShape(c *gin.Context) {
	shapeID := c.Param("shape_id")
	var points []models.ShapePoint
	database.DB.Where("shape_id = ?", shapeID).Order("sequence asc").Find(&points)
	c.JSON(http.StatusOK, points)
}

// CreateShape receives an array of points and saves them
func CreateShape(c *gin.Context) {
	var points []models.ShapePoint
	if err := c.ShouldBindJSON(&points); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if len(points) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No points provided"})
		return
	}
	
	// Transaction to ensure atomicity
	tx := database.DB.Begin()
	for _, p := range points {
		if err := tx.Create(&p).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}
	tx.Commit()

	c.JSON(http.StatusOK, gin.H{"message": "Shape created", "count": len(points), "shape_id": points[0].ShapeID})
}

// UpdateShape replaces all points for a given shape_id
func UpdateShape(c *gin.Context) {
	shapeID := c.Param("shape_id")
	var points []models.ShapePoint
	if err := c.ShouldBindJSON(&points); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx := database.DB.Begin()

	// 1. Delete existing points
	if err := tx.Where("shape_id = ?", shapeID).Delete(&models.ShapePoint{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete old points"})
		return
	}

	// 2. Insert new points
	for _, p := range points {
		// Ensure the ID in the body matches the URL (or overwrite it)
		p.ShapeID = shapeID 
		if err := tx.Create(&p).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to insert new points"})
			return
		}
	}

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Shape updated", "shape_id": shapeID})
}

// GetBulkShapes returns points for multiple shape_ids
func GetBulkShapes(c *gin.Context) {
	var shapeIDs []string
	if err := c.ShouldBindJSON(&shapeIDs); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid shape ID payload: " + err.Error()})
		return
	}

	if len(shapeIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Empty shape ID array provided."})
		return
	}

	if len(shapeIDs) > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Bulk request exceeds limit of 100 IDs."})
		return
	}

	var points []models.ShapePoint
	if err := database.DB.Where("shape_id IN ?", shapeIDs).Order("sequence asc").Find(&points).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database retrieval failure: " + err.Error()})
		return
	}
	
	// Group points by shape_id
	result := make(map[string][]models.ShapePoint)
	for _, p := range points {
		result[p.ShapeID] = append(result[p.ShapeID], p)
	}
	c.JSON(http.StatusOK, result)
}

// DeleteShape removes all points for a specific shape_id
func DeleteShape(c *gin.Context) {
	shapeID := c.Param("shape_id")
	if err := database.DB.Where("shape_id = ?", shapeID).Delete(&models.ShapePoint{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Shape deleted"})
}
