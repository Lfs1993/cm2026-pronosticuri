create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy if not exists "profiles_select_own_or_all" on public.profiles for select to authenticated using (true);
create policy if not exists "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy if not exists "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id);

create table if not exists public.matches (
  id text primary key,
  stage text not null,
  group_name text,
  matchday int,
  order_index int not null,
  home_team text not null,
  away_team text not null,
  kickoff_at timestamptz not null,
  lock_at timestamptz not null,
  venue text,
  home_score int,
  away_score int,
  is_finished boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.matches enable row level security;
create policy if not exists "matches_public_read" on public.matches for select to authenticated using (true);
create policy if not exists "matches_admin_update" on public.matches for update to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

create table if not exists public.predictions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  match_id text not null references public.matches(id) on delete cascade,
  predicted_home int not null check (predicted_home >= 0),
  predicted_away int not null check (predicted_away >= 0),
  submitted_at timestamptz not null default now(),
  unique(user_id, match_id)
);
alter table public.predictions enable row level security;
create policy if not exists "predictions_read_own" on public.predictions for select to authenticated using (auth.uid() = user_id);
create policy if not exists "predictions_insert_own" on public.predictions for insert to authenticated with check (auth.uid() = user_id);
create policy if not exists "predictions_update_own" on public.predictions for update to authenticated using (auth.uid() = user_id);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.leaderboard_view() returns table(user_id uuid, display_name text, points bigint, exact_hits bigint, outcome_hits bigint, counted_predictions bigint) language sql security definer as $$
with scored as (
  select p.user_id, pr.display_name,
  case when m.home_score is null or m.away_score is null then 0
       when p.predicted_home = m.home_score and p.predicted_away = m.away_score then 3
       when (case when p.predicted_home > p.predicted_away then 'H' when p.predicted_home < p.predicted_away then 'A' else 'D' end)
         = (case when m.home_score > m.away_score then 'H' when m.home_score < m.away_score then 'A' else 'D' end) then 1
       else 0 end as pts,
  case when m.home_score is not null and m.away_score is not null and p.predicted_home = m.home_score and p.predicted_away = m.away_score then 1 else 0 end as exact_hit,
  case when m.home_score is not null and m.away_score is not null and p.predicted_home = m.home_score and p.predicted_away = m.away_score then 0
       when m.home_score is not null and m.away_score is not null and (case when p.predicted_home > p.predicted_away then 'H' when p.predicted_home < p.predicted_away then 'A' else 'D' end) = (case when m.home_score > m.away_score then 'H' when m.home_score < m.away_score then 'A' else 'D' end) then 1 else 0 end as outcome_hit
  from public.predictions p join public.matches m on m.id = p.match_id join public.profiles pr on pr.id = p.user_id
)
select user_id, coalesce(display_name, 'Jucător') as display_name, sum(pts)::bigint as points, sum(exact_hit)::bigint as exact_hits, sum(outcome_hit)::bigint as outcome_hits, count(*)::bigint as counted_predictions from scored group by user_id, display_name order by points desc, exact_hits desc, outcome_hits desc, display_name asc;
$$;

insert into public.matches (id, stage, group_name, matchday, order_index, home_team, away_team, kickoff_at, lock_at, venue) values
('A1', 'groups', 'A', 1, 1, 'Mexico', 'South Africa', '2026-06-11T19:00:00Z', '2026-06-11T18:45:00Z', 'Mexico City'),
('A2', 'groups', 'A', 1, 2, 'South Korea', 'Czechia', '2026-06-12T02:00:00Z', '2026-06-12T01:45:00Z', 'Guadalajara'),
('A3', 'groups', 'A', 2, 3, 'Czechia', 'South Africa', '2026-06-18T16:00:00Z', '2026-06-18T15:45:00Z', 'Atlanta'),
('A4', 'groups', 'A', 2, 4, 'Mexico', 'South Korea', '2026-06-19T01:00:00Z', '2026-06-19T00:45:00Z', 'Guadalajara'),
('A5', 'groups', 'A', 3, 5, 'Czechia', 'Mexico', '2026-06-25T01:00:00Z', '2026-06-25T00:45:00Z', 'Mexico City'),
('A6', 'groups', 'A', 3, 6, 'South Africa', 'South Korea', '2026-06-25T01:00:00Z', '2026-06-25T00:45:00Z', 'Monterrey'),
('B1', 'groups', 'B', 1, 7, 'Canada', 'Bosnia and Herzegovina', '2026-06-12T19:00:00Z', '2026-06-12T18:45:00Z', 'Toronto'),
('B2', 'groups', 'B', 1, 8, 'Qatar', 'Switzerland', '2026-06-13T19:00:00Z', '2026-06-13T18:45:00Z', 'San Francisco Bay Area'),
('B3', 'groups', 'B', 2, 9, 'Switzerland', 'Bosnia and Herzegovina', '2026-06-18T19:00:00Z', '2026-06-18T18:45:00Z', 'Los Angeles'),
('B4', 'groups', 'B', 2, 10, 'Canada', 'Qatar', '2026-06-18T22:00:00Z', '2026-06-18T21:45:00Z', 'Vancouver'),
('B5', 'groups', 'B', 3, 11, 'Switzerland', 'Canada', '2026-06-24T19:00:00Z', '2026-06-24T18:45:00Z', 'Vancouver'),
('B6', 'groups', 'B', 3, 12, 'Bosnia and Herzegovina', 'Qatar', '2026-06-24T19:00:00Z', '2026-06-24T18:45:00Z', 'Seattle'),
('C1', 'groups', 'C', 1, 13, 'Brazil', 'Morocco', '2026-06-13T22:00:00Z', '2026-06-13T21:45:00Z', 'New York / New Jersey'),
('C2', 'groups', 'C', 1, 14, 'Haiti', 'Scotland', '2026-06-14T01:00:00Z', '2026-06-14T00:45:00Z', 'Boston'),
('C3', 'groups', 'C', 2, 15, 'Scotland', 'Morocco', '2026-06-19T22:00:00Z', '2026-06-19T21:45:00Z', 'Boston'),
('C4', 'groups', 'C', 2, 16, 'Brazil', 'Haiti', '2026-06-20T01:00:00Z', '2026-06-20T00:45:00Z', 'Philadelphia'),
('C5', 'groups', 'C', 3, 17, 'Scotland', 'Brazil', '2026-06-24T22:00:00Z', '2026-06-24T21:45:00Z', 'Miami'),
('C6', 'groups', 'C', 3, 18, 'Morocco', 'Haiti', '2026-06-24T22:00:00Z', '2026-06-24T21:45:00Z', 'Atlanta'),
('D1', 'groups', 'D', 1, 19, 'USA', 'Paraguay', '2026-06-13T01:00:00Z', '2026-06-13T00:45:00Z', 'Los Angeles'),
('D2', 'groups', 'D', 1, 20, 'Australia', 'Türkiye', '2026-06-14T04:00:00Z', '2026-06-14T03:45:00Z', 'Vancouver'),
('D3', 'groups', 'D', 2, 21, 'USA', 'Australia', '2026-06-19T19:00:00Z', '2026-06-19T18:45:00Z', 'Seattle'),
('D4', 'groups', 'D', 2, 22, 'Türkiye', 'Paraguay', '2026-06-20T04:00:00Z', '2026-06-20T03:45:00Z', 'San Francisco Bay Area'),
('D5', 'groups', 'D', 3, 23, 'Türkiye', 'USA', '2026-06-26T02:00:00Z', '2026-06-26T01:45:00Z', 'Los Angeles'),
('D6', 'groups', 'D', 3, 24, 'Paraguay', 'Australia', '2026-06-26T02:00:00Z', '2026-06-26T01:45:00Z', 'San Francisco Bay Area'),
('E1', 'groups', 'E', 1, 25, 'Germany', 'Curaçao', '2026-06-14T17:00:00Z', '2026-06-14T16:45:00Z', 'Houston'),
('E2', 'groups', 'E', 1, 26, 'Côte d''Ivoire', 'Ecuador', '2026-06-14T23:00:00Z', '2026-06-14T22:45:00Z', 'Philadelphia'),
('E3', 'groups', 'E', 2, 27, 'Germany', 'Côte d''Ivoire', '2026-06-20T20:00:00Z', '2026-06-20T19:45:00Z', 'Toronto'),
('E4', 'groups', 'E', 2, 28, 'Ecuador', 'Curaçao', '2026-06-21T00:00:00Z', '2026-06-20T23:45:00Z', 'Kansas City'),
('E5', 'groups', 'E', 3, 29, 'Ecuador', 'Germany', '2026-06-25T20:00:00Z', '2026-06-25T19:45:00Z', 'New York / New Jersey'),
('E6', 'groups', 'E', 3, 30, 'Curaçao', 'Côte d''Ivoire', '2026-06-25T20:00:00Z', '2026-06-25T19:45:00Z', 'Philadelphia'),
('F1', 'groups', 'F', 1, 31, 'Netherlands', 'Japan', '2026-06-14T20:00:00Z', '2026-06-14T19:45:00Z', 'Dallas'),
('F2', 'groups', 'F', 1, 32, 'Sweden', 'Tunisia', '2026-06-15T02:00:00Z', '2026-06-15T01:45:00Z', 'Monterrey'),
('F3', 'groups', 'F', 2, 33, 'Netherlands', 'Sweden', '2026-06-20T17:00:00Z', '2026-06-20T16:45:00Z', 'Houston'),
('F4', 'groups', 'F', 2, 34, 'Tunisia', 'Japan', '2026-06-21T04:00:00Z', '2026-06-21T03:45:00Z', 'Monterrey'),
('F5', 'groups', 'F', 3, 35, 'Japan', 'Sweden', '2026-06-25T23:00:00Z', '2026-06-25T22:45:00Z', 'Dallas'),
('F6', 'groups', 'F', 3, 36, 'Tunisia', 'Netherlands', '2026-06-25T23:00:00Z', '2026-06-25T22:45:00Z', 'Kansas City'),
('G1', 'groups', 'G', 1, 37, 'Belgium', 'Egypt', '2026-06-15T22:00:00Z', '2026-06-15T21:45:00Z', 'Seattle'),
('G2', 'groups', 'G', 1, 38, 'Iran', 'New Zealand', '2026-06-16T01:00:00Z', '2026-06-16T00:45:00Z', 'Los Angeles'),
('G3', 'groups', 'G', 2, 39, 'Belgium', 'Iran', '2026-06-21T19:00:00Z', '2026-06-21T18:45:00Z', 'Los Angeles'),
('G4', 'groups', 'G', 2, 40, 'New Zealand', 'Egypt', '2026-06-22T01:00:00Z', '2026-06-22T00:45:00Z', 'Vancouver'),
('G5', 'groups', 'G', 3, 41, 'Egypt', 'Iran', '2026-06-27T03:00:00Z', '2026-06-27T02:45:00Z', 'Seattle'),
('G6', 'groups', 'G', 3, 42, 'New Zealand', 'Belgium', '2026-06-27T03:00:00Z', '2026-06-27T02:45:00Z', 'Vancouver'),
('H1', 'groups', 'H', 1, 43, 'Spain', 'Cabo Verde', '2026-06-15T16:00:00Z', '2026-06-15T15:45:00Z', 'Atlanta'),
('H2', 'groups', 'H', 1, 44, 'Saudi Arabia', 'Uruguay', '2026-06-15T22:00:00Z', '2026-06-15T21:45:00Z', 'Miami'),
('H3', 'groups', 'H', 2, 45, 'Spain', 'Saudi Arabia', '2026-06-21T16:00:00Z', '2026-06-21T15:45:00Z', 'Atlanta'),
('H4', 'groups', 'H', 2, 46, 'Uruguay', 'Cabo Verde', '2026-06-21T22:00:00Z', '2026-06-21T21:45:00Z', 'Miami'),
('H5', 'groups', 'H', 3, 47, 'Cabo Verde', 'Saudi Arabia', '2026-06-27T00:00:00Z', '2026-06-26T23:45:00Z', 'Houston'),
('H6', 'groups', 'H', 3, 48, 'Uruguay', 'Spain', '2026-06-27T00:00:00Z', '2026-06-26T23:45:00Z', 'Guadalajara'),
('I1', 'groups', 'I', 1, 49, 'France', 'Senegal', '2026-06-16T19:00:00Z', '2026-06-16T18:45:00Z', 'New York / New Jersey'),
('I2', 'groups', 'I', 1, 50, 'Iraq', 'Norway', '2026-06-16T22:00:00Z', '2026-06-16T21:45:00Z', 'Boston'),
('I3', 'groups', 'I', 2, 51, 'France', 'Iraq', '2026-06-22T21:00:00Z', '2026-06-22T20:45:00Z', 'Philadelphia'),
('I4', 'groups', 'I', 2, 52, 'Norway', 'Senegal', '2026-06-23T00:00:00Z', '2026-06-22T23:45:00Z', 'New York / New Jersey'),
('I5', 'groups', 'I', 3, 53, 'Norway', 'France', '2026-06-26T19:00:00Z', '2026-06-26T18:45:00Z', 'Boston'),
('I6', 'groups', 'I', 3, 54, 'Senegal', 'Iraq', '2026-06-26T19:00:00Z', '2026-06-26T18:45:00Z', 'Toronto'),
('J1', 'groups', 'J', 1, 55, 'Argentina', 'Algeria', '2026-06-17T01:00:00Z', '2026-06-17T00:45:00Z', 'Kansas City'),
('J2', 'groups', 'J', 1, 56, 'Austria', 'Jordan', '2026-06-17T04:00:00Z', '2026-06-17T03:45:00Z', 'San Francisco Bay Area'),
('J3', 'groups', 'J', 2, 57, 'Argentina', 'Austria', '2026-06-22T17:00:00Z', '2026-06-22T16:45:00Z', 'Dallas'),
('J4', 'groups', 'J', 2, 58, 'Jordan', 'Algeria', '2026-06-23T03:00:00Z', '2026-06-23T02:45:00Z', 'San Francisco Bay Area'),
('J5', 'groups', 'J', 3, 59, 'Algeria', 'Austria', '2026-06-28T02:00:00Z', '2026-06-28T01:45:00Z', 'Kansas City'),
('J6', 'groups', 'J', 3, 60, 'Jordan', 'Argentina', '2026-06-28T02:00:00Z', '2026-06-28T01:45:00Z', 'Dallas'),
('K1', 'groups', 'K', 1, 61, 'Portugal', 'DR Congo', '2026-06-17T17:00:00Z', '2026-06-17T16:45:00Z', 'Houston'),
('K2', 'groups', 'K', 1, 62, 'Uzbekistan', 'Colombia', '2026-06-18T02:00:00Z', '2026-06-18T01:45:00Z', 'Mexico City'),
('K3', 'groups', 'K', 2, 63, 'Portugal', 'Uzbekistan', '2026-06-23T17:00:00Z', '2026-06-23T16:45:00Z', 'Houston'),
('K4', 'groups', 'K', 2, 64, 'Colombia', 'DR Congo', '2026-06-24T02:00:00Z', '2026-06-24T01:45:00Z', 'Guadalajara'),
('K5', 'groups', 'K', 3, 65, 'Colombia', 'Portugal', '2026-06-27T23:30:00Z', '2026-06-27T23:15:00Z', 'Miami'),
('K6', 'groups', 'K', 3, 66, 'DR Congo', 'Uzbekistan', '2026-06-27T23:30:00Z', '2026-06-27T23:15:00Z', 'Atlanta'),
('L1', 'groups', 'L', 1, 67, 'England', 'Croatia', '2026-06-17T20:00:00Z', '2026-06-17T19:45:00Z', 'Dallas'),
('L2', 'groups', 'L', 1, 68, 'Ghana', 'Panama', '2026-06-17T23:00:00Z', '2026-06-17T22:45:00Z', 'Toronto'),
('L3', 'groups', 'L', 2, 69, 'England', 'Ghana', '2026-06-23T20:00:00Z', '2026-06-23T19:45:00Z', 'Boston'),
('L4', 'groups', 'L', 2, 70, 'Panama', 'Croatia', '2026-06-23T23:00:00Z', '2026-06-23T22:45:00Z', 'Toronto'),
('L5', 'groups', 'L', 3, 71, 'Panama', 'England', '2026-06-27T21:00:00Z', '2026-06-27T20:45:00Z', 'New York / New Jersey'),
('L6', 'groups', 'L', 3, 72, 'Croatia', 'Ghana', '2026-06-27T21:00:00Z', '2026-06-27T20:45:00Z', 'Philadelphia'),
('R32-1', 'round32', null, null, 73, 'A2', 'B2', '2026-06-28T19:00:00Z', '2026-06-28T18:45:00Z', 'Los Angeles'),
('R32-2', 'round32', null, null, 74, 'E1', 'Best 3rd A/B/C/D/F', '2026-06-29T20:30:00Z', '2026-06-29T20:15:00Z', 'Boston'),
('R32-3', 'round32', null, null, 75, 'F1', 'C2', '2026-06-30T02:00:00Z', '2026-06-30T01:45:00Z', 'Monterrey'),
('R32-4', 'round32', null, null, 76, 'C1', 'F2', '2026-06-29T17:00:00Z', '2026-06-29T16:45:00Z', 'Houston'),
('R32-5', 'round32', null, null, 77, 'I1', 'Best 3rd C/D/F/G/H', '2026-06-30T21:00:00Z', '2026-06-30T20:45:00Z', 'New York / New Jersey'),
('R32-6', 'round32', null, null, 78, 'E2', 'I2', '2026-06-30T17:00:00Z', '2026-06-30T16:45:00Z', 'Dallas'),
('R32-7', 'round32', null, null, 79, 'A1', 'Best 3rd C/E/F/H/I', '2026-07-01T01:00:00Z', '2026-07-01T00:45:00Z', 'Mexico City'),
('R32-8', 'round32', null, null, 80, 'L1', 'Best 3rd E/H/I/J/K', '2026-07-01T16:00:00Z', '2026-07-01T15:45:00Z', 'Atlanta'),
('R32-9', 'round32', null, null, 81, 'D1', 'Best 3rd B/E/F/I/J', '2026-07-02T00:00:00Z', '2026-07-01T23:45:00Z', 'San Francisco Bay Area'),
('R32-10', 'round32', null, null, 82, 'G1', 'Best 3rd A/E/H/I/J', '2026-07-01T20:00:00Z', '2026-07-01T19:45:00Z', 'Seattle'),
('R32-11', 'round32', null, null, 83, 'K2', 'L2', '2026-07-03T00:00:00Z', '2026-07-02T23:45:00Z', 'Toronto'),
('R32-12', 'round32', null, null, 84, 'H1', 'J2', '2026-07-02T19:00:00Z', '2026-07-02T18:45:00Z', 'Los Angeles'),
('R32-13', 'round32', null, null, 85, 'B1', 'Best 3rd E/F/G/I/J', '2026-07-03T03:00:00Z', '2026-07-03T02:45:00Z', 'Vancouver'),
('R32-14', 'round32', null, null, 86, 'J1', 'H2', '2026-07-03T22:00:00Z', '2026-07-03T21:45:00Z', 'Miami'),
('R32-15', 'round32', null, null, 87, 'K1', 'Best 3rd D/E/I/J/L', '2026-07-04T01:30:00Z', '2026-07-04T01:15:00Z', 'Kansas City'),
('R32-16', 'round32', null, null, 88, 'D2', 'G2', '2026-07-03T18:00:00Z', '2026-07-03T17:45:00Z', 'Dallas'),
('R16-1', 'round16', null, null, 89, 'Winner 74', 'Winner 77', '2026-07-04T21:00:00Z', '2026-07-04T20:45:00Z', 'Philadelphia'),
('R16-2', 'round16', null, null, 90, 'Winner 73', 'Winner 75', '2026-07-04T17:00:00Z', '2026-07-04T16:45:00Z', 'Houston'),
('R16-3', 'round16', null, null, 91, 'Winner 76', 'Winner 78', '2026-07-05T20:00:00Z', '2026-07-05T19:45:00Z', 'New York / New Jersey'),
('R16-4', 'round16', null, null, 92, 'Winner 79', 'Winner 80', '2026-07-06T00:00:00Z', '2026-07-05T23:45:00Z', 'Mexico City'),
('R16-5', 'round16', null, null, 93, 'Winner 83', 'Winner 84', '2026-07-06T19:00:00Z', '2026-07-06T18:45:00Z', 'Dallas'),
('R16-6', 'round16', null, null, 94, 'Winner 81', 'Winner 82', '2026-07-07T00:00:00Z', '2026-07-06T23:45:00Z', 'Seattle'),
('R16-7', 'round16', null, null, 95, 'Winner 86', 'Winner 88', '2026-07-07T16:00:00Z', '2026-07-07T15:45:00Z', 'Atlanta'),
('R16-8', 'round16', null, null, 96, 'Winner 85', 'Winner 87', '2026-07-07T20:00:00Z', '2026-07-07T19:45:00Z', 'Vancouver'),
('QF-1', 'quarter', null, null, 97, 'Winner 89', 'Winner 90', '2026-07-09T20:00:00Z', '2026-07-09T19:45:00Z', 'Boston'),
('QF-2', 'quarter', null, null, 98, 'Winner 93', 'Winner 94', '2026-07-10T19:00:00Z', '2026-07-10T18:45:00Z', 'Los Angeles'),
('QF-3', 'quarter', null, null, 99, 'Winner 91', 'Winner 92', '2026-07-11T21:00:00Z', '2026-07-11T20:45:00Z', 'Miami'),
('QF-4', 'quarter', null, null, 100, 'Winner 95', 'Winner 96', '2026-07-12T01:00:00Z', '2026-07-12T00:45:00Z', 'Kansas City'),
('SF-1', 'semi', null, null, 101, 'Winner 97', 'Winner 98', '2026-07-14T19:00:00Z', '2026-07-14T18:45:00Z', 'Dallas'),
('SF-2', 'semi', null, null, 102, 'Winner 99', 'Winner 100', '2026-07-15T19:00:00Z', '2026-07-15T18:45:00Z', 'Atlanta'),
('3RD', 'third', null, null, 103, 'Loser 101', 'Loser 102', '2026-07-18T21:00:00Z', '2026-07-18T20:45:00Z', 'Miami'),
('FINAL', 'final', null, null, 104, 'Winner 101', 'Winner 102', '2026-07-19T19:00:00Z', '2026-07-19T18:45:00Z', 'New York / New Jersey')
on conflict (id) do nothing;

-- După ce îți faci cont, rulează:
-- update public.profiles set is_admin = true where id = 'UUID_UL_TĂU';
