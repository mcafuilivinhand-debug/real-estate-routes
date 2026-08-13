REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;

CREATE TYPE public.deal_side AS ENUM ('buy','sell');
CREATE TYPE public.deal_status AS ENUM ('open','negotiating','agreed','closed','declined');

CREATE TABLE public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  side public.deal_side NOT NULL DEFAULT 'buy',
  status public.deal_status NOT NULL DEFAULT 'open',
  offer_amount numeric,
  currency text NOT NULL DEFAULT 'USD',
  contact_email text,
  contact_phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.deals TO authenticated;
GRANT ALL ON public.deals TO service_role;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients read own deals" ON public.deals FOR SELECT TO authenticated USING (client_id = auth.uid());
CREATE POLICY "brokers read all deals" ON public.deals FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'broker'));
CREATE POLICY "clients create deals" ON public.deals FOR INSERT TO authenticated WITH CHECK (client_id = auth.uid());
CREATE POLICY "clients update own deals" ON public.deals FOR UPDATE TO authenticated USING (client_id = auth.uid()) WITH CHECK (client_id = auth.uid());
CREATE POLICY "brokers update deals" ON public.deals FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'broker')) WITH CHECK (public.has_role(auth.uid(),'broker'));

CREATE TABLE public.deal_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_broker boolean NOT NULL DEFAULT false,
  body text NOT NULL,
  offer_amount numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.deal_messages TO authenticated;
GRANT ALL ON public.deal_messages TO service_role;
ALTER TABLE public.deal_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants read messages" ON public.deal_messages FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND (d.client_id = auth.uid() OR public.has_role(auth.uid(),'broker'))));
CREATE POLICY "participants send messages" ON public.deal_messages FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND (d.client_id = auth.uid() OR public.has_role(auth.uid(),'broker'))));

CREATE POLICY "brokers manage listings" ON public.listings FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'broker')) WITH CHECK (public.has_role(auth.uid(),'broker'));

CREATE TRIGGER deals_updated_at BEFORE UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();