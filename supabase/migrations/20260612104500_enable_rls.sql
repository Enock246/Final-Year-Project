-- ==========================================
-- ENABLE ROW LEVEL SECURITY
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- PUBLIC READ-ONLY POLICIES
-- ==========================================

-- Regions, Districts, and Schools should be readable by anyone (including anon for the splash screen)
CREATE POLICY "Public can view regions" 
  ON regions FOR SELECT 
  USING (true);

CREATE POLICY "Public can view districts" 
  ON districts FOR SELECT 
  USING (true);

CREATE POLICY "Public can view schools" 
  ON schools FOR SELECT 
  USING (true);

CREATE POLICY "Public can view school semesters" 
  ON school_semesters FOR SELECT 
  USING (true);

CREATE POLICY "Public can view reviews" 
  ON reviews FOR SELECT 
  USING (true);

-- ==========================================
-- AUTHENTICATED USER POLICIES
-- ==========================================

-- Students can only view their own core record
CREATE POLICY "Users view own student record"
  ON students FOR SELECT
  USING (auth.uid() = id);

-- Students can only update their own core record
CREATE POLICY "Users update own student record"
  ON students FOR UPDATE
  USING (auth.uid() = id);

-- Students can insert their own core record (e.g. during onboarding if triggered by app)
CREATE POLICY "Users insert own student record"
  ON students FOR INSERT
  WITH CHECK (auth.uid() = id);


-- Student Profiles
CREATE POLICY "Users view own profile"
  ON student_profiles FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Users update own profile"
  ON student_profiles FOR UPDATE
  USING (auth.uid() = student_id);

CREATE POLICY "Users insert own profile"
  ON student_profiles FOR INSERT
  WITH CHECK (auth.uid() = student_id);


-- Applications
CREATE POLICY "Users view own applications"
  ON applications FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Users insert own applications"
  ON applications FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Only allow update if the user owns the application (for example, to withdraw)
CREATE POLICY "Users update own applications"
  ON applications FOR UPDATE
  USING (auth.uid() = student_id);

-- Note: We are not allowing users to delete applications (soft-delete or admin-only via UI design)

-- ==========================================
-- ADMIN/SYSTEM POLICIES
-- ==========================================
-- Note: Service Role key bypasses RLS, so we don't strictly need admin policies 
-- for automated sync scripts, but if we had an admin UI using standard auth, 
-- we would add role-based policies here.
