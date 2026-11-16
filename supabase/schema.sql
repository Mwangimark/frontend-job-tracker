-- Job alerts: run this once in the Supabase SQL editor (Project → SQL Editor → New query → Run).
--
-- Visitors never read or write the table directly. Row Level Security is on with no
-- policies, so the public (anon) key can only call the two functions below. The daily
-- GitHub Actions job reads subscribers with the service-role key, which bypasses RLS.

create extension if not exists pgcrypto;

create table if not exists public.subscribers (
  id                uuid primary key default gen_random_uuid(),
  email             text not null unique,
  roles             text[] not null,
  kenya_only        boolean not null default false,
  frequency         text not null default 'daily' check (frequency in ('daily', 'weekly')),
  unsubscribe_token uuid not null default gen_random_uuid() unique,
  active            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  last_sent_at      timestamptz
);

alter table public.subscribers enable row level security;
revoke all on public.subscribers from anon, authenticated;

-- Subscribe, or update preferences if the email is already on the list.
create or replace function public.subscribe(p_email text, p_roles text[], p_kenya_only boolean, p_frequency text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_existing boolean;
begin
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' or length(v_email) > 254 then
    raise exception 'invalid email';
  end if;
  if p_roles is null or cardinality(p_roles) = 0 or cardinality(p_roles) > 20 then
    raise exception 'pick at least one role';
  end if;
  if p_frequency not in ('daily', 'weekly') then
    raise exception 'invalid frequency';
  end if;

  select true into v_existing from subscribers where email = v_email;

  insert into subscribers (email, roles, kenya_only, frequency)
  values (v_email, p_roles, coalesce(p_kenya_only, false), p_frequency)
  on conflict (email) do update
    set roles = excluded.roles, kenya_only = excluded.kenya_only, frequency = excluded.frequency,
        active = true, updated_at = now();

  return case when v_existing then 'updated' else 'subscribed' end;
end;
$$;

-- One-click unsubscribe from the link in every email.
create or replace function public.unsubscribe(p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update subscribers set active = false, updated_at = now() where unsubscribe_token = p_token and active;
  return found;
end;
$$;

revoke all on function public.subscribe(text, text[], boolean, text) from public;
revoke all on function public.unsubscribe(uuid) from public;
grant execute on function public.subscribe(text, text[], boolean, text) to anon;
grant execute on function public.unsubscribe(uuid) to anon;
