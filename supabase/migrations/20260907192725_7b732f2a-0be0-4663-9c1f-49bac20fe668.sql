ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS end_date DATE;

CREATE OR REPLACE FUNCTION public.check_deal_dates() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL AND NEW.end_date <= NEW.start_date THEN
    RAISE EXCEPTION 'end_date must be after start_date';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_deals_check_dates BEFORE INSERT OR UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.check_deal_dates();