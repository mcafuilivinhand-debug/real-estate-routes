-- Publicly viewable, unlisted image links for asset consideration requests.
-- Photos are not listings: the broker decides whether to add them to a listing.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'asset-request-photos',
  'asset-request-photos',
  true,
  8388608,
  array['image/jpeg','image/png','image/webp','image/gif']::text[]
)
on conflict (id) do update
set public = true,
    file_size_limit = 8388608,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif']::text[];

drop policy if exists asset_request_photos_public_read on storage.objects;
create policy asset_request_photos_public_read
on storage.objects for select
using (bucket_id = 'asset-request-photos');

drop policy if exists asset_request_photos_public_upload on storage.objects;
create policy asset_request_photos_public_upload
on storage.objects for insert to anon, authenticated
with check (
  bucket_id = 'asset-request-photos'
  and (storage.foldername(name))[1] = 'requests'
  and lower(storage.extension(name)) in ('jpg','jpeg','png','webp','gif')
);
