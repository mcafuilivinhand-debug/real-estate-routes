DROP POLICY "profiles_read_all" ON public.profiles;
CREATE POLICY "profiles read own" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "brokers read profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'broker'));

-- One-time bootstrap: the first signed-in user may claim the broker account
CREATE OR REPLACE FUNCTION public.claim_broker_role()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE existing int;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  SELECT count(*) INTO existing FROM public.user_roles WHERE role = 'broker';
  IF existing > 0 THEN RETURN false; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'broker')
  ON CONFLICT DO NOTHING;
  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.claim_broker_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_broker_role() TO authenticated;

CREATE OR REPLACE FUNCTION public.broker_exists()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'broker')
$$;
REVOKE EXECUTE ON FUNCTION public.broker_exists() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.broker_exists() TO authenticated;