
-- Table for individual screen permissions per user
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission text NOT NULL,
  UNIQUE (user_id, permission)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Users can view own permissions
CREATE POLICY "Users can view own permissions"
  ON public.user_permissions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all permissions
CREATE POLICY "Admins can view all permissions"
  ON public.user_permissions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert permissions
CREATE POLICY "Admins can insert permissions"
  ON public.user_permissions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can delete permissions
CREATE POLICY "Admins can delete permissions"
  ON public.user_permissions FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Function to get user permissions
CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(permission), '{}')
  FROM public.user_permissions
  WHERE user_id = _user_id
$$;

-- When admin approves a user, grant all permissions by default
CREATE OR REPLACE FUNCTION public.grant_all_permissions(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  perms text[] := ARRAY['dashboard','catalog','shopping','suppliers','materials','extras','products','kits','clients','promotions','financial','logistics'];
  p text;
BEGIN
  FOREACH p IN ARRAY perms LOOP
    INSERT INTO public.user_permissions (user_id, permission)
    VALUES (_user_id, p)
    ON CONFLICT (user_id, permission) DO NOTHING;
  END LOOP;
END;
$$;
