
CREATE TABLE public.user_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data"
ON public.user_data FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own data"
ON public.user_data FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own data"
ON public.user_data FOR UPDATE TO authenticated
USING (user_id = auth.uid());
