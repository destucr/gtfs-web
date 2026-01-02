-- 1. Create Stops for Koridor 2
INSERT INTO stops (name, lat, lon) VALUES 
('Pasar Bukateja', -7.41500, 109.43000),
('Simpang Bojong', -7.40500, 109.40000);

-- 2. Create Route Koridor 2
INSERT INTO routes (short_name, long_name, color, agency_id) 
VALUES ('K2', 'Terminal - Bukateja', 'FF5500', 1);

-- 3. Create Trip for Koridor 2
INSERT INTO trips (route_id, headsign, shape_id) 
VALUES (2, 'Menuju Bukateja', 'SHP_K2');

-- 4. Create Shape Points for Koridor 2 (Basic line, can be refined in editor)
INSERT INTO shape_points (shape_id, lat, lon, sequence) VALUES 
('SHP_K2', -7.39665, 109.35850, 1), -- Terminal
('SHP_K2', -7.40000, 109.38000, 2), -- Waypoint
('SHP_K2', -7.40500, 109.40000, 3), -- Simpang Bojong
('SHP_K2', -7.41000, 109.41500, 4), -- Waypoint
('SHP_K2', -7.41500, 109.43000, 5); -- Pasar Bukateja
