-- ==========================================
-- SEED DATA: REGIONS
-- ==========================================
INSERT INTO regions (id, name) VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Bono Region'),
  ('11111111-1111-1111-1111-222222222222', 'Ahafo Region'),
  ('11111111-1111-1111-1111-333333333333', 'Ashanti Region'),
  ('11111111-1111-1111-1111-444444444444', 'Greater Accra Region')
ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- SEED DATA: DISTRICTS
-- ==========================================
INSERT INTO districts (id, region_id, name) VALUES 
  ('22222222-2222-2222-2222-111111111111', '11111111-1111-1111-1111-111111111111', 'Sunyani Municipal'),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Sunyani West'),
  ('22222222-2222-2222-2222-333333333333', '11111111-1111-1111-1111-222222222222', 'Tano South Municipal')
ON CONFLICT (region_id, name) DO NOTHING;

-- ==========================================
-- SEED DATA: SCHOOLS
-- ==========================================
-- Sunyani SHS
INSERT INTO schools (id, name, region_id, district_id, town_city, location, headmaster_name, coordinator_name, contact_email, contact_phone, requirements, expected_interns, last_verified_at) VALUES 
  (
    '33333333-3333-3333-3333-111111111111', 
    'Sunyani Senior High School', 
    '11111111-1111-1111-1111-111111111111', 
    '22222222-2222-2222-2222-111111111111', 
    'Sunyani', 
    ST_SetSRID(ST_MakePoint(-1.5906, 7.3349), 4326), 
    'Mr. Isaac Owusu', 
    'Mr. Benjamin Mensah', 
    'ict@sunyani-shs.edu.gh', 
    '0244-123-456', 
    'IT Education background, Available 5 days/week, Teach JHS 1-3 ICT', 
    6, 
    NOW()
  ),
  -- Fiapre SHS
  (
    '33333333-3333-3333-3333-222222222222', 
    'Fiapre Senior High School', 
    '11111111-1111-1111-1111-111111111111', 
    '22222222-2222-2222-2222-222222222222', 
    'Fiapre', 
    ST_SetSRID(ST_MakePoint(-1.6050, 7.3520), 4326), 
    'Mrs. Akosua Serwaa', 
    'Mr. Samuel Kusi', 
    'info@fiapreshs.edu.gh', 
    '0200-987-654', 
    'Help with SHS elective ICT', 
    4, 
    NOW()
  ),
  -- Bechem Presbyterian SHS
  (
    '33333333-3333-3333-3333-333333333333', 
    'Bechem Presbyterian SHS', 
    '11111111-1111-1111-1111-222222222222', 
    '22222222-2222-2222-2222-333333333333', 
    'Bechem', 
    ST_SetSRID(ST_MakePoint(-2.0300, 7.0900), 4326), 
    'Rev. Peter K. Asare', 
    'Mr. Emmanuel Yeboah', 
    'admin@bechempresec.edu.gh', 
    '0244-111-222', 
    'Looking for highly motivated students', 
    8, 
    NOW()
  );

-- ==========================================
-- SEED DATA: REVIEWS
-- ==========================================
INSERT INTO reviews (school_id, student_name_masked, student_year, is_accepted, tip_text) VALUES 
  ('33333333-3333-3333-3333-111111111111', 'Abena M.', 2024, true, 'Apply early - they fill slots by mid-Nov'),
  ('33333333-3333-3333-3333-111111111111', 'Yaw K.', 2023, true, 'Mention you''re from Sunyani, they prefer local students who won''t have transport issues'),
  ('33333333-3333-3333-3333-111111111111', 'Ama D.', 2024, true, 'Go through Mr. Mensah (ICT Coord), not the headmaster. He handles interns directly'),
  ('33333333-3333-3333-3333-111111111111', 'Kofi A.', 2023, true, 'They need help with BECE ICT prep - offer to run extra classes, big plus!'),
  ('33333333-3333-3333-3333-222222222222', 'Kwaku P.', 2023, true, 'Apply directly to ICT coordinator');
