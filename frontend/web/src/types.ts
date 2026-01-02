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
  id: number;
  shape_id: string;
  lat: number;
  lon: number;
  sequence: number;
}
