-- Ottawa Live Parking
-- Authentication profile foundation

create type public.user_role as enum (
  'driver',
  'parking_owner',
  'admin'
);

create table public.profiles (
  id uuid primary key
    references auth.users(id)
    on delete cascade,

  full_name text,

  role public.user_role
    not null
    default 'driver',

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now()
);

alter table public.profiles
enable row level security;

create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (
  (select auth.uid()) = id
);


-- Automatically create a profile for every new authenticated user.
-- New public signups always start as drivers.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    role
  )
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    'driver'::public.user_role
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();