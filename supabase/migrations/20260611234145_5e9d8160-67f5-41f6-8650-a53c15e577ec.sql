
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Receipts
CREATE TABLE public.receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id text NOT NULL UNIQUE,
  org_name text NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  receipt_date date NOT NULL,
  note text,
  file_url text,
  file_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.receipts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.receipts TO authenticated;
GRANT ALL ON public.receipts TO service_role;

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view receipts"
ON public.receipts FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins can insert receipts"
ON public.receipts FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update receipts"
ON public.receipts FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete receipts"
ON public.receipts FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_receipts_updated_at
BEFORE UPDATE ON public.receipts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies for receipts bucket (bucket created via tool)
CREATE POLICY "Public can read receipt files"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'receipts');

CREATE POLICY "Admins can upload receipt files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipts' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update receipt files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'receipts' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete receipt files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'receipts' AND public.has_role(auth.uid(), 'admin'));
