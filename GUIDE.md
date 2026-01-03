# GTFS Platform User Guide

Welcome to the GTFS Transit Management Platform. This guide explains how to effectively manage your transit network using our professional GIS-integrated workspace.

## 🏁 Getting Started

The platform follows a natural data lifecycle. For a fully functional network, follow these steps in order:

1.  **Agencies**: Register the transit operator.
2.  **Stops**: Build your inventory of physical station points.
3.  **Routes**: Design the service lines and paths.
4.  **Trips**: Bind the paths to specific service schedules.

**Note on Workspace**: The platform uses an immersive GIS layout. Left sidebars handle data management and filtering, while the map remains persistent and reactive across all modules for a zero-flicker experience.

---

## 🛠 CMS Modules (GTFS Studio)

### 1. Transit Operators (Agencies) `^1`
*   Register official names, URLs, and timezones.
*   **Network View**: Select an operator from the sidebar to instantly visualize their entire service area, including all associated lines and stations.

### 2. Stops Inventory `^2`
*   **Inventory List**: Browse and search all station points in the left sidebar.
*   **Adding Stops**: Click anywhere on the map to drop a new anchor.
*   **Auto-Naming**: The system automatically suggests a name based on real-world landmarks using reverse geocoding.
*   **Draggable Adjustment**: Grab any marker on the map to fine-tune its position; coordinates update in real-time.
*   **Route Bindings**: Click the `+` icon in any table row to assign a stop to multiple transit lines.

### 3. Route Studio `^3`
*   **Persistent Switching**: Switch between lines in the left sidebar without leaving the editor context.
*   **Unified Property Panel**: Use the floating right panel to manage:
    *   **Info**: Route numbers and branding colors (with a visual color picker).
    *   **Path**: Left-click the map to add nodes. Use **Snap to Road Network** (`^R`) for precision.
    *   **Sequence**: Drag and drop stops from your library to set the arrival order.
*   **Live Persistence**: Every map edit or reordering is automatically synchronized to the cloud in real-time.
*   **Undo (`^Z`)**: Revert any node placement or construction step instantly.

### 4. Trip Mapping `^4`
*   Finalize service bindings by linking paths to target destinations (Headsigns).
*   Preview the high-resolution geometry before it goes live.

---

## ⌨️ Global Keybindings

| Shortcut | Action |
| :--- | :--- |
| `Ctrl/Cmd + 1` | Open Agencies |
| `Ctrl/Cmd + 2` | Open Stops Inventory |
| `Ctrl/Cmd + 3` | Open Route Studio |
| `Ctrl/Cmd + 4` | Open Trip Mapping |
| `Ctrl/Cmd + 0` | Go to Dashboard |
| `Ctrl/Cmd + S` | Force Save / Manual Commit |
| `Ctrl/Cmd + Z` | Undo last path node (Route Studio) |
| `Ctrl/Cmd + R` | Snap path to roads (Route Studio) |

---

## 🌐 Public Web Viewer

Accessible at `http://localhost:3000`.
*   **Real-time Synchronization**: CMS edits are visible to the public within 5 seconds.
*   **Dark Mode**: High-contrast night viewing support.
*   **Route Search**: Instant discovery and interactive line highlighting.