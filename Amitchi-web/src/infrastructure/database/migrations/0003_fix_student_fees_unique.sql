-- Migration: Fix duplicate student_fees rows
-- Step 1: Delete duplicate fee rows, keeping only the one with highest totalPaid per (student_id, session_id)
-- Step 2: Add UNIQUE constraint to prevent future duplicates

-- 1. Remove duplicates: keep the row with the highest totalPaid (or lowest id as tie-break)
DELETE FROM student_fees
WHERE id NOT IN (
  SELECT DISTINCT ON (student_id, session_id)
    id
  FROM student_fees
  ORDER BY student_id, session_id, total_paid DESC NULLS LAST, id ASC
);

-- 2. Add the unique constraint so duplicates can never happen again
ALTER TABLE student_fees
  ADD CONSTRAINT student_fees_student_session_unique
  UNIQUE (student_id, session_id);
