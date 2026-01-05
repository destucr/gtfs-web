package database

import (
	"fmt"
	"gtfs-cms/models"
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Connect() {
	host := os.Getenv("DB_HOST")
	if host == "" {
		host = "localhost"
	}
	user := os.Getenv("DB_USER")
	if user == "" {
		user = "user"
	}
	password := os.Getenv("DB_PASSWORD")
	if password == "" {
		password = "password"
	}
	dbname := os.Getenv("DB_NAME")
	if dbname == "" {
		dbname = "gtfs_db"
	}
	port := os.Getenv("DB_PORT")
	if port == "" {
		port = "5432"
	}

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Shanghai", host, user, password, dbname, port)

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database!", err)
	}

	// Safe Migration: route_stops -> trip_stops
	if DB.Migrator().HasTable("route_stops") && !DB.Migrator().HasTable("trip_stops") {
		log.Println("Migration: Old table 'route_stops' found. Migrating data to 'trip_stops'...")

		// 1. Create new table
		if err := DB.AutoMigrate(&models.TripStop{}); err != nil {
			log.Fatalf("Migration failed: Could not create trip_stops: %v", err)
		}

		// 2. Define temporary struct for old table
		type RouteStop struct {
			RouteID       uint
			StopID        uint
			Sequence      int
			ArrivalTime   string
			DepartureTime string
		}

		// 3. Read old data
		var oldStops []RouteStop
		if err := DB.Table("route_stops").Find(&oldStops).Error; err != nil {
			log.Fatalf("Migration failed: Could not read route_stops: %v", err)
		}

		// 4. Transform and Insert
		var trips []models.Trip
		if err := DB.Find(&trips).Error; err != nil {
			log.Fatalf("Migration failed: Could not read trips: %v", err)
		}

		if len(trips) == 0 {
			log.Println("Migration Warning: No trips found. Skipping TripStops creation to preserve RouteStop data.")
			// Skip migration, do not drop route_stops
			return
		}

		tx := DB.Begin()
		var count int64 = 0

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

		for _, rs := range oldStops {
			// Find all trips for this route
			for _, t := range trips {
				if t.RouteID == rs.RouteID {
					arr, dep := calculateTime(rs.Sequence)

					// Use existing if valid, else calculate
					finalArr := rs.ArrivalTime
					if finalArr == "" {
						finalArr = arr
					}
					finalDep := rs.DepartureTime
					if finalDep == "" {
						finalDep = dep
					}

					newStop := models.TripStop{
						TripID:        t.ID,
						StopID:        rs.StopID,
						Sequence:      rs.Sequence,
						ArrivalTime:   finalArr,
						DepartureTime: finalDep,
					}

					if err := tx.Create(&newStop).Error; err != nil {
						tx.Rollback()
						log.Fatalf("Migration failed: Could not create TripStop: %v", err)
					}
					count++
				}
			}
		}
		if err := tx.Commit().Error; err != nil {
			log.Fatalf("Migration failed: Could not commit transaction: %v", err)
		}

		// 5. Verify & Cleanup
		if count > 0 {
			log.Printf("Migration: Success! Created %d trip_stops entries. Dropping old table...", count)
			if err := DB.Migrator().DropTable("route_stops"); err != nil {
				log.Printf("Warning: Could not drop old table route_stops: %v", err)
			} else {
				log.Println("Migration: Dropped old table route_stops.")
			}
		} else {
			log.Println("Migration: Warning - TripStop table is empty after migration logic (maybe source was empty). Retaining old table for safety.")
		}

	} else if DB.Migrator().HasTable("route_stops") {
		// trip_stops already exists, so route_stops is just stale
		log.Println("Migration: Cleanup - Drop stale route_stops table.")
		DB.Migrator().DropTable("route_stops")
	}

	err = DB.AutoMigrate(&models.Agency{}, &models.Stop{}, &models.Route{}, &models.Trip{}, &models.ShapePoint{}, &models.TripStop{}, &models.ActivityLog{}, &models.Setting{})
	if err != nil {
		log.Fatal("Failed to migrate database!", err)
	}

	// Seed default settings if empty
	var count int64
	DB.Model(&models.Setting{}).Count(&count)
	if count == 0 {
		defaultSettings := []models.Setting{
			{Key: "global_sign_style", Value: "standard"},
			{Key: "dark_mode", Value: "false"},
			{Key: "map_provider", Value: "carto"},
			{Key: "autosave_delay", Value: "2000"},
		}
		DB.Create(&defaultSettings)
		log.Println("Default settings seeded.")
	}

	log.Println("Database connected and migrated.")
}
