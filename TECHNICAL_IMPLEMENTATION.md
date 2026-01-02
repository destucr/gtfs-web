# Technical Implementation Document

## Architecture Overview

The project is structured into a Go-based Backend and two TypeScript-powered Frontend applications (CMS and Web).

### Directory Structure

```
/
├── backend/            # Golang server (API & Database)
├── frontend/
│   ├── cms/           # React + TypeScript Admin Dashboard (GTFS Management)
│   └── web/           # React + TypeScript Public Web Application (GTFS Viewer)
├── assets/            # Static assets and documentation visuals
├── scripts/           # Automation scripts (Screenshots, etc.)
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
- **Connection**: Configured via DSN (Data Source Name) using environment variables.
- **Schema**: Auto-migrated using GORM based on defined models.

## Frontend: CMS (GTFS Studio)
- **Framework**: React + TypeScript (Vite)
- **Styling**: Tailwind CSS (HIG-inspired)
- **Purpose**: Unified GIS workspace to manage transit infrastructure.
- **Key Features**:
    - **Unified Route Studio**: Manage metadata, geographic paths, and stop sequences in one place.
    - **Smart Routing**: OSRM integration for road-following path construction.
    - **Live Persistence**: Auto-save engine for zero-friction data entry.
    - **Persistent Map**: Shared Leaflet instance for zero-flicker navigation.

## Frontend: Web (Public Viewer)
- **Framework**: React + TypeScript (Vite)
- **UI Library**: Mantine UI v7
- **Purpose**: Immersive, public-facing transit map.
- **Features**:
    - Fullscreen interactive map with dark mode support.
    - Real-time data synchronization (5s polling).
    - Intelligent route search and highlighting.

## Change Log

### Jan 2, 2026 - Restructuring
- Renamed `server` to `backend`.
- Created `frontend` directory.
- Moved `client` to `frontend/cms` (Runs on port 5173).
- Initialized `frontend/web` (Runs on port 3000).

### Jan 2, 2026 - Database & Infrastructure
- Added `docker-compose.yml` for PostgreSQL.
- Updated `backend/database/db.go` to use PostgreSQL instead of SQLite.
- Updated documentation with database and deployment details.

### Jan 2, 2026 - Dockerization
- Created `backend/Dockerfile` for the Go application.
- Updated `docker-compose.yml` to orchestrate both `backend` and `postgres` services.
- Refactored `backend/database/db.go` to use environment variables (`DB_HOST`, `DB_USER`, etc.) for flexible configuration.

### Jan 2, 2026 - CRUD & Port Configuration
- Implemented full CRUD (Create, Read, Update, Delete) UI in Frontend CMS.
- Added `Update` handlers in Backend (Go) and registered `PUT` routes.
- Resolved PostgreSQL port conflict by mapping Docker port to `5433` on host.
- Fixed CMS routing in `App.jsx` and updated Public Web Viewer placeholder.

### Jan 2, 2026 - Public Web Map & Data Seeding
- Installed `react-leaflet` and `leaflet` in `frontend/web`.
- Created `MapComponent.jsx` to visualize Routes, Shapes (Polylines), and Stops (Markers) on OpenStreetMap.
- Created and executed `backend/seed_purbalingga.sql` to populate the database with a sample route in Purbalingga, Central Java (Terminal - Alun-Alun).

### Jan 2, 2026 - Interactive Map Editor (CMS)
- Installed `react-leaflet` in `frontend/cms`.
- **Shape Editor**: Created `Shapes.jsx` to visually create/edit route paths (Polyline) by clicking on the map.
- **Stop Picker**: Updated `Stops.jsx` to allow picking stop locations directly from an interactive map.
- **Backend**: Updated `handlers.go` to support `PUT /api/shapes/:id` (Replace All) and `DELETE` for shapes.

### Jan 2, 2026 - UX Improvements
- **CMS Stops**: Added "Visualize Route Line" dropdown to `Stops.jsx`. Users can now overlay a route shape on the map to place stops accurately along the path.
- **Web App**: Added auto-refresh (polling every 5s) to `MapComponent.jsx` to reflect CMS changes in real-time.
- **Map Visuals**: Implemented distinct Bus Stop icons and Polyline rendering in both CMS and Web.

### Jan 2, 2026 - Routing Engine (OSRM)
- Integrated **OSRM (Open Source Routing Machine)** into the CMS Shape Editor.
- Added **"Snap to Roads (Auto-Route)"** feature: Users can drop a few key points, and the system automatically calculates and draws the actual road geometry between them.

### Jan 2, 2026 - Unified Editor & Route Expansion
- **Unified Editor**: Redesigned `Shapes.jsx` as a single dashboard where users select a Route to automatically load its Shape and Stops for simultaneous editing.
- **Stops Preview**: Fixed a bug in `Stops.jsx` where the marker wouldn't update on the map during edit/creation.
- **Data Expansion**: Added **Koridor 2 (Terminal - Bukateja)** to the Purbalingga transit network.
- **Real-time UX**: Enhanced Web App with auto-polling to reflect changes immediately.

### Jan 2, 2026 - Data Standardization & Advanced UX
- **Human-Readable IDs**: Implemented auto-generation of `shape_id` based on Route short names (e.g., `SHP_K1`) for easier database analysis.
- **Route-Stop Relationship**: Added `RouteStop` model and logic to link stops to specific routes in a defined sequence.
- **Reverse Geocoding**: Integrated smart stop creation—clicking the map now automatically suggests stop names using OpenStreetMap data.

### Jan 2, 2026 - Advanced Workspace & Auto-Save
- **GIS Workspace Overhaul**: Standardized all CMS modules to a professional fullscreen layout with collapsible sidebars and floating HUDs.
- **Persistent Map Architecture**: Migrated the `MapContainer` to a shared parent layout (`App.tsx`) using React Context (`WorkspaceContext`). This ensures the map instance never unmounts during navigation, eliminating flickering and providing a seamless "GIS Desktop" feel.
- **Live Persistence**: Implemented an auto-save engine in Route Studio that synchronizes changes (Geometry, Metadata, Sequences) in the background with a debounced 2s delay.
- **Improved Navigation**: Added global keybindings (`Cmd+1-4`) and direct line switching in Route Studio without context loss.
- **Automated Documentation**: Created Playwright-based screenshot utility to programmatically update project visuals.

### Jan 2, 2026 - UI Migration (Tailwind CSS & HIG)
- **Framework Shift**: Migrated the entire CMS from Bootstrap to **Tailwind CSS**.
- **Design System**: Implemented a professional **HIG (Human Interface Guidelines)** aesthetic using system colors, frosted glass effects, and soft shadows.
- **Unified Workspace**: Consolidated Route metadata, Path (Shape) editing, and Stop Assignments into a high-performance **Route Studio**.
- **Iconography**: Integrated **Lucide React** for consistent, modern visual language.
- **Interactive States**: Added tactile feedback (hover/active/focus) to all components for a native-app feel.

### Jan 2, 2026 - Web UI Overhaul (Mantine UI)
- **Framework Upgrade**: Migrated `frontend/web` from plain React/Bootstrap to **Mantine UI v7**.
- **Bundler Shift**: Replaced experimental `rolldown-vite` with standard **Vite v6** to resolve dependency conflicts and ensure React 18 hook stability (`useId`).
- **UX Redesign**: 
    - Implemented a fullscreen immersive map experience.
    - Added a floating "Route Terminal" glassmorphism sidebar for route discovery and searching.
    - Implemented real-time synchronization between the CMS and the public map via 5s polling.
    - Added interactive route highlighting: selecting a route in the sidebar fades other lines on the map.
- **Visuals**: Switched to **Inter** typography and implemented custom Map icons and popups.

### Jan 2, 2026 - Security & Environment Configuration
- Removed hardcoded sensitive credentials from `docker-compose.yml`.
- Implemented environment variable management via `.env` file.
- Added `.env.example` as a template for local development.
- Created root `.gitignore` to ensure secrets are not committed to the repository.

### Jan 2, 2026 - TypeScript Migration
- **Frontend Core**: Refactored both `frontend/cms` and `frontend/web` to 100% TypeScript.
- **Type Safety**: Defined strict interfaces for all GTFS entities (`Agency`, `Stop`, `Route`, `Trip`, `ShapePoint`).
- **Context Optimization**: Refactored the `WorkspaceContext` and `UnifiedMap` logic into typed components, ensuring robust cross-module data synchronization.
- **Verification**: All modules passing strict build and lint checks under TypeScript configuration.