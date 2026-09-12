CREATE TYPE public.app_role AS ENUM ('owner','admin','member');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.pending_role_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz
);
GRANT SELECT ON public.pending_role_grants TO authenticated;
GRANT ALL ON public.pending_role_grants TO service_role;
ALTER TABLE public.pending_role_grants ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('owner','admin'));
$$;

-- Applies a pending invitation (and refreshes the profile) for the signed-in user.
CREATE OR REPLACE FUNCTION public.claim_pending_role()
RETURNS public.app_role LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  uemail text;
  verified boolean;
  granted public.app_role;
BEGIN
  IF uid IS NULL THEN RETURN NULL; END IF;
  SELECT lower(email), email_confirmed_at IS NOT NULL INTO uemail, verified FROM auth.users WHERE id = uid;
  IF uemail IS NULL THEN RETURN NULL; END IF;

  INSERT INTO public.profiles (id, email) VALUES (uid, uemail)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

  IF NOT verified THEN RETURN NULL; END IF;

  SELECT role INTO granted FROM public.pending_role_grants
   WHERE lower(email) = uemail AND claimed_at IS NULL;

  IF granted IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (uid, granted)
    ON CONFLICT (user_id, role) DO NOTHING;
    UPDATE public.pending_role_grants SET claimed_at = now() WHERE lower(email) = uemail AND claimed_at IS NULL;
  END IF;
  RETURN granted;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_pending_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_pending_role() TO authenticated;

CREATE POLICY "Users read their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'owner'));
CREATE POLICY "Owners read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(),'owner'));
CREATE POLICY "Owners read invitations" ON public.pending_role_grants
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'owner'));

-- Staff (owner/admin) may manage the paired server alongside its pairing account.
CREATE POLICY "Staff manage agents" ON public.agents
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage commands" ON public.agent_commands
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff read console" ON public.console_lines
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff delete console" ON public.console_lines
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage pairing codes" ON public.pairing_codes
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

INSERT INTO public.pending_role_grants (email, role) VALUES ('morgan-r7greenwood@hotmail.com','owner');