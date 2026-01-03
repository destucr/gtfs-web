# GTFS Transit Management Platform

A professional, full-stack transit management ecosystem designed for designing, managing, and visualizing General Transit Feed Specification (GTFS) data. The platform features an immersive, GIS-desktop-inspired CMS and a modern public-facing live map.

## 🚀 Key Features

### 🛠 GTFS Studio (CMS)
*   **Immersive GIS Workspace**: Full-screen interactive map interface with collapsible sidebars.
*   **Unified Route Studio**: Manage metadata, geographic paths, and stop sequences in one place.
*   **Smart Routing (OSRM)**: Drop anchor points and "Snap to Roads" to automatically generate precise geometries following the actual road network.
*   **Multi-Step Undo**: Robust history tracking for all geographic edits.
*   **Smart Stops Inventory**: Click-to-add stops with automatic reverse geocoding (Auto-Naming) and draggable coordinate adjustment.
*   **Cross-Route Assignments**: Easily manage stops shared by multiple service lines (transit hubs).

### 🌐 Public Web Viewer
*   **Immersive Map**: Fullscreen map with glassmorphism HUD.
*   **Real-time Sync**: Automatically polls CMS changes every 5 seconds—updates appear live without refreshing.
*   **Route Discovery**: Intelligent search and highlighting; selecting a line emphasizes its path while fading others.
*   **System Toggles**: Support for high-contrast Light and Dark modes.

## 📸 Screenshots

### Dashboard Overview
![Dashboard](./assets/screenshots/dashboard.jpg)

### Stops & Route Assignments
![Stops Inventory](./assets/screenshots/stop-and-routes.jpg)

### Transit Operator Network
![Agencies](./assets/screenshots/agencies.jpg)

### Route Studio - Geographic Path Construction
![Route Studio Path](./assets/screenshots/route-studio-path.jpg)

### Route Studio - Metadata Configuration
![Route Studio Info](./assets/screenshots/route-studio-info.jpg)

### Trip Data Mapping
![Trip Mapping](./assets/screenshots/trip-mapping.jpg)

### Spatial Micro-Interactions (Hover Discovery & Pulsing Feedback)
![Micro Interactions](./assets/screenshots/micro-interactions.jpg)

## 🏗 Architecture & Tech Stack

### Backend
- **Language**: Go (Golang 1.24)
- **Framework**: Gin Gonic
- **Database**: PostgreSQL (PostGIS ready)
- **ORM**: GORM
- **Infrastructure**: Dockerized environment

### Frontends
- **CMS**: React + Tailwind CSS + Lucide Icons (HIG-inspired design system)
- **Web Viewer**: React (v18) + Mantine UI v7 + Leaflet (Immersive Map experience)

## 🛠 Setup & Installation

### 1. Backend & Database
Ensure you have Docker and Docker Compose installed.
```bash
cp .env.example .env
# Edit .env with your credentials
docker compose up -d --build
```

### 2. Seed Example Data (Optional)
To quickly try out the platform with a pre-populated transit network:
```bash
npm run seed
```
*Note: Ensure the database is running via Docker before seeding.*

### 3. CMS Frontend
```bash
cd frontend/cms
npm install
npm run dev
```
Open: `http://localhost:5173`

### 3. Public Web Viewer
```bash
cd frontend/web
npm install
npm run dev
```
Open: `http://localhost:3000`

## 📝 Technical Documentation
For detailed implementation notes, database schema migrations, and UI design principles, see [TECHNICAL_IMPLEMENTATION.md](./TECHNICAL_IMPLEMENTATION.md).
