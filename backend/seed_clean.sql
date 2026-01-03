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

-- 4. Initialize Trips/Shapes (Moved up)
INSERT INTO trips (route_id, headsign, shape_id) VALUES 
(1, 'Alun Alun', 'SHP_K1'),
(2, 'Bukateja', 'SHP_K2');

INSERT INTO shape_points (shape_id, lat, lon, sequence) VALUES 
('SHP_K1', -7.39665, 109.35850, 1), ('SHP_K1', -7.38805, 109.36330, 2),
('SHP_K2', -7.39665, 109.35850, 1), ('SHP_K2', -7.41500, 109.43000, 2);

-- 5. Assign Stops to Trips (TripStop)
-- Trip 1 (K1)
INSERT INTO trip_stops (trip_id, stop_id, sequence, arrival_time, departure_time) VALUES 
(1, 1, 1, '08:00:00', '08:05:00'), -- Terminal
(1, 2, 2, '08:15:00', '08:20:00'); -- Alun Alun

-- Trip 2 (K2)
INSERT INTO trip_stops (trip_id, stop_id, sequence, arrival_time, departure_time) VALUES 
(2, 1, 1, '09:00:00', '09:05:00'), -- Terminal
(2, 3, 2, '09:30:00', '09:35:00'); -- Pasar Bukateja

-- Cleanup old tables if accidentally left
DROP TABLE IF EXISTS route_stops;
