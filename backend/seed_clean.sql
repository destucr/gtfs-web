-- 1. Agency
INSERT INTO agencies (name, url, timezone) VALUES ('Trans Purbalingga', 'https://purbalinggakab.go.id', 'Asia/Jakarta');

-- 2. Routes
INSERT INTO routes (short_name, long_name, color, agency_id) VALUES 
('K1', 'Terminal - Alun Alun', '007AFF', 1),
('K2', 'Terminal - Bukateja', 'FF9500', 1);

-- 3. Stops
INSERT INTO stops (name, lat, lon) VALUES 
('Terminal Purbalingga', -7.39665, 109.35850), -- Hub (K1 & K2)
('Alun-Alun Purbalingga', -7.38805, 109.36330), -- K1 Only
('Pasar Bukateja', -7.41500, 109.43000);      -- K2 Only

-- 4. Assign Stops to Routes (RouteStop)
-- Route K1
INSERT INTO route_stops (route_id, stop_id, sequence) VALUES 
(1, 1, 1), -- Terminal
(1, 2, 2); -- Alun Alun

-- Route K2
INSERT INTO route_stops (route_id, stop_id, sequence) VALUES 
(2, 1, 1), -- Terminal
(3, 3, 2); -- Pasar Bukateja (Wait, Stop ID for Bukateja is 3)
-- Correction:
-- Terminal is ID 1
-- Alun Alun is ID 2
-- Bukateja is ID 3
-- So:
-- K1 (ID 1): Stop 1, Stop 2
-- K2 (ID 2): Stop 1, Stop 3

TRUNCATE TABLE route_stops RESTART IDENTITY CASCADE;
INSERT INTO route_stops (route_id, stop_id, sequence) VALUES 
(1, 1, 1), (1, 2, 2),
(2, 1, 1), (2, 3, 2);

-- 5. Initialize Trips/Shapes
INSERT INTO trips (route_id, headsign, shape_id) VALUES 
(1, 'Alun Alun', 'SHP_K1'),
(2, 'Bukateja', 'SHP_K2');

INSERT INTO shape_points (shape_id, lat, lon, sequence) VALUES 
('SHP_K1', -7.39665, 109.35850, 1), ('SHP_K1', -7.38805, 109.36330, 2),
('SHP_K2', -7.39665, 109.35850, 1), ('SHP_K2', -7.41500, 109.43000, 2);
