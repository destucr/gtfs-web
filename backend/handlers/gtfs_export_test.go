package handlers

import (
	"archive/zip"
	"bytes"
	"encoding/csv"
	"gtfs-cms/database"
	"gtfs-cms/models"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestExportGTFS(t *testing.T) {
	// Setup Mock DB
	db, _ := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	database.DB = db
	db.AutoMigrate(&models.Agency{}, &models.Stop{}, &models.Route{}, &models.Trip{}, &models.TripStop{}, &models.ShapePoint{})

	// Seed minimum data
	agency := models.Agency{Name: "Test Agency", Url: "http://example.com", Timezone: "UTC"}
	db.Create(&agency)

	stop := models.Stop{Name: "Test Stop", Lat: 10.0, Lon: 20.0}
	db.Create(&stop)

	route := models.Route{AgencyID: agency.ID, ShortName: "T1", LongName: "Test Route", RouteType: ptr(3)}
	db.Create(&route)

	trip := models.Trip{RouteID: route.ID, ID: 1, ServiceID: "DAILY"}
	db.Create(&trip)

	db.Create(&models.TripStop{TripID: trip.ID, StopID: stop.ID, Sequence: 1})

	// Setup Gin
	gin.SetMode(gin.TestMode)
	r := gin.Default()
	r.GET("/export", ExportGTFS)

	// Perform Request
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/export", nil)
	r.ServeHTTP(w, req)

	// Assertions
	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	if w.Header().Get("Content-Type") != "application/zip" {
		t.Errorf("Expected content type application/zip, got %s", w.Header().Get("Content-Type"))
	}

	// Read ZIP
	zipReader, err := zip.NewReader(bytes.NewReader(w.Body.Bytes()), int64(w.Body.Len()))
	if err != nil {
		t.Fatal("Failed to read ZIP content")
	}

	expectedFiles := []string{"agency.txt", "stops.txt", "routes.txt", "trips.txt", "stop_times.txt", "calendar.txt"}
	foundFiles := make(map[string]bool)
	for _, file := range zipReader.File {
		foundFiles[file.Name] = true
	}

	for _, expected := range expectedFiles {
		if !foundFiles[expected] {
			t.Errorf("Missing expected file in ZIP: %s", expected)
		}
	}

	// Verify agency.txt content
	f, _ := zipReader.Open("agency.txt")
	defer f.Close()
	reader := csv.NewReader(f)
	records, _ := reader.ReadAll()

	if len(records) < 2 {
		t.Fatal("agency.txt is empty or missing data")
	}

	// Check headers
	headers := records[0]
	if headers[1] != "agency_name" {
		t.Errorf("Expected agency_name header, got %s", headers[1])
	}

	// Check data
	if records[1][1] != "Test Agency" {
		t.Errorf("Expected agency name 'Test Agency', got %s", records[1][1])
	}
}

func ptr(i int) *int {
	return &i
}
