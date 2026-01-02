export interface Agency {
  id?: number;
  name: string;
  url: string;
  timezone: string;
}

export interface Stop {
  id: number;
  name: string;
  lat: number;
  lon: number;
}

export interface Route {
  id: number;
  short_name: string;
  long_name: string;
  color: string;
  agency_id: number;
}

export interface Trip {
  id: number;
  route_id: number;
  route?: Route;
  headsign: string;
  shape_id: string;
}

export interface ShapePoint {
  id?: number;
  shape_id: string;
  lat: number;
  lon: number;
  sequence: number;
}

export interface RouteStop {
  id?: number;
  route_id: number;
  stop_id: number;
  stop?: Stop;
  sequence: number;
}

export interface MapLayerRoute {
  id: number;
  color: string;
  positions: [number, number][];
  isFocused: boolean;
}

export interface MapLayers {
  routes: MapLayerRoute[];
  stops: (Stop & { isSmall?: boolean; hidePopup?: boolean; isCustom?: boolean; icon?: any })[];
  focusedPoints: [number, number][];
  activeShape: ShapePoint[];
}
