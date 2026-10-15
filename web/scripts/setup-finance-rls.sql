-- 1. Helper function to check if user is authorized for financial operations
CREATE OR REPLACE FUNCTION public.is_finance_authorized()
RETURNS boolean AS $$
  DECLARE
    res boolean;
  BEGIN
    SELECT COALESCE(
      u.admin OR 
      u.super_admin OR 
      r.role_name IN ('Directeur', 'Administrateur', 'Admin', 'FINANCE', 'Comptable'), 
      false
    )
    INTO res
    FROM public.users u
    LEFT JOIN public.roles r ON u.role_id = r.id
    WHERE u.supabase_id = auth.uid()::text LIMIT 1;
    
    RETURN COALESCE(res, false);
  END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Enable RLS on finance tables
ALTER TABLE IF EXISTS public.student_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fee_payments ENABLE ROW LEVEL SECURITY;

-- 3. Define Policies for student_fees
DROP POLICY IF EXISTS student_fees_select ON public.student_fees;
CREATE POLICY student_fees_select ON public.student_fees
FOR SELECT
USING (
  school_id = get_my_school_id() AND is_finance_authorized()
);

DROP POLICY IF EXISTS student_fees_insert ON public.student_fees;
CREATE POLICY student_fees_insert ON public.student_fees
FOR INSERT
WITH CHECK (
  school_id = get_my_school_id() AND is_finance_authorized()
);

DROP POLICY IF EXISTS student_fees_update ON public.student_fees;
CREATE POLICY student_fees_update ON public.student_fees
FOR UPDATE
USING (
  school_id = get_my_school_id() AND is_finance_authorized()
)
WITH CHECK (
  school_id = get_my_school_id() AND is_finance_authorized()
);

DROP POLICY IF EXISTS student_fees_delete ON public.student_fees;
CREATE POLICY student_fees_delete ON public.student_fees
FOR DELETE
USING (
  school_id = get_my_school_id() AND is_admin_or_director()
);

-- 4. Define Policies for fee_payments
DROP POLICY IF EXISTS fee_payments_select ON public.fee_payments;
CREATE POLICY fee_payments_select ON public.fee_payments
FOR SELECT
USING (
  school_id = get_my_school_id() AND is_finance_authorized()
);

DROP POLICY IF EXISTS fee_payments_insert ON public.fee_payments;
CREATE POLICY fee_payments_insert ON public.fee_payments
FOR INSERT
WITH CHECK (
  school_id = get_my_school_id() AND is_finance_authorized()
);

DROP POLICY IF EXISTS fee_payments_update ON public.fee_payments;
CREATE POLICY fee_payments_update ON public.fee_payments
FOR UPDATE
USING (
  school_id = get_my_school_id() AND is_finance_authorized()
)
WITH CHECK (
  school_id = get_my_school_id() AND is_finance_authorized()
);

DROP POLICY IF EXISTS fee_payments_delete ON public.fee_payments;
CREATE POLICY fee_payments_delete ON public.fee_payments
FOR DELETE
USING (
  school_id = get_my_school_id() AND is_admin_or_director()
);

-- 5. Update Policies for students table to allow FINANCE role to view student records
DROP POLICY IF EXISTS students_select ON public.students;
CREATE POLICY students_select ON public.students 
FOR SELECT 
USING (
  school_id = get_my_school_id() AND (
    is_finance_authorized() OR 
    classe IN (
      SELECT c.class_name FROM public.school_classes c 
      JOIN public.class_subjects cs ON c.id = cs.class_id
      WHERE cs.employee_id = get_my_employee_id()
    )
  )
);
