-- ==========================================
-- 1. EMAIL TRACKING & INBOX MIGRATION
-- ==========================================

-- Add 'REPLIED' to application_status ENUM
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'REPLIED';

-- Create the inbox_messages table
CREATE TYPE inbox_type AS ENUM ('SYSTEM_ALERT', 'SCHOOL_REPLY', 'APPLICATION_UPDATE');

CREATE TABLE IF NOT EXISTS inbox_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
    type inbox_type DEFAULT 'APPLICATION_UPDATE',
    subject VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE inbox_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own inbox messages"
ON inbox_messages FOR SELECT
TO authenticated
USING (auth.uid() = student_id);

CREATE POLICY "Students can update read status of their own messages"
ON inbox_messages FOR UPDATE
TO authenticated
USING (auth.uid() = student_id);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_inbox_student_id ON inbox_messages(student_id);
CREATE INDEX IF NOT EXISTS idx_inbox_created_at ON inbox_messages(created_at DESC);

-- ==========================================
-- 2. APPLICATION TABLE UPDATES
-- ==========================================

-- Allow students to update their own application status
CREATE POLICY "Students can update their own applications"
ON applications FOR UPDATE
TO authenticated
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);

-- Prevent duplicate applications to the same school
ALTER TABLE applications ADD CONSTRAINT unique_student_school UNIQUE (student_id, school_id);

-- ==========================================
-- 3. ANALYTICS RPC
-- ==========================================
CREATE OR REPLACE FUNCTION get_student_analytics_summary(
  student_uuid UUID
)
RETURNS JSON AS $$
DECLARE
  student_loc GEOGRAPHY(POINT, 4326);
  student_reg UUID;
  result JSON;
BEGIN
  -- 1. Get the student's location and region
  SELECT location, region_id INTO student_loc, student_reg
  FROM student_profiles
  WHERE student_id = student_uuid;

  -- 2. Aggregate Data
  WITH app_stats AS (
    SELECT 
      a.status,
      r.name AS region_name,
      CASE 
        WHEN student_loc IS NULL THEN NULL 
        ELSE GREATEST(20, LEAST(100, 100 - (ST_Distance(s.location, student_loc) / 1000.0 * 0.4) + CASE WHEN s.region_id = student_reg THEN 15 ELSE 0 END))
      END AS match_score
    FROM applications a
    JOIN schools s ON a.school_id = s.id
    LEFT JOIN regions r ON s.region_id = r.id
    WHERE a.student_id = student_uuid
  ),
  counts AS (
    SELECT 
      COUNT(*) AS total_applications,
      COUNT(*) FILTER (WHERE status = 'PENDING') AS pending_count,
      COUNT(*) FILTER (WHERE status = 'OPENED') AS opened_count,
      COUNT(*) FILTER (WHERE status = 'REPLIED') AS replied_count,
      COUNT(*) FILTER (WHERE status = 'ACCEPTED') AS accepted_count,
      COUNT(*) FILTER (WHERE status = 'REJECTED') AS rejected_count,
      AVG(match_score) AS avg_match_score
    FROM app_stats
  ),
  top_region AS (
    SELECT region_name
    FROM app_stats
    WHERE region_name IS NOT NULL
    GROUP BY region_name
    ORDER BY COUNT(*) DESC
    LIMIT 1
  )
  SELECT json_build_object(
    'total_applications', c.total_applications,
    'pending_count', c.pending_count,
    'opened_count', c.opened_count,
    'replied_count', c.replied_count,
    'accepted_count', c.accepted_count,
    'rejected_count', c.rejected_count,
    'avg_match_score', ROUND(COALESCE(c.avg_match_score, 0)::NUMERIC, 1),
    'acceptance_rate', CASE WHEN c.total_applications > 0 THEN ROUND((c.accepted_count::NUMERIC / c.total_applications::NUMERIC) * 100, 1) ELSE 0 END,
    'top_region', COALESCE((SELECT region_name FROM top_region), 'N/A')
  ) INTO result
  FROM counts c;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 4. REAL SCORES RPCs
-- ==========================================
CREATE OR REPLACE FUNCTION get_all_schools_with_scores(
  student_uuid UUID
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  school_type VARCHAR,
  region VARCHAR,
  district VARCHAR,
  town VARCHAR,
  logo_url VARCHAR,
  cover_image_url VARCHAR,
  distance_km FLOAT,
  match_score INT
) AS $$
DECLARE
  student_loc GEOGRAPHY(POINT, 4326);
  student_reg UUID;
BEGIN
  -- Get the student's location and region
  SELECT location, region_id INTO student_loc, student_reg
  FROM student_profiles
  WHERE student_id = student_uuid;

  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.school_type,
    r.name::VARCHAR AS region,
    d.name::VARCHAR AS district,
    s.town_city AS town,
    s.logo_url,
    s.cover_image_url,
    -- If student_loc is null, return NULL. Otherwise, calculate distance in km.
    CASE 
      WHEN student_loc IS NULL THEN NULL 
      ELSE (ST_Distance(s.location, student_loc) / 1000.0)::FLOAT 
    END AS distance_km,
    -- Calculate realistic match score with a floor of 20 and cap of 100
    CASE 
      WHEN student_loc IS NULL THEN NULL 
      ELSE (
        GREATEST(20, LEAST(100, 
          100 
          - (ST_Distance(s.location, student_loc) / 1000.0 * 0.4) -- Distance penalty
          + CASE WHEN s.region_id = student_reg THEN 15 ELSE 0 END -- Region bonus
        ))
      )::INT 
    END AS match_score
  FROM schools s
  LEFT JOIN districts d ON s.district_id = d.id
  LEFT JOIN regions r ON s.region_id = r.id
  ORDER BY s.name ASC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_active_applications_with_scores(
  student_uuid UUID
)
RETURNS TABLE (
  application_id UUID,
  school_id UUID,
  school_name VARCHAR,
  region VARCHAR,
  district VARCHAR,
  town VARCHAR,
  logo_url VARCHAR,
  status application_status,
  created_at TIMESTAMPTZ,
  distance_km FLOAT,
  match_score INT,
  contact_email VARCHAR,
  contact_phone VARCHAR,
  ai_generated_letter TEXT,
  final_letter TEXT,
  documents_attached TEXT[]
) AS $$
DECLARE
  student_loc GEOGRAPHY(POINT, 4326);
  student_reg UUID;
BEGIN
  -- Get the student's location and region
  SELECT location, region_id INTO student_loc, student_reg
  FROM student_profiles
  WHERE student_id = student_uuid;

  RETURN QUERY
  SELECT 
    a.id AS application_id,
    s.id AS school_id,
    s.name AS school_name,
    r.name::VARCHAR AS region,
    d.name::VARCHAR AS district,
    s.town_city AS town,
    s.logo_url,
    a.status,
    a.created_at,
    -- If student_loc is null, return NULL. Otherwise, calculate distance in km.
    CASE 
      WHEN student_loc IS NULL THEN NULL 
      ELSE (ST_Distance(s.location, student_loc) / 1000.0)::FLOAT 
    END AS distance_km,
    -- Calculate realistic match score with a floor of 20 and cap of 100
    CASE 
      WHEN student_loc IS NULL THEN NULL 
      ELSE (
        GREATEST(20, LEAST(100, 
          100 
          - (ST_Distance(s.location, student_loc) / 1000.0 * 0.4) -- Distance penalty
          + CASE WHEN s.region_id = student_reg THEN 15 ELSE 0 END -- Region bonus
        ))
      )::INT 
    END AS match_score,
    s.contact_email,
    s.contact_phone,
    a.ai_generated_letter,
    a.final_letter,
    a.documents_attached
  FROM applications a
  JOIN schools s ON a.school_id = s.id
  LEFT JOIN districts d ON s.district_id = d.id
  LEFT JOIN regions r ON s.region_id = r.id
  WHERE a.student_id = student_uuid
  ORDER BY a.created_at DESC;
END;
$$ LANGUAGE plpgsql;
