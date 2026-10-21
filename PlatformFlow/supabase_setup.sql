-- PlatformFlow shared cloud storage
create table if not exists public.platformflow_user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  trains jsonb not null default '[]'::jsonb,
  rake_links jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.platformflow_user_state enable row level security;
drop policy if exists "Read own PlatformFlow data" on public.platformflow_user_state;
create policy "Read own PlatformFlow data" on public.platformflow_user_state for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Insert own PlatformFlow data" on public.platformflow_user_state;
create policy "Insert own PlatformFlow data" on public.platformflow_user_state for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Update own PlatformFlow data" on public.platformflow_user_state;
create policy "Update own PlatformFlow data" on public.platformflow_user_state for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update on public.platformflow_user_state to authenticated;
