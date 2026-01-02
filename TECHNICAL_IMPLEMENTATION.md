# Technical Implementation Document

## Architecture Overview

The project is structured into a Backend and two Frontend applications (CMS and Web).

### Directory Structure

```
/
├── backend/            # Golang server (API & Database)
├── frontend/
│   ├── cms/           # React Admin Dashboard (GTFS Management)
│   └── web/           # React Public Web Application (GTFS Viewer)
└── TECHNICAL_IMPLEMENTATION.md
```

## Backend
- **Language**: Go (Golang 1.24+)
- **Database**: PostgreSQL (v15+)
- **Framework**: Gin
- **ORM**: GORM
- **Deployment**: Dockerized (Application + Database)
- **Responsibilities**:
    - Manage GTFS data (Agencies, Routes, Stops, Trips, Shapes).
    - Provide RESTful API for both CMS and Web frontends.
    - Database migrations and connection management.

## Database
- **System**: PostgreSQL
- **Infrastructure**: Managed via Docker Compose for development/testing.
- **Connection**: Configured via DSN (Data Source Name).
- **Schema**: Auto-migrated using GORM based on defined models.

## Frontend: CMS
- **Framework**: React (Vite)
- **Purpose**: Admin interface to manage GTFS data.
- **Features**:
    - CRUD operations for Agencies, Routes, Stops, Trips.
    - Shape management.
    - Authentication (Future).

## Frontend: Web
- **Framework**: React (Vite)
- **Port**: 3000
- **Purpose**: Public-facing application for users to view transit data.
- **Features**:
    - View routes and schedules.
    - Map visualization.

## Future Repository Split
The codebase is organized to support splitting into two repositories in the future:
1. **Core Repo**: `backend` + `frontend/cms` (Management & Data)
2. **Public Repo**: `frontend/web` (Public Interface)

## Change Log

### [Date] - Restructuring
- Renamed `server` to `backend`.
- Created `frontend` directory.
- Moved `client` to `frontend/cms` (Runs on port 5173).
- Initialized `frontend/web` (Runs on port 3000).
- Updated `frontend/web/vite.config.js` to use port 3000.

### [Date] - Database & Infrastructure
- Added `docker-compose.yml` for PostgreSQL.
- Updated `backend/database/db.go` to use PostgreSQL instead of SQLite.
- Updated documentation with database and deployment details.

### [Date] - Dockerization
- Created `backend/Dockerfile` for the Go application.
- Updated `docker-compose.yml` to orchestrate both `backend` and `postgres` services.
- Refactored `backend/database/db.go` to use environment variables (`DB_HOST`, `DB_USER`, etc.) for flexible configuration.

### [Date] - CRUD & Port Configuration
- Implemented full CRUD (Create, Read, Update, Delete) UI in Frontend CMS.
- Added `Update` handlers in Backend (Go) and registered `PUT` routes.
- Resolved PostgreSQL port conflict by mapping Docker port to `5433` on host.
- Fixed CMS routing in `App.jsx` and updated Public Web Viewer placeholder.

### [Date] - Public Web Map & Data Seeding
- Installed `react-leaflet` and `leaflet` in `frontend/web`.
- Created `MapComponent.jsx` to visualize Routes, Shapes (Polylines), and Stops (Markers) on OpenStreetMap.
- Created and executed `backend/seed_purbalingga.sql` to populate the database with a sample route in Purbalingga, Central Java (Terminal - Alun-Alun).

### [Date] - Interactive Map Editor (CMS)
- Installed `react-leaflet` in `frontend/cms`.
- **Shape Editor**: Created `Shapes.jsx` to visually create/edit route paths (Polyline) by clicking on the map.
- **Stop Picker**: Updated `Stops.jsx` to allow picking stop locations directly from an interactive map.
- **Backend**: Updated `handlers.go` to support `PUT /api/shapes/:id` (Replace All) and `DELETE` for shapes.

### [Date] - UX Improvements
- **CMS Stops**: Added "Visualize Route Line" dropdown to `Stops.jsx`. Users can now overlay a route shape on the map to place stops accurately along the path.
- **Web App**: Added auto-refresh (polling every 5s) to `MapComponent.jsx` to reflect CMS changes in real-time.
- **Map Visuals**: Implemented distinct Bus Stop icons and Polyline rendering in both CMS and Web.

### [Date] - Routing Engine (OSRM)
- Integrated **OSRM (Open Source Routing Machine)** into the CMS Shape Editor.
- Added **"Snap to Roads (Auto-Route)"** feature: Users can drop a few key points, and the system automatically calculates and draws the actual road geometry between them.

### [Date] - Unified Editor & Route Expansion
- **Unified Editor**: Redesigned `Shapes.jsx` as a single dashboard where users select a Route to automatically load its Shape and Stops for simultaneous editing.
- **Stops Preview**: Fixed a bug in `Stops.jsx` where the marker wouldn't update on the map during edit/creation.
- **Data Expansion**: Added **Koridor 2 (Terminal - Bukateja)** to the Purbalingga transit network.
- **Real-time UX**: Enhanced Web App with auto-polling to reflect changes immediately.

### [Date] - Data Standardization & Advanced UX
- **Human-Readable IDs**: Implemented auto-generation of `shape_id` based on Route short names (e.g., `SHP_K1`) for easier database analysis.
- **Route-Stop Relationship**: Added `RouteStop` model and logic to link stops to specific routes in a defined sequence.
- **Reverse Geocoding**: Integrated smart stop creation—clicking the map now automatically suggests stop names using OpenStreetMap data.

### [Date] - UI Migration (Tailwind CSS & HIG)
- **Framework Shift**: Migrated the entire CMS from Bootstrap to **Tailwind CSS**.
- **Design System**: Implemented a professional **HIG (Human Interface Guidelines)** aesthetic using system colors, frosted glass effects, and soft shadows.
- **Unified Workspace**: Consolidated Route metadata, Path (Shape) editing, and Stop Assignments into a high-performance **Route Studio**.
- **Iconography**: Integrated **Lucide React** for consistent, modern visual language.
- **Interactive States**: Added tactile feedback (hover/active/focus) to all components for a native-app feel.

### [Date] - Web UI Overhaul (Mantine UI)
- **Framework Upgrade**: Migrated `frontend/web` from plain React/Bootstrap to **Mantine UI v7**.
- **Bundler Shift**: Replaced experimental `rolldown-vite` with standard **Vite v6** to resolve dependency conflicts and ensure React 18 hook stability (`useId`).
- **UX Redesign**: 
    - Implemented a fullscreen immersive map experience.
    - Added a floating "Route Terminal" glassmorphism sidebar for route discovery and searching.
    - Implemented real-time synchronization between the CMS and the public map via 5s polling.
    - Added interactive route highlighting: selecting a route in the sidebar fades other lines on the map.
- **Visuals**: Switched to **Inter** typography and implemented custom Map icons and popups.

### [Date] - Security & Environment Configuration
- Removed hardcoded sensitive credentials from `docker-compose.yml`.
- Implemented environment variable management via `.env` file.
- Added `.env.example` as a template for local development.
- Created root `.gitignore` to ensure secrets are not committed to the repository.
