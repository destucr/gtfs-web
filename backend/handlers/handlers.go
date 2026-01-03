package handlers

import (
	"archive/zip"
	"bytes"
	"encoding/csv"
	"fmt"
	"gtfs-cms/database"
	"gtfs-cms/models"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// ExportGTFS generates a ZIP file with standard GTFS text files
func ExportGTFS(c *gin.Context) {
	buf := new(bytes.Buffer)
	zw := zip.NewWriter(buf)

	// Helper to create CSV files in ZIP
	createCSV := func(name string, headers []string, data [][]string) error {
		f, err := zw.Create(name)
		if err != nil {
			return err
		}
		w := csv.NewWriter(f)
		if err := w.Write(headers); err != nil {
			return err
		}
		return w.WriteAll(data)
	}

	// 1. agency.txt
	var agencies []models.Agency
	if result := database.DB.Find(&agencies); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query agencies: " + result.Error.Error()})
		return
	}
	if len(agencies) == 0 {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "No agencies found. At least one agency is required for GTFS export."})
		return
	}
	agencyData := [][]string{}
	for _, a := range agencies {
		agencyData = append(agencyData, []string{
			strconv.Itoa(int(a.ID)), a.Name, a.Url, a.Timezone, "en",
		})
	}
	if err := createCSV("agency.txt", []string{"agency_id", "agency_name", "agency_url", "agency_timezone", "agency_lang"}, agencyData); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create agency.txt: " + err.Error()})
		return
	}

	// 2. stops.txt
	var stops []models.Stop
	if result := database.DB.Find(&stops); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query stops: " + result.Error.Error()})
		return
	}
	stopData := [][]string{}
	for _, s := range stops {
		stopData = append(stopData, []string{
			strconv.Itoa(int(s.ID)), s.Name, fmt.Sprintf("%f", s.Lat), fmt.Sprintf("%f", s.Lon), "0",
		})
	}
	if err := createCSV("stops.txt", []string{"stop_id", "stop_name", "stop_lat", "stop_lon", "location_type"}, stopData); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create stops.txt: " + err.Error()})
		return
	}

	// 3. routes.txt
	var routes []models.Route
	if result := database.DB.Find(&routes); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query routes: " + result.Error.Error()})
		return
	}
	routeData := [][]string{}
	for _, r := range routes {
		rType := "3" // Bus default
		if r.RouteType != nil {
			rType = strconv.Itoa(*r.RouteType)
		}
		routeData = append(routeData, []string{
			strconv.Itoa(int(r.ID)), strconv.Itoa(int(r.AgencyID)), r.ShortName, r.LongName, rType, r.Color,
		})
	}
	if err := createCSV("routes.txt", []string{"route_id", "agency_id", "route_short_name", "route_long_name", "route_type", "route_color"}, routeData); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create routes.txt: " + err.Error()})
		return
	}

	// 4. trips.txt
	var trips []models.Trip
	if result := database.DB.Find(&trips); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query trips: " + result.Error.Error()})
		return
	}
	tripData := [][]string{}
	for _, t := range trips {
		sID := t.ServiceID
		if sID == "" {
			sID = "DAILY"
		}
		tripData = append(tripData, []string{
			strconv.Itoa(int(t.RouteID)), sID, strconv.Itoa(int(t.ID)), t.Headsign, t.ShapeID,
		})
	}
	if err := createCSV("trips.txt", []string{"route_id", "service_id", "trip_id", "trip_headsign", "shape_id"}, tripData); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create trips.txt: " + err.Error()})
		return
	}

	// 5. stop_times.txt
	var tripStops []models.TripStop
	if result := database.DB.Find(&tripStops); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query trip stops: " + result.Error.Error()})
		return
	}
	stopTimeData := [][]string{}
	for _, ts := range tripStops {
		arr := ts.ArrivalTime
		if arr == "" {
			arr = "08:00:00"
		}
		dep := ts.DepartureTime
		if dep == "" {
			dep = "08:00:00"
		}
		stopTimeData = append(stopTimeData, []string{
			strconv.Itoa(int(ts.TripID)), arr, dep, strconv.Itoa(int(ts.StopID)), strconv.Itoa(ts.Sequence),
		})
	}
	if err := createCSV("stop_times.txt", []string{"trip_id", "arrival_time", "departure_time", "stop_id", "stop_sequence"}, stopTimeData); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create stop_times.txt: " + err.Error()})
		return
	}

	// 6. shapes.txt
	var shapePoints []models.ShapePoint
	if result := database.DB.Order("shape_id, sequence asc").Find(&shapePoints); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query shape points: " + result.Error.Error()})
		return
	}
	shapeData := [][]string{}
	for _, p := range shapePoints {
		shapeData = append(shapeData, []string{
			p.ShapeID, fmt.Sprintf("%f", p.Lat), fmt.Sprintf("%f", p.Lon), strconv.Itoa(p.Sequence),
		})
	}
	if err := createCSV("shapes.txt", []string{"shape_id", "shape_pt_lat", "shape_pt_lon", "shape_pt_sequence"}, shapeData); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create shapes.txt: " + err.Error()})
		return
	}

	// 7. calendar.txt (Minimal default)
	calendarData := [][]string{
		{"DAILY", "1", "1", "1", "1", "1", "1", "1", "20250101", "20261231"},
	}
	if err := createCSV("calendar.txt", []string{"service_id", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "start_date", "end_date"}, calendarData); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create calendar.txt: " + err.Error()})
		return
	}

	if err := zw.Close(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to finalize ZIP archive: " + err.Error()})
		return
	}

	c.Header("Content-Disposition", "attachment; filename=gtfs_export.zip")
	c.Header("Content-Type", "application/zip")
	c.Data(http.StatusOK, "application/zip", buf.Bytes())
}

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
	// Find all trips passing through this stop
	var tripStops []models.TripStop
	if err := database.DB.Where("stop_id = ?", stopID).Find(&tripStops).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch trip stops: " + err.Error()})
		return
	}

	// Get unique trips
	tripMap := make(map[uint]bool)
	var routeIDs []uint

	for _, ts := range tripStops {
		if !tripMap[ts.TripID] {
			tripMap[ts.TripID] = true
			var trip models.Trip
			if err := database.DB.First(&trip, ts.TripID).Error; err != nil {
				// If a trip associated with a tripStop is not found, skip it.
				// This might indicate data inconsistency, but we proceed with valid data.
				continue
			}
			routeIDs = append(routeIDs, trip.RouteID)
		}
	}

	// Get unique route IDs
	uniqueRouteIDs := make(map[uint]bool)
	for _, rID := range routeIDs {
		uniqueRouteIDs[rID] = true
	}

	var routes []models.Route
	for rID := range uniqueRouteIDs {
		var route models.Route
		if err := database.DB.First(&route, rID).Error; err == nil {
			routes = append(routes, route)
		}
	}
	c.JSON(http.StatusOK, routes)
}

func GetAllStopRoutes(c *gin.Context) {
	var tripStops []models.TripStop
	database.DB.Preload("Trip").Find(&tripStops)
	c.JSON(http.StatusOK, tripStops)
}

func UpdateStopRoutes(c *gin.Context) {
	stopID := castToUint(c.Param("id"))
	var selectedRouteIDs []uint
	if err := c.ShouldBindJSON(&selectedRouteIDs); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx := database.DB.Begin()
	// 1. Find all trips for the stop to remove them
	var existingTripStops []models.TripStop
	tx.Where("stop_id = ?", stopID).Find(&existingTripStops)
	tx.Where("stop_id = ?", stopID).Delete(&models.TripStop{})

	// 2. Add new assignments to all trips of selected routes
	for _, rid := range selectedRouteIDs {
		var trips []models.Trip
		tx.Where("route_id = ?", rid).Find(&trips)
		for _, t := range trips {
			tx.Create(&models.TripStop{
				TripID:   t.ID,
				StopID:   stopID,
				Sequence: 1, // Default sequence, usually managed in Route Studio
			})
		}
	}
	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Stop route assignments updated"})
}

// --- RouteStops ---

func GetTripStops(c *gin.Context) {
	tripID := c.Param("id")
	var tripStops []models.TripStop
	if err := database.DB.Preload("Stop").Where("trip_id = ?", tripID).Order("sequence asc").Find(&tripStops).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch trip stops: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, tripStops)
}

func AddStopToTrip(c *gin.Context) {
	var ts models.TripStop
	if err := c.ShouldBindJSON(&ts); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := database.DB.Create(&ts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add stop to trip: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, ts)
}

func UpdateTripStops(c *gin.Context) {
	tripID := c.Param("id")
	var tripStops []models.TripStop
	if err := c.ShouldBindJSON(&tripStops); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx := database.DB.Begin()
	if tx.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to begin transaction: " + tx.Error.Error()})
		return
	}

	if err := tx.Where("trip_id = ?", tripID).Delete(&models.TripStop{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete old stops: " + err.Error()})
		return
	}

	// Verify tripID conversion
	tID, err := strconv.ParseUint(tripID, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid trip ID"})
		return
	}

	// Helper for time calculation
	calculateTime := func(seq int) (string, string) {
		baseTime := 8 * 60 // 08:00 in minutes
		arrivalMin := baseTime + (seq * 5)
		departureMin := arrivalMin + 5

		excludeHours := func(m int) string {
			h := (m / 60) % 24
			min := m % 60
			return fmt.Sprintf("%02d:%02d:00", h, min)
		}
		return excludeHours(arrivalMin), excludeHours(departureMin)
	}

	for _, ts := range tripStops {
		ts.TripID = uint(tID)

		// Ensure time is set
		if ts.ArrivalTime == "" || ts.DepartureTime == "" {
			arr, dep := calculateTime(ts.Sequence)
			if ts.ArrivalTime == "" {
				ts.ArrivalTime = arr
			}
			if ts.DepartureTime == "" {
				ts.DepartureTime = dep
			}
		}

		if err := tx.Create(&ts).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create trip stop: " + err.Error()})
			return
		}
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Trip stops updated"})
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
