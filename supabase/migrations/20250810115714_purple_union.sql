/*
  # Seed Admin Data

  1. Sample admin users for development
  2. Category and subcategory reference data
  3. Ward boundary information for Pune
*/

-- Insert sample admin profile (will need to be linked to actual auth user)
-- This is a placeholder - actual admin users need to be created via Supabase Auth first
INSERT INTO admin_profiles (id, email, full_name, role, ward_assignments, is_active)
VALUES 
  ('00000000-0000-0000-0000-000000000001'::uuid, 'admin@punepulse.dev', 'System Administrator', 'admin', ARRAY[1,2,3,4,5], true),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'operator@punepulse.dev', 'Ward Operator', 'operator', ARRAY[1,2], true)
ON CONFLICT (id) DO NOTHING;

-- Create reference table for complaint categories
CREATE TABLE IF NOT EXISTS complaint_categories (
  id serial PRIMARY KEY,
  category text NOT NULL,
  subtype text,
  description text,
  connector text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0
);

-- Insert category reference data
INSERT INTO complaint_categories (category, subtype, description, connector, sort_order) VALUES
('roads', 'pothole', 'Road potholes and surface damage', 'pmc', 1),
('roads', 'streetlight', 'Non-functional street lighting', 'pmc', 2),
('roads', 'traffic_signal', 'Malfunctioning traffic signals', 'pmc', 3),
('roads', 'road_construction', 'Road construction and maintenance', 'pmc', 4),
('water', 'burst_pipe', 'Water pipe bursts and leaks', 'pmc', 10),
('water', 'no_water', 'Water supply interruption', 'pmc', 11),
('water', 'contaminated_water', 'Water quality issues', 'pmc', 12),
('water', 'drainage', 'Drainage and sewage problems', 'pmc', 13),
('power', 'no_power', 'Power outage and interruption', 'msedcl', 20),
('power', 'transformer', 'Transformer and electrical issues', 'msedcl', 21),
('power', 'power_line', 'Damaged power lines', 'msedcl', 22),
('urban', 'garbage', 'Garbage collection and disposal', 'pmc', 30),
('urban', 'stray_animals', 'Stray animal issues', 'pmc', 31),
('urban', 'encroachment', 'Illegal encroachment', 'pmc', 32),
('urban', 'air_pollution', 'Air pollution complaints', 'pmc', 33),
('welfare', 'ration_card', 'Ration card related issues', 'pmc', 40),
('welfare', 'birth_certificate', 'Birth certificate issues', 'pmc', 41),
('welfare', 'property_tax', 'Property tax related complaints', 'pmc', 42),
('other', 'other', 'Other civic issues', 'pmc', 50)
ON CONFLICT DO NOTHING;

-- Create ward boundaries reference (simplified for Pune)
CREATE TABLE IF NOT EXISTS ward_boundaries (
  ward_number integer PRIMARY KEY,
  ward_name text NOT NULL,
  office_address text,
  contact_phone text,
  area_description text,
  boundary_geom geography(MultiPolygon, 4326),
  is_active boolean DEFAULT true
);

-- Insert sample ward data (simplified - real boundaries would need actual GIS data)
INSERT INTO ward_boundaries (ward_number, ward_name, office_address, contact_phone, area_description) VALUES
(1, 'Kasba Peth', 'Kasba Peth Ward Office, Pune', '020-25588001', 'Historical center of Pune'),
(2, 'Bhavani Peth', 'Bhavani Peth Ward Office, Pune', '020-25588002', 'Traditional residential area'),
(3, 'Ganj Peth', 'Ganj Peth Ward Office, Pune', '020-25588003', 'Commercial hub area'),
(4, 'Shivajinagar', 'Shivajinagar Ward Office, Pune', '020-25588004', 'Business and residential district'),
(5, 'Kothrud', 'Kothrud Ward Office, Pune', '020-25588005', 'IT corridor residential area'),
(6, 'Warje-Karve Nagar', 'Warje Ward Office, Pune', '020-25588006', 'Expanding residential zone'),
(7, 'Sinhagad Road', 'Sinhagad Road Ward Office, Pune', '020-25588007', 'Educational institutes area'),
(8, 'Hadapsar', 'Hadapsar Ward Office, Pune', '020-25588008', 'IT hub and residential'),
(9, 'Kondhwa-Yewalewadi', 'Kondhwa Ward Office, Pune', '020-25588009', 'Developing residential area'),
(10, 'Wanowrie-Ramtekdi', 'Wanowrie Ward Office, Pune', '020-25588010', 'Mixed residential commercial')
ON CONFLICT (ward_number) DO NOTHING;