create or replace function public.submit_listing(
  p_kind public.listing_kind, p_category public.listing_category, p_title text, p_description text,
  p_price numeric, p_currency text, p_location text, p_image_url text, p_message text
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_listing uuid; v_deal uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if char_length(trim(p_title)) not between 4 and 120 then raise exception 'Invalid title'; end if;
  if p_price < 0 then raise exception 'Invalid price'; end if;
  if p_kind = 'rent' and p_category not in ('house','car','office') then raise exception 'This category cannot be rented'; end if;
  insert into public.listings(owner_id,kind,category,title,description,price,currency,location,image_url,status)
  values(auth.uid(),p_kind,p_category,trim(p_title),coalesce(p_description,''),p_price,upper(trim(p_currency)),coalesce(p_location,''),nullif(p_image_url,''),'pending') returning id into v_listing;
  insert into public.deals(listing_id,client_id,side,status,offer_amount,currency) values(v_listing,auth.uid(),'sell','open',null,upper(trim(p_currency))) returning id into v_deal;
  insert into public.deal_messages(deal_id,sender_id,from_broker,body) values(v_deal,auth.uid(),false,trim(p_message));
  return v_deal;
end; $$;
revoke all on function public.submit_listing(public.listing_kind,public.listing_category,text,text,numeric,text,text,text,text) from public;
grant execute on function public.submit_listing(public.listing_kind,public.listing_category,text,text,numeric,text,text,text,text) to authenticated;

create or replace function public.create_buyer_deal(p_listing uuid,p_message text,p_offer numeric,p_email text,p_phone text,p_start date,p_end date)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_deal uuid; v_kind listing_kind; v_currency text; v_status listing_status;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select kind,currency,status into v_kind,v_currency,v_status from public.listings where id=p_listing;
  if v_status <> 'active' then raise exception 'Listing is not available'; end if;
  if v_kind='rent' and (p_start is null or p_end is null or p_start > p_end) then raise exception 'Valid rental dates are required'; end if;
  insert into public.deals(listing_id,client_id,side,status,offer_amount,currency,contact_email,contact_phone,start_date,end_date)
  values(p_listing,auth.uid(),'buy','open',p_offer,upper(v_currency),nullif(trim(p_email),''),nullif(trim(p_phone),''),p_start,p_end) returning id into v_deal;
  insert into public.deal_messages(deal_id,sender_id,from_broker,body,offer_amount) values(v_deal,auth.uid(),false,trim(p_message),p_offer);
  return v_deal;
end; $$;
revoke all on function public.create_buyer_deal(uuid,text,numeric,text,text,date,date) from public;
grant execute on function public.create_buyer_deal(uuid,text,numeric,text,text,date,date) to authenticated;
