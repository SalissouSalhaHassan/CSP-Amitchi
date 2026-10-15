-- Allow the same employee matricule in different schools.
-- The import flow scopes employees by (school_id, emp_id), so emp_id must not be globally unique.

DO $$
DECLARE
  constraint_record record;
BEGIN
  FOR constraint_record IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'employees'
      AND c.contype = 'u'
      AND (
        SELECT array_agg(a.attname ORDER BY ord.ordinality)
        FROM unnest(c.conkey) WITH ORDINALITY AS ord(attnum, ordinality)
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ord.attnum
      ) = ARRAY['emp_id']
  LOOP
    EXECUTE format('ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'employees'
      AND c.contype = 'u'
      AND (
        SELECT array_agg(a.attname ORDER BY ord.ordinality)
        FROM unnest(c.conkey) WITH ORDINALITY AS ord(attnum, ordinality)
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ord.attnum
      ) = ARRAY['school_id', 'emp_id']
  ) THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT employees_school_id_emp_id_unique UNIQUE (school_id, emp_id);
  END IF;
END $$;
