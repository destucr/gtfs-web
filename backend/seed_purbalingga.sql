-- Clear existing data (optional, but good for clean state)
TRUNCATE TABLE shape_points, trips, routes, stops, agencies RESTART IDENTITY CASCADE;

-- 1. Create Agency
INSERT INTO agencies (name, url, timezone) 
VALUES ('Trans Purbalingga', 'https://purbalinggakab.go.id', 'Asia/Jakarta');

-- 2. Create Stops (Real coordinates in Purbalingga)
INSERT INTO stops (name, lat, lon) VALUES 
('Terminal Purbalingga', -7.39665, 109.35850),
('Patung Knalpot', -7.39300, 109.36000),
('Pasar Segamas', -7.39050, 109.36150),
('Alun-Alun Purbalingga', -7.38805, 109.36330);

-- 3. Create Route
INSERT INTO routes (short_name, long_name, color, agency_id) 
VALUES ('K1', 'Terminal - Alun-Alun', '0055AA', 1);

-- 4. Create Trip
INSERT INTO trips (route_id, headsign, shape_id) 
VALUES (1, 'Menuju Alun-Alun', 'SHP_001');

-- 5. Create Shape Points (Path geometry)
INSERT INTO shape_points (shape_id, lat, lon, sequence) VALUES 
('SHP_001', -7.39665, 109.35850, 1), -- Terminal
('SHP_001', -7.39600, 109.35880, 2), -- Road segment
('SHP_001', -7.39500, 109.35920, 3),
('SHP_001', -7.39300, 109.36000, 4), -- Patung Knalpot
('SHP_001', -7.39200, 109.36080, 5),
('SHP_001', -7.39050, 109.36150, 6), -- Pasar Segamas
('SHP_001', -7.38900, 109.36250, 7),
('SHP_001', -7.38805, 109.36330, 8); -- Alun-Alun
