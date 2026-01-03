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
- **Optionality Handling**: Pointer types used for optional GTFS fields (`route_type`, `text_color`, etc.) to ensure correct `null` serialization for the frontend.

## Frontend: CMS (High-Density GIS IDE)
- **Framework**: React + TypeScript (Vite)
- **Design Pattern**: **High-Density Proximal Hub Architecture**
- **UI Standard**: **X-Style High-Density** (11px base typography, monochromatic zinc palette)

### Key Architectural Patterns:
- **Absolute Overlay Architecture**: Map is Layer 0 (`z-0`). UI is Layer 10+ using `absolute inset-0` with optimized `pointer-events` management.
- **State Handler Stability**: Implemented the `setX(() => handler)` pattern for context-based callback functions. This prevents unintended function execution during React's state reconciliation cycle.
- **Intelligent Visual Filtering**: To prevent icon flickering and double-rendering, the map logic dynamically filters active/selected entities out of the general registry layer.
- **Multi-Layer Highlighting**:
    - **Selection (Persistent)**: Solid high-opacity lines representing the active editing context.
    - **Discovery (Transient)**: "Halo Previews" (colored lines with white background halos) triggered by hover for high-contrast data discovery.
- **Unified Registry Explorer**: Dynamic Pane Engine allows switching between data manifests without page reloads.
- **Deterministic UX**: Standardized **"Commit Changes"** primary CTAs and **"Delete Record"** secondary CTAs across all modules.

## Frontend: Web (Public Viewer)
- **Framework**: React + TypeScript (Vite)
- **UI Library**: Mantine UI v7
- **Features**: Immersive fullscreen map with dark mode and 5s real-time data sync.

---

## Technical Change Log (Refinement Phase)

### Jan 2, 2026 - UX & Stability Audit
- **State Logic**: Refactored `WorkspaceContext` to use stable functional setters for map handlers.
- **Visual Cleanup**: Simplified stop markers to a single-pulse design. Resolved double-render overlap bugs.
- **Type Safety**: Achieved 100% TS compliance across both frontends. Fixed missing properties in `MapLayers` and asset import errors.
- **Highlighting**: Implemented persistent vs. transient route highlighting logic in the Stops module.
- **Standardization**: Unified button labeling, layout (flex-centered), and positioning for all record lifecycle actions.