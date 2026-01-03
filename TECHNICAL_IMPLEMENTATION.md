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
- **Responsibilities**:
    - Manage GTFS data (Agencies, Routes, Stops, Trips, Shapes).
    - Database migrations and connection management.

## Frontend: CMS (High-Density GIS IDE)
- **Framework**: React + TypeScript (Vite)
- **Design Pattern**: **High-Density Proximal Hub Architecture**
- **UI Standard**: **X-Style High-Density** (11px base typography, monochromatic zinc palette)
- **Key Architectural Patterns**:
    - **Absolute Overlay Architecture**: The map is Layer 0 (`z-0`). All UI (Sidebar, Hubs, HUD) is Layer 10+ using `absolute inset-0` with `pointer-events-none` on parents and `pointer-events-auto` on interactive children.
    - **Intelligent Ghost Mode**: Floating hubs automatically fade to 20% opacity and become click-through (`pointer-events-none`) when the user is actively drawing on the map, restoring full opacity on hover.
    - **Unified Registry Explorer**: A single-view dashboard that dynamically switches data manifests (Operators, Stops, Routes, Bindings) without page reloads using a dynamic Pane Engine.
    - **Holistic Deep-Linking**: Bi-directional "teleportation" between modules (e.g., jump from a stop in a route sequence directly to that stop's editor).
    - **Deterministic Feedback**: All system actions follow the formula: `[System Status] + [Action Warning/Instruction]`.

## Frontend: Web (Public Viewer)
- **Framework**: React + TypeScript (Vite)
- **UI Library**: Mantine UI v7
- **Purpose**: Immersive, public-facing transit map.

---

## Technical Change Log (Recent Overhaul)

### Jan 2, 2026 - High-Density UX Overhaul
- **UI Layering**: Implemented Absolute Overlay pattern to prevent map-clipping and ensure hubs are above the GIS layer.
- **Draggable Hubs**: All editor windows are now `framer-motion` powered draggable and collapsible components.
- **Ghost Mode**: Added spatial awareness to UI—editors become transparent during map-drawing.
- **Unified Explorer**: Refactored the Home Dashboard into a data-first multi-pane explorer with sorting and filtering.
- **Terminology Polish**: Removed technical jargon (Registry/Manifest) in favor of functional human terms (List/Details).
- **Branding Audit**: Removed all non-functional branding ("Pro Tools") to maintain utility-first neutrality.
- **High-Density Standard**: Standardized on a 320px compact width and 11px typography across all editor hubs.
- **Spatial Intelligence**: Enhanced the Map Controller with smooth auto-focus logic for selections and "Soft Zoom" for hover-based discovery.
- **Visual Standard**: Implemented "Halo Previews" for routes—colored lines with high-contrast white background halos for better visibility without data confusion.
