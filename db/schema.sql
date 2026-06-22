-- ============================================================================
-- Spent — Supabase schema
-- Run this in the Supabase dashboard → SQL Editor → New query → Run.
-- Safe to re-run; it uses "if not exists" / "or replace" where possible.
-- ============================================================================

-- ── profiles ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles readable by authenticated" on public.profiles;
create policy "profiles readable by authenticated"
  on public.profiles for select to authenticated using (true);

drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile"
  on public.profiles for update to authenticated using (auth.uid() = id);

-- ── expenses ────────────────────────────────────────────────────────────────
create table if not exists public.expenses (
  id text primary key,  -- client-generated id, lets us mirror local <-> cloud
  user_id uuid references auth.users on delete cascade not null,
  amount numeric not null,
  category text not null,
  description text,
  date date not null,
  created_at timestamptz default now()
);

alter table public.expenses enable row level security;

-- Users can only read/write their OWN expense rows. This is what makes the
-- leaderboard "totals only": friends can never select another user's rows.
drop policy if exists "manage own expenses" on public.expenses;
create policy "manage own expenses"
  on public.expenses for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── friendships ─────────────────────────────────────────────────────────────
create table if not exists public.friendships (
  id uuid default gen_random_uuid() primary key,
  requester uuid references auth.users on delete cascade not null,
  addressee uuid references auth.users on delete cascade not null,
  status text not null default 'pending',  -- 'pending' | 'accepted'
  created_at timestamptz default now(),
  unique (requester, addressee)
);

alter table public.friendships enable row level security;

drop policy if exists "see own friendships" on public.friendships;
create policy "see own friendships"
  on public.friendships for select to authenticated
  using (auth.uid() = requester or auth.uid() = addressee);

drop policy if exists "create friend requests" on public.friendships;
create policy "create friend requests"
  on public.friendships for insert to authenticated
  with check (auth.uid() = requester);

drop policy if exists "update own friendships" on public.friendships;
create policy "update own friendships"
  on public.friendships for update to authenticated
  using (auth.uid() = requester or auth.uid() = addressee);

drop policy if exists "delete own friendships" on public.friendships;
create policy "delete own friendships"
  on public.friendships for delete to authenticated
  using (auth.uid() = requester or auth.uid() = addressee);

-- ── leaderboard: totals only ────────────────────────────────────────────────
-- SECURITY DEFINER so it can sum expenses across accepted friends, but it only
-- ever returns aggregated TOTALS — never individual expense rows.
create or replace function public.get_friend_totals(range_start date)
returns table (user_id uuid, username text, display_name text, total numeric)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.username,
    p.display_name,
    coalesce(sum(e.amount), 0) as total
  from public.profiles p
  left join public.expenses e
    on e.user_id = p.id and e.date >= range_start
  where
    p.id = auth.uid()
    or p.id in (
      select case when f.requester = auth.uid() then f.addressee else f.requester end
      from public.friendships f
      where f.status = 'accepted'
        and (f.requester = auth.uid() or f.addressee = auth.uid())
    )
  group by p.id, p.username, p.display_name;
$$;
