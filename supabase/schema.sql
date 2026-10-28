-- WG WindFarm Winner v1.0 — dedicated, separate Supabase project only.
-- Run in the NEW Supabase project. Never apply to the Mech-Freunde project.
-- Player emails remain exclusively in Supabase Auth, never in public profiles.

create table if not exists public.wfw_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default 'Fund Manager'
    check (char_length(nickname) between 3 and 30),
  leaderboard_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.wfw_runs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot jsonb not null,
  completed boolean not null default false,
  score numeric(9,3),
  multiple numeric(10,4),
  exit_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wfw_snapshot_limit check (octet_length(snapshot::text) < 120000),
  constraint wfw_score_limit check (score is null or score between -95 and 800),
  constraint wfw_multiple_limit check (multiple is null or multiple between 0 and 100),
  constraint wfw_exit_count_limit check (exit_count between 0 and 100)
);
create index if not exists wfw_runs_owner_idx on public.wfw_runs (user_id,updated_at desc);
create index if not exists wfw_runs_best_idx on public.wfw_runs (completed,score desc) where completed;

alter table public.wfw_profiles enable row level security;
alter table public.wfw_runs enable row level security;

revoke all on public.wfw_profiles,public.wfw_runs from anon;
grant select,insert,update on public.wfw_profiles to authenticated;
grant select,insert,update on public.wfw_runs to authenticated;

create policy "Players read only their own profiles" on public.wfw_profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Players create only their own profiles" on public.wfw_profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Players update only their own profiles" on public.wfw_profiles
  for update to authenticated using ((select auth.uid())=user_id)
  with check ((select auth.uid())=user_id);
create policy "Players read only their own runs" on public.wfw_runs
  for select to authenticated using ((select auth.uid())=user_id);
create policy "Players create only their own runs" on public.wfw_runs
  for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Players update only their own runs" on public.wfw_runs
  for update to authenticated using ((select auth.uid())=user_id)
  with check ((select auth.uid())=user_id);

-- Keep updated timestamps server-controlled, and prevent ownership transfers.
create or replace function public.wfw_touch_update()
returns trigger language plpgsql set search_path='' as $$
begin
  new.updated_at=now();
  if tg_op='UPDATE' and new.user_id is distinct from old.user_id then
    raise exception 'Cannot transfer ownership';
  end if;
  return new;
end $$;
create trigger wfw_profile_touch before update on public.wfw_profiles
  for each row execute function public.wfw_touch_update();
create trigger wfw_run_touch before update on public.wfw_runs
  for each row execute function public.wfw_touch_update();

-- Create a private profile for newly registered players (no public leaderboard opt-in).
create or replace function public.wfw_create_profile()
returns trigger language plpgsql security definer set search_path='' as $$
declare display_name text;
begin
  display_name=left(trim(coalesce(new.raw_user_meta_data->>'nickname','')) ,30);
  if char_length(display_name)<3 then display_name='Fund Manager'; end if;
  insert into public.wfw_profiles(user_id,nickname)
    values(new.id,display_name) on conflict(user_id) do nothing;
  return new;
end $$;
create trigger wfw_auth_user_profile after insert on auth.users
  for each row execute function public.wfw_create_profile();

-- Public leaderboard is a narrow, opt-in view; never includes emails or snapshots.
-- Note: the demo submits browser-calculated scores, so the leaderboard is for
-- friendly competition, not a tamper-proof financial contest.
create or replace function public.wfw_leaderboard()
returns table(nickname text,lp_irr numeric,multiple numeric,exits integer)
language sql stable security definer set search_path='' as $$
  select best.nickname,best.lp_irr,best.multiple,best.exits from (
    select distinct on (r.user_id) p.nickname, r.score as lp_irr,
      r.multiple, r.exit_count as exits, r.user_id
    from public.wfw_runs r join public.wfw_profiles p on p.user_id=r.user_id
    where r.completed=true and r.score is not null and p.leaderboard_opt_in=true
    order by r.user_id,r.score desc,r.updated_at desc
  ) best order by best.lp_irr desc,best.multiple desc limit 50;
$$;
-- Intentional guest-visible, read-only ranking: only opted-in nicknames and
-- completed fund scores are returned by the tightly scoped SECURITY DEFINER RPC.
-- Private profiles and fund snapshots remain protected by RLS.
revoke all on function public.wfw_leaderboard() from public;
grant execute on function public.wfw_leaderboard() to anon, authenticated;
-- Admin-maintained score verification can replace browser scoring before
-- running a prize-linked or high-stakes competition.
