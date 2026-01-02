# Gemini Project Context - GTFS-Web

## Project Overview
A GTFS (General Transit Feed Specification) management system consisting of a Go backend and two React frontends (CMS and Public Web).

## Tech Stack
- **Backend**: Go 1.24 (Gin, GORM, PostgreSQL)
- **Frontend CMS**: React (Vite) - Port 5173
- **Frontend Web**: React (Vite) - Port 3000
- **Infrastructure**: Docker Compose (Backend + Postgres)

## Key Configurations
- **Database Port (Host)**: 5433 (mapped to 5432 in container) to avoid conflict with local Postgres.
- **Database Credentials**: user: `user`, password: `password`, db: `gtfs_db`.
- **Backend API**: `http://localhost:8080/api`

## Development Commands
- **Start Backend**: `docker compose up -d --build`
- **Start CMS**: `cd frontend/cms && npm run dev`
- **Start Web**: `cd frontend/web && npm run dev`

## Development Rules
- Always run 'npm run build && npm run lint' in both frontend/cms and frontend/web directories before finalizing any changes or committing to ensure codebase stability.
- Maintain and update `GUIDE.md` whenever new features, shortcuts, or workflow changes are implemented to ensure user documentation is always accurate.

## Implementation Memories
- Remember to use `GOTOOLCHAIN=local` or ensure Go 1.24 is used for builds due to `go.mod` requirements.
- The `backend/database/db.go` uses environment variables for connection strings.
- Frontend CMS uses `react-router-dom` for navigation between GTFS entities.
