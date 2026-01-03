# Gemini Project Context - GTFS-Web

## Project Overview
A high-performance GTFS management ecosystem consisting of a Go backend and two TypeScript frontends.

## Tech Stack
- **Backend**: Go 1.24 (Gin, GORM, PostgreSQL)
- **Frontend CMS**: React + TypeScript (Vite) - Port 5173
- **Frontend Web**: React + TypeScript (Vite) - Port 3000
- **Infrastructure**: Docker Compose (Backend + PostgreSQL)

## AI Maintenance Rules (Strict Adherence Required)
1.  **Architecture**: Follow the **Proximal Hub Overlay Pattern**. Sidebars are for picking; Floating Draggable Hubs are for editing.
2.  **Layering**: Map is always Layer 0 (`z-0`). All UI components must use `absolute inset-0` with proper `pointer-events` management to avoid clipping.
3.  **Density**: Adhere to **X-Style High-Density**. Hub width: 320px. Base font: 11px (text-sm/xs). Palette: Monochromatic Zinc.
4.  **Copywriting**: Use the **Deterministic Formula**: `[System Status] + [Action Warning]`. Avoid jargon like "Manifest" or "Topology." Use "List" or "Connection."
5.  **Interactivity**: Every button must have a unique, deterministic purpose. Always include `title` tooltips explaining the system action.
6.  **Deep-Linking**: Maintain the "Thread"—bi-directional jumps between related entities (Stops <-> Routes) must be preserved.
7.  **Ghost Mode**: Ensure any new floating components support auto-transparency and click-through logic during Map Drawing modes (`quickMode`).

## Health Check & Documentation
- **Sanity Check**: Always run `npm run build && npm run lint` in both frontend directories before finalizing changes.
- **Visuals**: Use `npm run screenshots` from the root to refresh visuals after any UI modification.
---
## Gemini Added Memories
- The user's GitHub username is destucr.
