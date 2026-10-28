-- WG WindFarm Winner - public opt-in leaderboard.
-- The narrow RPC returns only nicknames and completed scores of players
-- who explicitly opted in; it never exposes emails, snapshots or user IDs.
revoke all on function public.wfw_leaderboard() from public;
grant execute on function public.wfw_leaderboard() to anon, authenticated;
