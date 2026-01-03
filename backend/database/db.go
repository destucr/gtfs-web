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

	// Clean up old schema if it exists to ensure consistency
	if DB.Migrator().HasTable("route_stops") {
		log.Println("Old table route_stops found. Dropping to migrate to trip_stops...")
		DB.Migrator().DropTable("route_stops")
	}

	err = DB.AutoMigrate(&models.Agency{}, &models.Stop{}, &models.Route{}, &models.Trip{}, &models.ShapePoint{}, &models.TripStop{})
	if err != nil {
		log.Fatal("Failed to migrate database!", err)
	}

	log.Println("Database connected and migrated.")
}
