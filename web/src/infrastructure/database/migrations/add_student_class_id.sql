-- Migration: Add class_id column to students table
-- This creates a direct foreign key link between students and schoolClasses
-- which eliminates the text-matching problem in Saisie des Notes

ALTER TABLE students ADD COLUMN IF NOT EXISTS class_id INTEGER REFERENCES school_classes(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS students_class_id_idx ON students(class_id);

-- Auto-populate class_id based on matching students.classe with school_classes.class_name
-- (best-effort update for existing data)
UPDATE students s
SET class_id = sc.id
FROM school_classes sc
WHERE s.school_id = sc.school_id
  AND LOWER(TRIM(s.classe)) = LOWER(TRIM(sc.class_name))
  AND s.class_id IS NULL;
