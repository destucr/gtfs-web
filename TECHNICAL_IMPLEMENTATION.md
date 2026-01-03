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
- **ORM**: GORM (with Auto-Migrate enabled)
- **GTFS Compliance**: Support for `service_id`, `direction_id`, `arrival_time`, and `departure_time` across models.
- **Export Engine**: Server-side ZIP generation for standard GTFS bundles (`agency`, `stops`, `routes`, `trips`, `stop_times`, `shapes`, `calendar`).

## Frontend: CMS (High-Density GIS IDE)
- **Framework**: React + TypeScript (Vite)
- **Design Pattern**: **High-Density Proximal Hub Architecture**
- **UI Standard**: **X-Style High-Density** (11px base typography, monochromatic zinc palette)

### Key Architectural Patterns:
- **Absolute Overlay Architecture**: Map is Layer 0 (`z-0`). UI is Layer 10+ using `absolute inset-0`.
- **Flow-Based Timing Engine**: Implemented a propagation logic for scheduling. Changing a "Start Time" or "Travel Duration" automatically recalculates the entire line's schedule.
- **State Handler Stability**: Functional setter pattern (`setX(() => handler)`) for context callbacks to prevent premature execution.
- **Bulk Data Retrieval**: Optimized shape fetching using a specialized bulk endpoint to prevent network congestion.
- **Persistent Highlighting**: Selection-based route persistence combined with transient "Halo Previews" for discovery.

## Frontend: Web (Public Viewer)
- **Framework**: React + TypeScript (Vite)
- **UI Library**: Mantine UI v7
- **Features**: Immersive fullscreen map with real-time sync.

---

## Technical Change Log (Standardization Phase)

### Jan 3, 2026 - GTFS Compliance & Export
- **Export Engine**: Implemented `ExportGTFS` handler to generate Google-compliant ZIP bundles.
- **Scheduling UX**: Created the **Unified Timing Node** and **Flow Designer** for high-speed schedule authoring.
- **Model Sync**: Updated physical PostgreSQL schema with pointers for optional fields and new temporal columns.
- **GIS Centering**: Standardized all marker anchors and flex-centering for 100% coordinate precision.
- **Visual Robustness**: Refactored all Leaflet icons to use inline CSS and raw keyframes, ensuring consistent rendering outside the React JIT cycle.
- **Performance**: Integrated `AbortController` for all async geometry updates to eliminate race conditions.
