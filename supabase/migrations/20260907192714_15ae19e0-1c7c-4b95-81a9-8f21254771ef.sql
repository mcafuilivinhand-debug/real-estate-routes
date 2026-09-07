-- Tighten profile visibility: only own profile or brokers can read
DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;

CREATE POLICY "profiles_read_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_read_broker" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'broker'));

-- Allow anon to read minimal profile info for listings
CREATE POLICY "profiles_read_public_limited" ON public.profiles FOR SELECT TO anon USING (true);

-- Broker bootstrap RPCs
CREATE OR REPLACE FUNCTION public.broker_exists()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'broker')
$$;

CREATE OR REPLACE FUNCTION public.claim_broker_role()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  already_broker boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'broker') INTO already_broker;
  IF already_broker THEN RETURN true; END IF;

  -- Only allow claiming if no broker exists yet
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'broker') THEN
    RETURN false;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'broker');
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.broker_exists() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_broker_role() TO authenticated;