
CREATE POLICY "Service role can delete profiles"
ON public.profiles FOR DELETE TO service_role USING (true);

CREATE POLICY "Service role can delete roles"
ON public.user_roles FOR DELETE TO service_role USING (true);

CREATE POLICY "Service role can insert profiles"
ON public.profiles FOR INSERT TO service_role WITH CHECK (true);
