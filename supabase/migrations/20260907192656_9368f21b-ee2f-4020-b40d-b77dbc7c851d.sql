-- Revoke direct execution of has_role helper
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;

-- Deal workflow enums
CREATE TYPE public.deal_status AS ENUM ('inquiry','negotiating','agreed','closed','cancelled');
CREATE TYPE public.deal_side AS ENUM ('buying','selling','renting','letting');

CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broker_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  side public.deal_side NOT NULL,
  status public.deal_status NOT NULL DEFAULT 'inquiry',
  offer_amount NUMERIC(14,2),
  currency TEXT NOT NULL DEFAULT 'USD',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deals TO authenticated;
GRANT ALL ON public.deals TO service_role;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deals_select_participants" ON public.deals FOR SELECT TO authenticated USING (
  auth.uid() = client_id OR auth.uid() = broker_id OR public.has_role(auth.uid(),'broker')
);
CREATE POLICY "deals_insert_client" ON public.deals FOR INSERT TO authenticated WITH CHECK (auth.uid() = client_id);
CREATE POLICY "deals_update_participants" ON public.deals FOR UPDATE TO authenticated USING (
  auth.uid() = client_id OR auth.uid() = broker_id OR public.has_role(auth.uid(),'broker')
) WITH CHECK (
  auth.uid() = client_id OR auth.uid() = broker_id OR public.has_role(auth.uid(),'broker')
);
CREATE POLICY "deals_delete_participants" ON public.deals FOR DELETE TO authenticated USING (
  auth.uid() = client_id OR auth.uid() = broker_id OR public.has_role(auth.uid(),'broker')
);

CREATE INDEX deals_client_idx ON public.deals (client_id, created_at DESC);
CREATE INDEX deals_broker_idx ON public.deals (broker_id, created_at DESC);
CREATE INDEX deals_listing_idx ON public.deals (listing_id, created_at DESC);

CREATE TABLE public.deal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.deal_messages TO authenticated;
GRANT ALL ON public.deal_messages TO service_role;
ALTER TABLE public.deal_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deal_messages_select_participants" ON public.deal_messages FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_id AND (auth.uid() = d.client_id OR auth.uid() = d.broker_id OR public.has_role(auth.uid(),'broker'))
  )
);
CREATE POLICY "deal_messages_insert_participants" ON public.deal_messages FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_id AND (auth.uid() = d.client_id OR auth.uid() = d.broker_id OR public.has_role(auth.uid(),'broker'))
  )
);

CREATE INDEX deal_messages_deal_idx ON public.deal_messages (deal_id, created_at DESC);

-- Broker listing management policy
CREATE POLICY "brokers manage all listings" ON public.listings
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'broker'))
WITH CHECK (public.has_role(auth.uid(),'broker'));

-- Updated_at trigger for deals
CREATE TRIGGER trg_deals_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();