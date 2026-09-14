INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'owner'::public.app_role FROM auth.users u
WHERE lower(u.email) = 'morgan07greenwood@hotmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE public.pending_role_grants
SET claimed_at = now()
WHERE lower(email) = 'morgan07greenwood@hotmail.com';

DELETE FROM public.user_roles
WHERE role = 'owner'::public.app_role
  AND user_id IN (SELECT id FROM auth.users WHERE lower(email) = 'morgan-r7greenwood@hotmail.com');

DELETE FROM public.pending_role_grants
WHERE lower(email) = 'morgan-r7greenwood@hotmail.com';