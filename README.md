# GTFS Transit Management Platform

A professional, full-stack transit management ecosystem designed for designing, managing, and visualizing General Transit Feed Specification (GTFS) data. The platform features an immersive, GIS-desktop-inspired CMS and a modern public-facing live map.

---

## 🚀 Product Overview

<div align="center">
  <h3>The CMS: Unified Explorer</h3>
  <p>High-density dashboard with a dynamic data manifest engine for Operators, Stops, Routes, and Trips.</p>
  <img src="./assets/screenshots/dashboard.webp" width="700" alt="Dashboard" style="border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
</div>

<br>

<div align="center">
  <h3>The Web Viewer: Public Live Map</h3>
  <p>Immersive full-screen map with real-time updates, route discovery, and "Swiss Style" information design.</p>
  <img src="./assets/screenshots/web-viewer.webp" width="700" alt="Web Viewer" style="border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
</div>

---

## ✨ Key Features

### 🛠 GTFS Studio (CMS)
| Feature | Details |
| :--- | :--- |
| **Map Designer** | Immersive GIS workspace with real-time road-following path construction (OSRM) and anchor-point snapping. |
| **Spatial Intelligence** | Multi-layer map highlighting with high-contrast "Halo Previews" for discovery and persistent selection states. |
| **Smart Node Hub** | One-click contextual stop-to-route assignments with automated reverse geocoding. |
| **Industrial UX** | Draggable, collapsible hubs with "Ghost Mode" transparency during active map drawing. |
| **Integrity Checks** | Real-time topological health scoring and live system activity auditing. |

### 🌐 Public Web Viewer
| Feature | Details |
| :--- | :--- |
| **Immersive Map** | Fullscreen map with glassmorphism HUD and custom "Wayfinding" typography. |
| **Real-time Sync** | Automatically polls CMS changes every 5 seconds—updates appear live without refreshing. |
| **Focus Mode** | Selecting a line emphasizes its path while fading others, reducing map clutter. |
| **Route Badges** | Distinct, color-coded route indicators verified by backend hydration. |

---

## 📸 Visual Tour

<table align="center">
  <tr>
    <td align="center" width="50%">
      <strong>Smart Node Hub</strong><br>
      <img src="./assets/screenshots/stop-and-routes.webp" width="100%" alt="Stops Inventory">
    </td>
    <td align="center" width="50%">
      <strong>Route Studio</strong><br>
      <img src="./assets/screenshots/route-studio-path.webp" width="100%" alt="Route Studio">
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <strong>Trip Scheduling</strong><br>
      <img src="./assets/screenshots/trip-mapping.webp" width="100%" alt="Trip Mapping">
    </td>
    <td align="center" width="50%">
      <strong>Route Focus Mode</strong><br>
      <img src="./assets/screenshots/web-viewer-route.webp" width="100%" alt="Web Viewer Route">
    </td>
  </tr>
</table>

### Micro-Interactions
<p align="center">
  <img src="./assets/screenshots/micro-interactions.webp" width="600" alt="Micro Interactions">
  <br>
  <em>Hover discovery and pulsing feedback for intuitive navigation.</em>
</p>

---

## 🏗 Architecture

| Component | Tech Stack |
| :--- | :--- |
| **Backend** | **Go 1.24** (Gin Gonic, GORM), **PostgreSQL** (PostGIS) |
| **CMS Frontend** | **React** + Tailwind CSS + Lucide Icons (HIG-inspired) |
| **Web Frontend** | **React 18** + Mantine UI v7 + Leaflet |
| **Infrastructure** | Docker Compose (Full stack containerization) |

---

## 🛠 Setup & Installation

### 1. Backend & Database
```bash
cp .env.example .env
# Edit .env with your credentials
docker compose up -d --build
```

### 2. Seed Data (Optional)
```bash
npm run seed
```

### 3. Frontends
**CMS (Manager)**
```bash
cd frontend/cms && npm install && npm run dev
# http://localhost:5173
```

**Web Viewer (Public)**
```bash
cd frontend/web && npm install && npm run dev
# http://localhost:3000
```
