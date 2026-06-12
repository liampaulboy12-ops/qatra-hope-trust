
CREATE OR REPLACE FUNCTION public.claim_admin_if_first()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  has_any boolean;
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO has_any;
  IF has_any THEN
    RETURN false;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_admin_if_first() TO authenticated;
