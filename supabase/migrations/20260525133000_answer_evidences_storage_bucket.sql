insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'answer-evidences',
  'answer-evidences',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.oasis.opendocument.text',
    'application/rtf',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel.sheet.macroEnabled.12',
    'application/vnd.ms-excel.sheet.binary.macroEnabled.12',
    'text/csv',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint.slideshow.macroEnabled.12',
    'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
    'application/vnd.oasis.opendocument.presentation',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/tiff',
    'image/svg+xml',
    'image/heic',
    'image/heif'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "authenticated can read answer evidence files" on storage.objects;
drop policy if exists "authenticated can upload answer evidence files" on storage.objects;
drop policy if exists "authenticated can update answer evidence files" on storage.objects;
drop policy if exists "authenticated can delete answer evidence files" on storage.objects;

create policy "authenticated can read answer evidence files"
  on storage.objects for select to authenticated
  using (bucket_id = 'answer-evidences');

create policy "authenticated can upload answer evidence files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'answer-evidences');

create policy "authenticated can update answer evidence files"
  on storage.objects for update to authenticated
  using (bucket_id = 'answer-evidences')
  with check (bucket_id = 'answer-evidences');

create policy "authenticated can delete answer evidence files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'answer-evidences');
