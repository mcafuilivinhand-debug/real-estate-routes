ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;

ALTER TABLE public.deals
  ADD CONSTRAINT deals_rental_dates_order CHECK (start_date IS NULL OR end_date IS NULL OR end_date > start_date);