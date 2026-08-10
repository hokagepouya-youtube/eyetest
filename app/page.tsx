import { createClient } from "@/lib/supabase/server";
import MatchHeader from "@/components/MatchHeader";
import FormationPitch from "@/components/FormationPitch";
import PlayerCard from "@/components/PlayerCard";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Player, Manager, MatchLineup } from "@/lib/types";

function getResult(scoreFor: number, scoreAgainst: number): "W" | "D" | "L" {
  if (scoreFor > scoreAgainst) return "W";
  if (scoreFor < scoreAgainst) return "L";
  return "D";
}

const RC = {
  W: { bg: "rgba(74,222,128,0.15)",  text: "#4ade80", border: "rgba(74,222,128,0.35)" },
  D: { bg: "rgba(250,204,21,0.15)",  text: "#facc15", border: "rgba(250,204,21,0.35)" },
  L: { bg: "rgba(248,113,113,0.15)", text: "#f87171", border: "rgba(248,113,113,0.35)" },
};

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const today = new Date().toISOString().split("T")[0];

  // Latest past/current match for rating
  const { data: match } = await supabase
    .from("matches")
    .select("*, manager:managers(*)")
    .lte("date", today)
    .order("date", { ascending: false })
    .limit(1)
    .single();

  // All past matches — lightweight, for form + history list
  const { data: pastList } = await supabase
    .from("matches")
    .select("id, date, opponent, competition, score_for, score_against, opponent_logo_url, home_away")
    .lte("date", today)
    .order("date", { ascending: false });

  // Next upcoming match
  const { data: upcomingData } = await supabase
    .from("matches")
    .select("id, date, opponent, competition, opponent_logo_url, home_away")
    .gt("date", today)
    .order("date", { ascending: true })
    .limit(1);

  const upcomingMatch = upcomingData?.[0] ?? null;

  // Form: last 5 completed (with scores), reversed so oldest is left
  const formMatches = (pastList ?? [])
    .filter((m: { score_for: number | null; score_against: number | null }) =>
      m.score_for !== null && m.score_against !== null
    )
    .slice(0, 5)
    .reverse();

  // History: everything except the current match
  const historyMatches = (pastList ?? []).slice(1);

  // ── No matches at all ──
  if (!match) {
    return (
      <div className="animate-fade-up">
        {upcomingMatch && (
          <div
            className="relative overflow-hidden rounded-xl p-6 mb-8"
            style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="absolute top-0 left-0 bottom-0 w-1" style={{ background: "#DC052D" }} />
            <p className="text-[10px] text-white/30 tracking-[0.35em] uppercase mb-2 pl-4" style={{ fontFamily: "var(--font-condensed)" }}>
              Upcoming
            </p>
            <p className="text-white text-2xl pl-4" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.12em" }}>
              vs {upcomingMatch.opponent.toUpperCase()}
            </p>
          </div>
        )}
        <div className="text-center py-24">
          <p className="text-[80px] leading-none text-white/[0.06] mb-4 tracking-[0.15em]" style={{ fontFamily: "var(--font-display)" }}>
            NO MATCHES
          </p>
          <p className="text-white/20 text-[11px] tracking-[0.4em] uppercase" style={{ fontFamily: "var(--font-condensed)" }}>
            Admin hasn't entered any matches yet
          </p>
        </div>
      </div>
    );
  }

  // ── Full data for the current match ──
  const [
    { data: lineupRows },
    { data: playerRatingsData },
    { data: managerRatingsData },
  ] = await Promise.all([
    supabase.from("match_lineups").select("*, player:players(*)").eq("match_id", match.id),
    supabase.from("player_ratings").select("player_id, rating").eq("match_id", match.id),
    supabase.from("manager_ratings").select("rating").eq("match_id", match.id).eq("manager_id", match.manager_id ?? ""),
  ]);

  const { data: userRatingsData } = await supabase
    .from("player_ratings")
    .select("player_id, rating")
    .eq("match_id", match.id)
    .eq("user_id", user.id);

  const { data: userManagerRatingData } = match.manager_id
    ? await supabase
        .from("manager_ratings")
        .select("rating")
        .eq("match_id", match.id)
        .eq("manager_id", match.manager_id)
        .eq("user_id", user.id)
        .single()
    : { data: null };

  const communityAvgMap: Record<string, number> = {};
  if (playerRatingsData) {
    const grouped: Record<string, number[]> = {};
    for (const r of playerRatingsData) {
      if (!grouped[r.player_id]) grouped[r.player_id] = [];
      grouped[r.player_id].push(Number(r.rating));
    }
    for (const [pid, ratings] of Object.entries(grouped)) {
      communityAvgMap[pid] = Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10;
    }
  }

  const userRatingMap: Record<string, number> = {};
  if (userRatingsData) {
    for (const r of userRatingsData) userRatingMap[r.player_id] = Number(r.rating);
  }

  const managerCommunityAvg =
    managerRatingsData && managerRatingsData.length > 0
      ? Math.round(
          (managerRatingsData.reduce((s: number, r: { rating: number | string }) => s + Number(r.rating), 0) /
            managerRatingsData.length) * 10
        ) / 10
      : null;

  const starters = (lineupRows ?? [])
    .filter((l: MatchLineup & { player: Player }) => l.role === "starter")
    .map((l: MatchLineup & { player: Player }) => ({
      ...l.player,
      role: l.role,
      sub_minute: l.sub_minute,
      formation_line: l.formation_line ?? null,
      specific_position: l.specific_position ?? null,
      community_avg: communityAvgMap[l.player_id] ?? null,
      user_rating: userRatingMap[l.player_id] ?? null,
      goals: l.goals ?? null,
      assists: l.assists ?? null,
    }));

  const subs = (lineupRows ?? [])
    .filter((l: MatchLineup & { player: Player }) => l.role === "sub_in")
    .map((l: MatchLineup & { player: Player }) => ({
      ...l.player,
      role: l.role,
      sub_minute: l.sub_minute,
      formation_line: l.formation_line ?? null,
      specific_position: l.specific_position ?? null,
      community_avg: communityAvgMap[l.player_id] ?? null,
      user_rating: userRatingMap[l.player_id] ?? null,
      goals: l.goals ?? null,
      assists: l.assists ?? null,
    }))
    .sort((a: { sub_minute: number | null }, b: { sub_minute: number | null }) =>
      (a.sub_minute ?? 99) - (b.sub_minute ?? 99)
    );

  const manager = match.manager as Manager | null;

  return (
    <div>
      {/* ── Upcoming match + Form strip ── */}
      {(upcomingMatch || formMatches.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 animate-fade-up">

          {/* Upcoming match card */}
          {upcomingMatch ? (
            <div
              className="relative overflow-hidden rounded-xl px-6 py-5"
              style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="absolute top-0 left-0 bottom-0 w-1" style={{ background: "#DC052D" }} />
              <p
                className="text-[9px] text-white/30 tracking-[0.4em] uppercase mb-3"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Upcoming
              </p>
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 leading-none">
                    <span
                      className="text-white/50 text-2xl shrink-0"
                      style={{ fontFamily: "var(--font-display)", letterSpacing: "0.1em" }}
                    >
                      {upcomingMatch.home_away === "home" ? "VS" : "@"}
                    </span>
                    {upcomingMatch.opponent_logo_url && (
                      <img
                        src={upcomingMatch.opponent_logo_url}
                        alt={upcomingMatch.opponent}
                        className="w-8 h-8 object-contain shrink-0"
                      />
                    )}
                    <span
                      className="text-white text-2xl truncate"
                      style={{ fontFamily: "var(--font-display)", letterSpacing: "0.1em" }}
                    >
                      {upcomingMatch.opponent.toUpperCase()}
                    </span>
                  </div>
                  <p
                    className="text-white/35 text-[11px] mt-1 tracking-wider"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    {upcomingMatch.competition && `${upcomingMatch.competition} · `}
                    {new Date(upcomingMatch.date + "T00:00:00").toLocaleDateString("en-US", {
                      weekday: "short", month: "short", day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div />
          )}

          {/* Form tracker */}
          {formMatches.length > 0 && (
            <div
              className="relative overflow-hidden rounded-xl px-6 py-5"
              style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="absolute top-0 left-0 bottom-0 w-1" style={{ background: "#DC052D" }} />
              <p
                className="text-[9px] text-white/30 tracking-[0.4em] uppercase mb-3"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Form — Last {formMatches.length} {formMatches.length === 1 ? "match" : "matches"}
              </p>
              <div className="flex items-center gap-2">
                {/* Grey placeholders to always show 5 slots */}
                {Array.from({ length: 5 }).map((_, i) => {
                  const m = formMatches[i] as { id: string; score_for: number; score_against: number } | undefined;
                  if (!m) {
                    return (
                      <div
                        key={`empty-${i}`}
                        className="w-10 h-10 rounded-full"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.08)" }}
                      />
                    );
                  }
                  const r = getResult(m.score_for, m.score_against);
                  const c = RC[r];
                  return (
                    <div
                      key={m.id}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{
                        background: c.bg,
                        color: c.text,
                        border: `1.5px solid ${c.border}`,
                        fontFamily: "var(--font-display)",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {r}
                    </div>
                  );
                })}
                <span
                  className="text-white/15 text-[9px] tracking-wider ml-1"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  oldest → latest
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Current match ── */}
      <MatchHeader match={match} />

      {starters.length > 0 && (
        <section className="mb-12 animate-fade-up" style={{ animationDelay: "80ms" }}>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-1 h-6 shrink-0" style={{ background: "#DC052D" }} />
            <h2
              className="text-2xl text-white tracking-[0.18em] leading-none"
              style={{ fontFamily: "var(--font-display)" }}
            >
              STARTING XI
            </h2>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          </div>
          <FormationPitch
            players={starters}
            formation={match.formation ?? null}
            matchId={match.id}
            userId={user?.id ?? null}
            manager={manager}
            managerCommunityAvg={managerCommunityAvg}
            managerUserRating={userManagerRatingData ? Number(userManagerRatingData.rating) : null}
          />
        </section>
      )}

      {subs.length > 0 && (
        <section className="mb-12 animate-fade-up" style={{ animationDelay: "160ms" }}>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-1 h-6 shrink-0" style={{ background: "#DC052D" }} />
            <h2
              className="text-2xl text-white tracking-[0.18em] leading-none"
              style={{ fontFamily: "var(--font-display)" }}
            >
              SUBSTITUTES
            </h2>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
            <span
              className="text-[9px] text-white/20 tracking-[0.35em] uppercase shrink-0"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              came on
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {subs.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                matchId={match.id}
                userId={user?.id ?? null}
              />
            ))}
          </div>
        </section>
      )}

      {starters.length === 0 && subs.length === 0 && (
        <div className="text-center py-24 animate-fade-up">
          <p
            className="text-[80px] leading-none text-white/[0.06] mb-4 tracking-[0.15em]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            LINEUP TBD
          </p>
          <p
            className="text-white/20 text-[11px] tracking-[0.4em] uppercase"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            Check back after the admin enters the lineup
          </p>
        </div>
      )}

      {/* ── Match History ── */}
      {historyMatches.length > 0 && (
        <section className="mt-12 animate-fade-up" style={{ animationDelay: "240ms" }}>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-1 h-6 shrink-0" style={{ background: "#DC052D" }} />
            <h2
              className="text-2xl text-white tracking-[0.18em] leading-none"
              style={{ fontFamily: "var(--font-display)" }}
            >
              MATCH HISTORY
            </h2>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
            <span
              className="text-[9px] text-white/20 tracking-[0.35em] uppercase shrink-0"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              click to rate
            </span>
          </div>

          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "#111", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            {(historyMatches as {
              id: string;
              date: string;
              opponent: string;
              competition: string | null;
              score_for: number | null;
              score_against: number | null;
              opponent_logo_url: string | null;
              home_away: string | null;
            }[]).map((m) => {
              const hasScore = m.score_for !== null && m.score_against !== null;
              const result = hasScore ? getResult(m.score_for!, m.score_against!) : null;
              const rc = result ? RC[result] : null;

              return (
                <Link key={m.id} href={`/matches/${m.id}`}>
                  <div className="flex items-center gap-4 px-5 py-4 transition-colors border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03]">
                    {/* Opponent badge */}
                    {m.opponent_logo_url ? (
                      <img
                        src={m.opponent_logo_url}
                        alt={m.opponent}
                        className="w-7 h-8 object-contain shrink-0"
                      />
                    ) : (
                      <div
                        className="w-7 h-7 rounded-full shrink-0"
                        style={{ background: "rgba(255,255,255,0.06)" }}
                      />
                    )}

                    {/* Opponent + meta */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-white text-sm font-bold truncate"
                        style={{ fontFamily: "var(--font-condensed)" }}
                      >
                        {m.home_away === "home" ? "vs" : "@"} {m.opponent}
                      </p>
                      <p
                        className="text-white/35 text-[11px] mt-0.5"
                        style={{ fontFamily: "var(--font-condensed)" }}
                      >
                        {m.competition && `${m.competition} · `}
                        {new Date(m.date + "T00:00:00").toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    {/* Score */}
                    {hasScore ? (
                      <span
                        className="text-xl tabular-nums font-bold shrink-0"
                        style={{
                          fontFamily: "var(--font-display)",
                          color: rc?.text ?? "#fff",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {m.score_for} – {m.score_against}
                      </span>
                    ) : (
                      <span
                        className="text-white/20 text-xs shrink-0"
                        style={{ fontFamily: "var(--font-condensed)" }}
                      >
                        TBD
                      </span>
                    )}

                    {/* W/D/L pill */}
                    {result && rc && (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{
                          background: rc.bg,
                          color: rc.text,
                          border: `1.5px solid ${rc.border}`,
                          fontFamily: "var(--font-display)",
                        }}
                      >
                        {result}
                      </div>
                    )}

                    <span className="text-white/15 text-sm shrink-0">→</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
