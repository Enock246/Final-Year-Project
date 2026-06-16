-- Enable PostGIS extension for geolocation features
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- CUSTOM ENUMS
-- ==========================================
CREATE TYPE transport_mode AS ENUM ('OWN', 'PUBLIC', 'ARRANGE', 'WALKING');
CREATE TYPE application_status AS ENUM ('PENDING', 'DELIVERED', 'OPENED', 'ACCEPTED', 'REJECTED');

-- ==========================================
-- LOOKUP TABLES
-- ==========================================

-- Regions (e.g., Bono Region, Ashanti Region)
CREATE TABLE regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE
);

-- Districts (e.g., Sunyani Municipal)
CREATE TABLE districts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    UNIQUE (region_id, name)
);

-- ==========================================
-- USER AND PROFILE TABLES
-- ==========================================

-- Students (Extends Supabase auth.users)
CREATE TABLE students (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE CHECK (email ~* '^[A-Za-z0-9._+%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$'),
    phone_number VARCHAR(20) NOT NULL,
    student_id VARCHAR(50) NOT NULL UNIQUE, -- e.g., IT/ED/2023/001
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student Profiles (Preferences and Documents)
CREATE TABLE student_profiles (
    student_id UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
    region_id UUID REFERENCES regions(id),
    district_id UUID REFERENCES districts(id),
    town_city VARCHAR(100),
    location GEOGRAPHY(POINT, 4326), -- For exact GPS location
    transport_preference transport_mode,
    max_commute_minutes INT, -- Stored as 30, 60, 90, 120
    key_skills_and_offerings TEXT[], -- e.g., '["Willing to help with BECE prep", "Strong coding skills"]' to boost acceptance chances
    cv_file_path VARCHAR(500),
    transcript_file_path VARCHAR(500),
    placement_letter_path VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- SCHOOL TABLES
-- ==========================================

-- Schools
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    region_id UUID NOT NULL REFERENCES regions(id),
    district_id UUID NOT NULL REFERENCES districts(id),
    town_city VARCHAR(100) NOT NULL,
    location GEOGRAPHY(POINT, 4326),
    
    -- Contact Info
    headmaster_name VARCHAR(255),
    coordinator_name VARCHAR(255), -- e.g., ICT Coordinator
    contact_email VARCHAR(255) CHECK (contact_email ~* '^[A-Za-z0-9._+%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$'),
    contact_phone VARCHAR(20),
    
    -- Placement Data
    requirements TEXT,
    expected_interns INT DEFAULT 4,
    last_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- School Semesters (To track which semesters the school accepts interns)
CREATE TABLE school_semesters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    semester_name VARCHAR(100) NOT NULL, -- e.g., 'Semester 1 (Jan-Apr)'
    is_available BOOLEAN DEFAULT TRUE,
    UNIQUE (school_id, semester_name)
);

-- Insider Reviews / Tips
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_name_masked VARCHAR(100) NOT NULL, -- e.g., 'Abena M.'
    student_year INT NOT NULL,
    is_accepted BOOLEAN NOT NULL,
    tip_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- APPLICATION TABLE
-- ==========================================

-- Applications
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    
    -- Application state & tracking
    status application_status DEFAULT 'PENDING',
    generated_letter_text TEXT NOT NULL,
    
    -- Document snapshots at time of application
    cv_snapshot_path VARCHAR(500),
    transcript_snapshot_path VARCHAR(500),
    
    -- Match Context
    match_score_at_time INT, -- Historical record of score when applied
    
    -- Tracking Timestamps
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent applying to the same school multiple times in a short window
    UNIQUE (student_id, school_id) 
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

-- Geospatial Indexes (Crucial for the "Nearby Schools" queries)
CREATE INDEX idx_student_profiles_location ON student_profiles USING GIST (location);
CREATE INDEX idx_schools_location ON schools USING GIST (location);

-- Foreign Key B-Tree Indexes
CREATE INDEX idx_districts_region ON districts(region_id);
CREATE INDEX idx_schools_region_district ON schools(region_id, district_id);
CREATE INDEX idx_applications_student ON applications(student_id);
CREATE INDEX idx_applications_school ON applications(school_id);
CREATE INDEX idx_reviews_school ON reviews(school_id);

-- Filtering & Sorting Indexes
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_schools_verified ON schools(last_verified_at DESC);
