export type MatchStage = "groups" | "round32" | "round16" | "quarter" | "semi" | "third" | "final";
export type Profile = { id: string; display_name: string | null; is_admin: boolean; created_at: string; };
export type Match = {
  id: string; stage: MatchStage; group_name: string | null; matchday: number | null; order_index: number;
  home_team: string; away_team: string; kickoff_at: string; lock_at: string; venue: string | null;
  home_score: number | null; away_score: number | null; is_finished: boolean;
};