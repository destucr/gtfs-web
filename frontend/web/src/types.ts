export interface Stop {
  id: number;
  name: string;
  lat: number;
  lon: number;
  route_ids?: number[]; // From backend hydration
}

export interface Route {
  id: number;
  short_name: string;
  long_name: string;
  color: string;
  text_color?: string;
  route_type?: number;
  route_desc?: string;
  route_url?: string;
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
