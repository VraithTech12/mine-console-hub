ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS minecraft_username text;

CREATE POLICY "Users create their own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);