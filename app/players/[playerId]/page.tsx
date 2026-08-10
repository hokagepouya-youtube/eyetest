import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import RatingGraph from "@/components/RatingGraph";
import type { PlayerRatingHistory } from "@/lib/types";

const POSITION_COLORS: Record<string, string> = {
  GK:  "#facc15",
  DEF: "#60a5fa",
  MID: "#4ade80",
  FWD: "#f87171",
};

const ratingColor = (r: number) => {
  if (r >= 8)   return "#4ade80";
  if (r >= 6.5) return "#facc15";
  if (r >= 5)   return "#fb923c";
  return "#f87171";
};

export default async function PlayerDetailPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: player } = await supabase
    .from("players")
    .select("*")
    .eq("id", playerId)
    .single();

  if (!player) notFound();

  // Include goals, assists, and score_against (for clean sheet computation)
  const { data: lineupEntries } = await supabase
    .from("match_lineups")
    .select("match_id, role, sub_minute, goals, assists, match:matches(id, date, opponent, score_against)")
    .eq("player_id", playerId)
    .neq("role", "unused");

  const matchIds = (lineupEntries ?? []).map((l: { match_id: string }) => l.match_id);

  // Fetch all players' ratings for these matches — needed for community avg AND MOTM detection
  const { data: allMatchRatings } = matchIds.length
    ? await supabase
        .from("player_ratings")
        .select("match_id, player_id, rating")
        .in("match_id", matchIds)
    : { data: [] };

  // Fetch this user's ratings for all players in these matches — needed for user avg AND personal MOTM
  const { data: allUserMatchRatings } = user && matchIds.length
    ? await supabase
        .from("player_ratings")
        .select("match_id, player_id, rating")
        .eq("user_id", user.id)
        .in("match_id", matchIds)
    : { data: [] };

  // Community avg for this player per match + community MOTM per match (all tied leaders get it)
  const communityAvgByMatch: Record<string, number> = {};
  const communityMotmByMatch: Record<string, Set<string>> = {};
  if (allMatchRatings) {
    const grouped: Record<string, Record<string, number[]>> = {};
    for (const r of allMatchRatings) {
      if (!grouped[r.match_id]) grouped[r.match_id] = {};
      if (!grouped[r.match_id][r.player_id]) grouped[r.match_id][r.player_id] = [];
      grouped[r.match_id][r.player_id].push(Number(r.rating));
    }
    for (const [mid, players] of Object.entries(grouped)) {
      const avgs: Record<string, number> = {};
      let bestAvg = -1;
      for (const [pid, ratings] of Object.entries(players)) {
        const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length;
        avgs[pid] = avg;
        if (avg > bestAvg) bestAvg = avg;
        if (pid === playerId) communityAvgByMatch[mid] = Math.round(avg * 10) / 10;
      }
      const winners = new Set<string>();
      for (const [pid, avg] of Object.entries(avgs)) {
        if (avg === bestAvg) winners.add(pid);
      }
      communityMotmByMatch[mid] = winners;
    }
  }

  // User rating for this player per match + personal MOTM per match (all tied leaders get it)
  const userRatingByMatch: Record<string, number> = {};
  const personalMotmByMatch: Record<string, Set<string>> = {};
  if (allUserMatchRatings) {
    const grouped: Record<string, Record<string, number>> = {};
    for (const r of allUserMatchRatings) {
      if (!grouped[r.match_id]) grouped[r.match_id] = {};
      grouped[r.match_id][r.player_id] = Number(r.rating);
    }
    for (const [mid, players] of Object.entries(grouped)) {
      let bestRating = -1;
      for (const [pid, rating] of Object.entries(players)) {
        if (rating > bestRating) bestRating = rating;
        if (pid === playerId) userRatingByMatch[mid] = rating;
      }
      const winners = new Set<string>();
      for (const [pid, rating] of Object.entries(players)) {
        if (rating === bestRating) winners.add(pid);
      }
      personalMotmByMatch[mid] = winners;
    }
  }

  const history: PlayerRatingHistory[] = (lineupEntries ?? [])
    .map((l: { match_id: string; role: string; sub_minute: number | null; goals: number | null; assists: number | null; match: unknown }) => {
      const matchData = Array.isArray(l.match) ? l.match[0] : l.match;
      const m = matchData as { id: string; date: string; opponent: string; score_against: number | null } | null;
      return {
        match_id: l.match_id,
        match_date: m?.date ?? "",
        opponent: m?.opponent ?? "",
        role: l.role as "starter" | "sub_in",
        sub_minute: l.sub_minute,
        goals: l.goals ?? 0,
        assists: l.assists ?? 0,
        clean_sheet: m?.score_against === 0,
        community_motm: communityMotmByMatch[l.match_id]?.has(playerId) ?? false,
        personal_motm: personalMotmByMatch[l.match_id]?.has(playerId) ?? false,
        user_rating: userRatingByMatch[l.match_id] ?? null,
        community_avg: communityAvgByMatch[l.match_id] ?? null,
      };
    })
    .sort((a: PlayerRatingHistory, b: PlayerRatingHistory) =>
      a.match_date.localeCompare(b.match_date)
    );

  const starts = history.filter(h => h.role === "starter").length;
  const subs   = history.filter(h => h.role === "sub_in").length;
  const totalGoals   = history.reduce((s, h) => s + (h.goals ?? 0), 0);
  const totalAssists = history.reduce((s, h) => s + (h.assists ?? 0), 0);
  const cleanSheets  = history.filter(h => h.clean_sheet).length;

  const allUserRatings    = history.map((h) => h.user_rating).filter(Boolean) as number[];
  const allCommunityAvgs  = history.map((h) => h.community_avg).filter(Boolean) as number[];

  const userSeasonAvg = allUserRatings.length
    ? Math.round((allUserRatings.reduce((s, r) => s + r, 0) / allUserRatings.length) * 10) / 10
    : null;
  const communitySeasonAvg = allCommunityAvgs.length
    ? Math.round((allCommunityAvgs.reduce((s, r) => s + r, 0) / allCommunityAvgs.length) * 10) / 10
    : null;

  const posColor = POSITION_COLORS[player.position ?? ""] ?? "rgba(255,255,255,0.3)";
  const isDefOrGK = player.position === "GK" || player.position === "DEF";

  return (
    <div className="animate-fade-up">
      {/* Back */}
      <Link
        href="/players"
        className="inline-flex items-center gap-2 text-[10px] text-white/20 hover:text-white/50 tracking-[0.35em] uppercase mb-6 transition-colors"
        style={{ fontFamily: "var(--font-condensed)" }}
      >
        ← Squad
      </Link>

      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-xl mb-6"
        style={{
          background: "#0D0D0D",
          border: "1px solid rgba(255,255,255,0.05)",
          minHeight: player.photo_url ? "280px" : "180px",
        }}
      >
        {/* Left red stripe */}
        <div className="absolute top-0 left-0 bottom-0 w-1 z-20" style={{ background: "#DC052D" }} />

        {player.photo_url && (
          <>
            <img
              src={player.photo_url}
              alt={player.name}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: "center 12%" }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to right, rgba(13,13,13,0.97) 0%, rgba(13,13,13,0.72) 55%, rgba(13,13,13,0.25) 100%)",
              }}
            />
          </>
        )}

        {player.squad_number && !player.photo_url && (
          <div
            className="absolute right-4 top-0 leading-none select-none pointer-events-none text-white/[0.04]"
            style={{ fontFamily: "var(--font-display)", fontSize: "120px" }}
          >
            {player.squad_number}
          </div>
        )}

        <div
          className="absolute inset-y-0 left-0 w-1/2 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at left center, rgba(220,5,45,0.10) 0%, transparent 65%)",
          }}
        />

        <div className="relative z-10 pl-8 sm:pl-12 pr-6 py-8 flex items-end justify-between gap-6 flex-wrap">
          {/* Left: identity + stat row */}
          <div className="flex-1 min-w-0">
            {/* Position badge + squad number */}
            <div className="flex items-center gap-3 mb-2">
              {player.position && (
                <span
                  className="text-[9px] font-bold px-2 py-0.5 rounded-sm tracking-[0.3em] uppercase"
                  style={{
                    color: posColor,
                    background: `${posColor}15`,
                    fontFamily: "var(--font-condensed)",
                    border: `1px solid ${posColor}25`,
                  }}
                >
                  {player.position}
                </span>
              )}
              {player.squad_number != null && (
                <span
                  className="text-xl tabular-nums leading-none"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: "rgba(255,255,255,0.35)",
                    letterSpacing: "0.05em",
                  }}
                >
                  #{player.squad_number}
                </span>
              )}
            </div>

            {/* Name */}
            <h1
              className="text-4xl sm:text-6xl text-white leading-none tracking-wider mb-5"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {player.name.toUpperCase()}
            </h1>

            {/* Appearance + performance stats row */}
            <div className="flex items-center gap-5 flex-wrap">
              {/* Starts */}
              <div className="flex flex-col items-center gap-0.5">
                <span
                  className="text-3xl leading-none tabular-nums"
                  style={{ fontFamily: "var(--font-display)", color: starts > 0 ? "#ffffff" : "rgba(255,255,255,0.2)" }}
                >
                  {starts}
                </span>
                <span
                  className="text-[9px] tracking-[0.3em] uppercase"
                  style={{ fontFamily: "var(--font-condensed)", color: "rgba(255,255,255,0.3)" }}
                >
                  Starts
                </span>
              </div>

              <div className="w-px h-8" style={{ background: "rgba(255,255,255,0.08)" }} />

              {/* Subs */}
              <div className="flex flex-col items-center gap-0.5">
                <span
                  className="text-3xl leading-none tabular-nums"
                  style={{ fontFamily: "var(--font-display)", color: subs > 0 ? "#ffffff" : "rgba(255,255,255,0.2)" }}
                >
                  {subs}
                </span>
                <span
                  className="text-[9px] tracking-[0.3em] uppercase"
                  style={{ fontFamily: "var(--font-condensed)", color: "rgba(255,255,255,0.3)" }}
                >
                  Subs
                </span>
              </div>

              <div className="w-px h-8" style={{ background: "rgba(255,255,255,0.08)" }} />

              {/* Goals */}
              <div className="flex flex-col items-center gap-0.5">
                <span
                  className="text-3xl leading-none tabular-nums"
                  style={{ fontFamily: "var(--font-display)", color: totalGoals > 0 ? "#4ade80" : "rgba(255,255,255,0.18)" }}
                >
                  {totalGoals}
                </span>
                <span
                  className="text-[9px] tracking-[0.3em] uppercase"
                  style={{ fontFamily: "var(--font-condensed)", color: "rgba(255,255,255,0.3)" }}
                >
                  Goals
                </span>
              </div>

              <div className="w-px h-8" style={{ background: "rgba(255,255,255,0.08)" }} />

              {/* Assists */}
              <div className="flex flex-col items-center gap-0.5">
                <span
                  className="text-3xl leading-none tabular-nums"
                  style={{ fontFamily: "var(--font-display)", color: totalAssists > 0 ? "#facc15" : "rgba(255,255,255,0.18)" }}
                >
                  {totalAssists}
                </span>
                <span
                  className="text-[9px] tracking-[0.3em] uppercase"
                  style={{ fontFamily: "var(--font-condensed)", color: "rgba(255,255,255,0.3)" }}
                >
                  Assists
                </span>
              </div>

              {/* Clean sheets — GK and DEF only */}
              {isDefOrGK && (
                <>
                  <div className="w-px h-8" style={{ background: "rgba(255,255,255,0.08)" }} />
                  <div className="flex flex-col items-center gap-0.5">
                    <span
                      className="text-3xl leading-none tabular-nums"
                      style={{ fontFamily: "var(--font-display)", color: cleanSheets > 0 ? "#60a5fa" : "rgba(255,255,255,0.18)" }}
                    >
                      {cleanSheets}
                    </span>
                    <span
                      className="text-[9px] tracking-[0.3em] uppercase"
                      style={{ fontFamily: "var(--font-condensed)", color: "rgba(255,255,255,0.3)" }}
                    >
                      Clean Sh.
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right: season rating avgs */}
          <div className="flex gap-8 shrink-0">
            {communitySeasonAvg != null && (
              <div className="text-center">
                <div
                  className="text-5xl leading-none tabular-nums"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: ratingColor(communitySeasonAvg),
                  }}
                >
                  {communitySeasonAvg.toFixed(1)}
                </div>
                <p
                  className="text-[9px] text-white/20 tracking-[0.3em] uppercase mt-1.5"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Community
                </p>
              </div>
            )}
            {userSeasonAvg != null && (
              <div className="text-center">
                <div
                  className="text-5xl leading-none tabular-nums"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: ratingColor(userSeasonAvg),
                  }}
                >
                  {userSeasonAvg.toFixed(1)}
                </div>
                <p
                  className="text-[9px] text-white/20 tracking-[0.3em] uppercase mt-1.5"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  Your avg
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rating graph */}
      <div
        className="relative rounded-xl mb-4 overflow-hidden"
        style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="absolute top-0 left-0 bottom-0 w-1" style={{ background: "#DC052D" }} />
        <div className="pl-8 pr-6 pt-6 pb-6">
          <div className="flex items-center gap-4 mb-5">
            <h2
              className="text-xl text-white tracking-[0.18em]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              RATING HISTORY
            </h2>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          </div>
          <RatingGraph data={history} playerName={player.name} />
        </div>
      </div>

      {/* Match log */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="absolute top-0 left-0 bottom-0 w-1" style={{ background: "#DC052D" }} />
        <div className="pl-8 pr-6 pt-6 pb-6">
          <div className="flex items-center gap-4 mb-5">
            <h2
              className="text-xl text-white tracking-[0.18em]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              MATCH LOG
            </h2>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          </div>

          {history.length === 0 ? (
            <p
              className="text-white/30 text-sm tracking-[0.3em] uppercase"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              No appearances yet.
            </p>
          ) : (
            <div>
              <div className="grid grid-cols-[80px_1fr_72px_72px] gap-4 pb-2 mb-1 border-b border-white/[0.06]">
                {["Role", "Match", "You", "Avg"].map((col) => (
                  <span
                    key={col}
                    className={`text-[11px] text-white/40 tracking-[0.25em] uppercase ${col !== "Role" && col !== "Match" ? "text-center" : ""}`}
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    {col}
                  </span>
                ))}
              </div>
              {[...history].reverse().map((h) => (
                <div
                  key={h.match_id}
                  className="grid grid-cols-[80px_1fr_72px_72px] gap-4 py-3 border-b border-white/[0.04] last:border-0 items-center"
                >
                  {/* Role badge */}
                  <div>
                    {h.role === "starter" ? (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded"
                        style={{
                          background: "rgba(96,165,250,0.12)",
                          color: "#60a5fa",
                          fontFamily: "var(--font-condensed)",
                          letterSpacing: "0.15em",
                        }}
                      >
                        START
                      </span>
                    ) : h.role === "sub_in" ? (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded"
                        style={{
                          background: "rgba(74,222,128,0.12)",
                          color: "#4ade80",
                          fontFamily: "var(--font-condensed)",
                          letterSpacing: "0.15em",
                        }}
                      >
                        SUB{h.sub_minute ? ` ${h.sub_minute}'` : ""}
                      </span>
                    ) : null}
                  </div>

                  {/* Match + per-match stats */}
                  <div>
                    <p
                      className="text-white text-sm font-bold tracking-[0.06em]"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      vs {h.opponent}
                    </p>
                    <p
                      className="text-white/45 text-[11px] mt-0.5"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      {new Date(h.match_date + "T00:00:00").toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    {/* Per-match stat badges */}
                    {((h.goals ?? 0) > 0 || (h.assists ?? 0) > 0 || (isDefOrGK && h.clean_sheet)) && (
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {(h.goals ?? 0) > 0 && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-[2px] rounded"
                            style={{
                              background: "rgba(74,222,128,0.12)",
                              color: "#4ade80",
                              fontFamily: "var(--font-condensed)",
                              letterSpacing: "0.1em",
                            }}
                          >
                            {h.goals}G
                          </span>
                        )}
                        {(h.assists ?? 0) > 0 && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-[2px] rounded"
                            style={{
                              background: "rgba(250,204,21,0.12)",
                              color: "#facc15",
                              fontFamily: "var(--font-condensed)",
                              letterSpacing: "0.1em",
                            }}
                          >
                            {h.assists}A
                          </span>
                        )}
                        {isDefOrGK && h.clean_sheet && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-[2px] rounded"
                            style={{
                              background: "rgba(96,165,250,0.12)",
                              color: "#60a5fa",
                              fontFamily: "var(--font-condensed)",
                              letterSpacing: "0.1em",
                            }}
                          >
                            CS
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Your rating */}
                  <div className="text-center">
                    <span
                      className="text-2xl tabular-nums leading-none"
                      style={{
                        fontFamily: "var(--font-display)",
                        color: h.user_rating ? ratingColor(h.user_rating) : "rgba(255,255,255,0.15)",
                      }}
                    >
                      {h.user_rating ?? "—"}
                    </span>
                  </div>

                  {/* Community avg */}
                  <div className="text-center">
                    <span
                      className="text-2xl tabular-nums leading-none"
                      style={{
                        fontFamily: "var(--font-display)",
                        color: h.community_avg ? ratingColor(h.community_avg) : "rgba(255,255,255,0.15)",
                      }}
                    >
                      {h.community_avg?.toFixed(1) ?? "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
