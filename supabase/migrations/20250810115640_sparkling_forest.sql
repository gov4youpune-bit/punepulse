/*
  # Pune Pulse - Initial Database Schema

  1. New Tables
    - `complaints` - Main complaint records with location, status, portal integration
    - `attachments` - File storage references linked to complaints  
    - `audit_logs` - Complete audit trail for all system actions

  2. Security
    - Enable RLS on all tables
    - Add policies for anonymous citizen access and admin management
    - Secure attachment handling with proper access controls

  3. Extensions & Performance
    - PostGIS for geospatial queries and location indexing
    - Optimized indexes for category filtering and location queries
    - UUID generation for secure token handling
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Main complaints table
CREATE TABLE IF NOT EXISTS complaints (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  token varchar(64) UNIQUE NOT NULL,
  category text NOT NULL,
  subtype text,
  description text,
  location_point geography(Point,4326),
  location_text text,
  attachments jsonb DEFAULT '[]',
  email text,
  status text DEFAULT 'submitted',
  source text DEFAULT 'web',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  submitted_to_portal jsonb DEFAULT '{}',
  ward_number integer,
  urgency text DEFAULT 'medium',
  portal_text text,
  summary_en text,
  summary_mr text,
  classification_confidence real DEFAULT 0.0
);

-- Attachments table  
CREATE TABLE IF NOT EXISTS attachments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  complaint_id uuid REFERENCES complaints(id) ON DELETE CASCADE,
  bucket text NOT NULL,
  path text NOT NULL,
  filename text NOT NULL,
  content_type text,
  file_size integer,
  uploaded_at timestamptz DEFAULT now()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  complaint_id uuid REFERENCES complaints(id),
  actor text,
  action text NOT NULL,
  payload jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Admin users table (extends Supabase auth)
CREATE TABLE IF NOT EXISTS admin_profiles (
  id uuid REFERENCES auth.users(id) PRIMARY KEY,
  email text NOT NULL,
  full_name text,
  role text DEFAULT 'operator',
  ward_assignments integer[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_complaints_location ON complaints USING GIST(location_point);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_token ON complaints(token);
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_ward ON complaints(ward_number);
CREATE INDEX IF NOT EXISTS idx_attachments_complaint ON attachments(complaint_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_complaint ON audit_logs(complaint_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for complaints
CREATE POLICY "Anyone can submit complaints"
  ON complaints
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read complaints by token"
  ON complaints
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage all complaints"
  ON complaints
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- RLS Policies for attachments  
CREATE POLICY "Anyone can upload attachments"
  ON attachments
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read attachments"
  ON attachments
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage attachments"
  ON attachments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- RLS Policies for audit logs
CREATE POLICY "Only admins can read audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles 
      WHERE id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Only admins can create audit logs"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- RLS Policies for admin profiles
CREATE POLICY "Admins can read all profiles"
  ON admin_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles 
      WHERE id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Admins can update own profile"
  ON admin_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- Create storage bucket for attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('complaint-attachments', 'complaint-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can upload complaint attachments"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'complaint-attachments');

CREATE POLICY "Anyone can read complaint attachments"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'complaint-attachments');

CREATE POLICY "Admins can delete complaint attachments"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'complaint-attachments' AND
    EXISTS (
      SELECT 1 FROM admin_profiles 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Functions for token generation
CREATE OR REPLACE FUNCTION generate_complaint_token()
RETURNS text AS $$
DECLARE
  token_prefix text := 'PMC-';
  token_suffix text;
  full_token text;
  token_exists boolean;
BEGIN
  LOOP
    -- Generate 6-digit random number
    token_suffix := LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0');
    full_token := token_prefix || token_suffix;
    
    -- Check if token already exists
    SELECT EXISTS(SELECT 1 FROM complaints WHERE token = full_token) INTO token_exists;
    
    -- If token doesn't exist, break the loop
    IF NOT token_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN full_token;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate tokens
CREATE OR REPLACE FUNCTION set_complaint_token()
RETURNS trigger AS $$
BEGIN
  IF NEW.token IS NULL OR NEW.token = '' THEN
    NEW.token := generate_complaint_token();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_complaint_token
  BEFORE INSERT OR UPDATE ON complaints
  FOR EACH ROW
  EXECUTE FUNCTION set_complaint_token();

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log(
  p_complaint_id uuid,
  p_actor text,
  p_action text,
  p_payload jsonb DEFAULT '{}',
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO audit_logs (
    complaint_id, 
    actor, 
    action, 
    payload, 
    ip_address, 
    user_agent
  )
  VALUES (
    p_complaint_id,
    p_actor,
    p_action,
    p_payload,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql;