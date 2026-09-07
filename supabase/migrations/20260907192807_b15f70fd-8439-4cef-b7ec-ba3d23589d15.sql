ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS contact_phone TEXT;

ALTER TABLE public.deal_messages RENAME COLUMN message TO body;
ALTER TABLE public.deal_messages ADD COLUMN IF NOT EXISTS from_broker BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.deal_messages ADD COLUMN IF NOT EXISTS offer_amount NUMERIC(14,2);