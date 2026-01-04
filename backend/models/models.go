package models

import "time"

type Agency struct {
	ID       uint   `gorm:"primaryKey" json:"id"`
	Name     string `json:"name"`
	Url      string `json:"url"`
	Timezone string `json:"timezone"`
}

type Stop struct {
	ID       uint    `gorm:"primaryKey" json:"id"`
	Name     string  `json:"name"`
	Lat      float64 `json:"lat"`
	Lon      float64 `json:"lon"`
	RouteIDs []uint  `gorm:"-" json:"route_ids"` // Hydrated field
}

type Route struct {
	ID        uint    `gorm:"primaryKey" json:"id"`
	ShortName string  `json:"short_name"`
	LongName  string  `json:"long_name"`
	Color     string  `json:"color"`
	TextColor *string `json:"text_color,omitempty"`
	RouteType *int    `json:"route_type,omitempty"`
	RouteDesc *string `json:"route_desc,omitempty"`
	RouteUrl  *string `json:"route_url,omitempty"`
	AgencyID  uint    `json:"agency_id"`
}

type Trip struct {
	ID          uint   `gorm:"primaryKey" json:"id"`
	RouteID     uint   `json:"route_id"`
	Route       Route  `gorm:"foreignKey:RouteID" json:"route,omitempty"`
	ServiceID   string `json:"service_id"`
	DirectionID *int   `json:"direction_id,omitempty"`
	Headsign    string `json:"headsign"`
	ShapeID     string `json:"shape_id"` // Grouping ID for shapes
}

// TripStop represents a stop assigned to a specific trip in a specific order
type TripStop struct {
	ID            uint   `gorm:"primaryKey" json:"id"`
	TripID        uint   `gorm:"index" json:"trip_id"`
	Trip          Trip   `gorm:"foreignKey:TripID" json:"trip,omitempty"`
	StopID        uint   `gorm:"index" json:"stop_id"`
	Stop          Stop   `gorm:"foreignKey:StopID" json:"stop,omitempty"`
	Sequence      int    `json:"sequence"`
	ArrivalTime   string `json:"arrival_time"`
	DepartureTime string `json:"departure_time"`
}

// ShapePoint represents a single point in a polyline
type ShapePoint struct {
	ID       uint    `gorm:"primaryKey" json:"id"`
	ShapeID  string  `gorm:"index" json:"shape_id"` // The ID shared by points in the same shape
	Lat      float64 `json:"lat"`
	Lon      float64 `json:"lon"`
	Sequence int     `json:"sequence"`
}

type ActivityLog struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Timestamp time.Time `json:"timestamp"`
	Action    string    `json:"action"`
	Details   string    `json:"details"`
}
