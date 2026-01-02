# Gemini Project Context - GTFS-Web

## Project Overview
A professional GTFS (General Transit Feed Specification) management ecosystem consisting of a Go backend and two TypeScript frontends (CMS and Public Web).

## Tech Stack
- **Backend**: Go 1.24 (Gin, GORM, PostgreSQL)
- **Frontend CMS**: React + TypeScript (Vite) - Port 5173
- **Frontend Web**: React + TypeScript (Vite) - Port 3000
- **Infrastructure**: Docker Compose (Backend + PostgreSQL)

## Key Configurations
- **Database Port (Host)**: 5433 (mapped to 5432 in container) to avoid conflict with local PostgreSQL.
- **Database Credentials**: Managed via `.env` (user: `user`, password: `password`, db: `gtfs_db`).
- **Backend API**: `http://localhost:8080/api`

## Development Rules
- **Health Check**: Always run `npm run build && npm run lint` in both `frontend/cms` and `frontend/web` before finalizing any changes or committing to ensure codebase stability.
- **Documentation**: Maintain and update `GUIDE.md` whenever new features, shortcuts, or workflow changes are implemented to ensure user documentation is always accurate.
- **TypeScript**: Strictly follow the defined interfaces in `src/types.ts` for all frontend development.

## Implementation Memories
- **Persistent Map**: The `MapContainer` is a singleton hosted in `App.tsx` and managed via `WorkspaceContext`. Child components must use the `useWorkspace` hook to update map layers instead of mounting their own map instances.
- **Auto-Save Engine**: Route Studio implements a 2s debounced persistence layer. Changes to geometry or metadata are synchronized automatically.
- **Standardized IDs**: Always use the `SHP_[ROUTE_SHORT_NAME]` format for `shape_id` to maintain database readability.
- **Automated Visuals**: Use `npm run screenshots` from the root directory to programmatically refresh all project visual documentation using Playwright.
- **UI migration**: The CMS is fully migrated to Tailwind CSS (HIG system), and the Web Viewer is migrated to Mantine UI v7.
---
## Gemini Added Memories
- The user's GitHub username is destucr.