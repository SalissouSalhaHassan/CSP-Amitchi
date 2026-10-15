-- 1. Enable RLS on all relevant tables
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE educational_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;

-- 2. Create helper function to get current user's school_id
CREATE OR REPLACE FUNCTION get_my_school_id()
RETURNS integer AS $$
  SELECT school_id FROM public.users WHERE supabase_id = auth.uid()::text LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. Define Policies for Schools
CREATE POLICY school_isolation_policy ON schools
FOR ALL
USING (id = get_my_school_id());

-- 4. Define Policies for Users
-- Users can see other users in the same school
CREATE POLICY user_isolation_policy ON users
FOR ALL
USING (school_id = get_my_school_id());

-- 5. Define Policies for all other tables
-- We can automate this for tables with school_id column
DO $$
DECLARE
    t text;
    tables_with_school_id text[] := ARRAY[
        'students', 'expense_categories', 'expenses', 'revenue_categories', 
        'revenues', 'pos_sales', 'student_fees', 'fee_payments', 
        'school_sessions', 'academic_periods', 'educational_levels', 
        'school_sections', 'school_classes', 'school_subjects', 
        'class_subjects', 'exams', 'exam_results'
    ];
BEGIN
    FOREACH t IN ARRAY tables_with_school_id LOOP
        EXECUTE format('DROP POLICY IF EXISTS school_isolation_policy ON %I', t);
        EXECUTE format('CREATE POLICY school_isolation_policy ON %I FOR ALL USING (school_id = get_my_school_id())', t);
    END LOOP;
END $$;

-- 6. Special case: Super Admins
-- If superAdmin is true, they might need to see everything.
-- We can update the function or policies to handle this.
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
  SELECT super_admin FROM public.users WHERE supabase_id = auth.uid()::text LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Update function to allow super admins to bypass school filter (optional, but good for platform owners)
CREATE OR REPLACE FUNCTION get_my_school_id_v2()
RETURNS integer AS $$
  DECLARE
    sid integer;
    is_super boolean;
  BEGIN
    SELECT school_id, super_admin INTO sid, is_super FROM public.users WHERE supabase_id = auth.uid()::text LIMIT 1;
    IF is_super THEN
      RETURN NULL; -- Or handle differently
    END IF;
    RETURN sid;
  END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
