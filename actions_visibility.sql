alter table if exists public.actions
  add column if not exists visibility text default 'Shared';

alter table if exists public.actions
  add column if not exists owner_user_id uuid;

update public.actions
set visibility = 'Shared'
where visibility is null or btrim(visibility) = '';
