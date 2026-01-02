# GTFS Platform User Guide

Welcome to the GTFS Transit Management Platform. This guide explains how to effectively manage your transit network.

## 🏁 Getting Started

The platform follows a natural data lifecycle. For a fully functional network, follow these steps in order:

1.  **Agencies**: Register the transit operator.
2.  **Stops**: Build your inventory of physical station points.
3.  **Routes**: Design the service lines and paths.
4.  **Trips**: Bind the paths to specific service schedules.

---

## 🛠 CMS Modules (GTFS Studio)

### 1. Transit Operators (Agencies) `^1`
*   Register official names, URLs, and timezones.
*   **Visualization**: Select an agency to see its entire coverage network on the map.

### 2. Stops Inventory `^2`
*   **Adding Stops**: Click anywhere on the map to drop a new anchor.
*   **Auto-Naming**: The system uses reverse geocoding to suggest a name based on the location.
*   **Draggable Adjustment**: Grab any blue marker to fine-tune its position. The coordinates update instantly.
*   **Route Bindings**: Click the `+` icon in the sidebar to assign a stop to multiple lines.

### 3. Route Studio `^3`
*   **Info**: Configure route numbers and branding colors.
*   **Geographic Path**: 
    *   Left-click the map to add anchor nodes.
    *   Click **Snap to Road Network** to generate a precise line following real streets.
    *   **Undo (`^Z`)**: Revert any mistakes instantly.
    *   **Auto-Save**: Changes are saved in the background while you draw.
*   **Stop Sequence**: Drag and drop stops from your library to set the arrival order.

### 4. Trip Mapping `^4`
*   Bind your designed paths to specific destinations (Headsigns).
*   Preview the final geometry before it goes live to the public.

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

The viewer is located at `http://localhost:3000`.
*   **Live Updates**: Every edit in the CMS is visible within 5 seconds.
*   **Route Discovery**: Use the search bar to find lines.
*   **Dark Mode**: Use the moon/sun icon for high-contrast night viewing.
