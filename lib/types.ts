export type Position = "GK" | "DEF" | "MID" | "FWD";
export type Role = "starter" | "sub_in" | "unused";
export type HomeAway = "home" | "away";

export interface Profile {
  id: string;
  display_name: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface Player {
  id: string;
  name: string;
  position: Position | null;
  squad_number: number | null;
  photo_url: string | null;
  active: boolean;
  created_at: string;
}

export interface Manager {
  id: string;
  name: string;
  photo_url: string | null;
  active: boolean;
  created_at: string;
}

export interface Match {
  id: string;
  date: string;
  opponent: string;
  competition: string | null;
  home_away: HomeAway | null;
  score_for: number | null;
  score_against: number | null;
  manager_id: string | null;
  formation: string | null;
  opponent_logo_url: string | null;
  created_at: string;
  manager?: Manager;
}

export interface MatchLineup {
  id: string;
  match_id: string;
  player_id: string;
  role: Role;
  sub_minute: number | null;
  formation_line: number | null;
  specific_position: string | null;
  goals: number;
  assists: number;
  player?: Player;
}

export interface PlayerRating {
  id: string;
  user_id: string;
  match_id: string;
  player_id: string;
  rating: number;
  created_at: string;
}

export interface ManagerRating {
  id: string;
  user_id: string;
  match_id: string;
  manager_id: string;
  rating: number;
  created_at: string;
}

export interface PlayerWithLineup extends Player {
  role: Role;
  sub_minute: number | null;
  formation_line: number | null;
  specific_position: string | null;
  community_avg: number | null;
  user_rating: number | null;
  goals: number | null;
  assists: number | null;
}

export interface MatchWithLineup extends Match {
  starters: PlayerWithLineup[];
  subs: PlayerWithLineup[];
  manager_community_avg: number | null;
  manager_user_rating: number | null;
}

export interface PlayerRatingHistory {
  match_id: string;
  match_date: string;
  opponent: string;
  role?: "starter" | "sub_in";
  sub_minute?: number | null;
  goals?: number;
  assists?: number;
  clean_sheet?: boolean;
  community_motm?: boolean;
  personal_motm?: boolean;
  user_rating: number | null;
  community_avg: number | null;
}
