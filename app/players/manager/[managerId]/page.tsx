import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import RatingGraph from "@/components/RatingGraph";
import type { PlayerRatingHistory } from "@/lib/types";

const ratingColor = (r: number) => {
  if (r >= 8)   return "#4ade80";
  if (r >= 6.5) return "#facc15";
  if (r >= 5)   return "#fb923c";
  return "#f87171";
};

export default async function ManagerDetailPage({
  params,
}: {
  params: Promise<{ managerId: string }>;
}) {
  const { managerId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: manager } = await supabase
    .from("managers")
    .select("*")
    .eq("id", managerId)
    .single();

  if (!manager) notFound();

  // All matches this manager was in charge of
  const { data: matches } = await supabase
    .from("matches")
    .select("id, date, opponent")
    .eq("manager_id", managerId)
    .order("date");

  const matchIds = (matches ?? []).map((m: { id: string }) => m.id);

  const { data: communityRatings } = matchIds.length
    ? await supabase
        .from("manager_ratings")
        .select("match_id, rating")
        .eq("manager_id", managerId)
        .in("match_id", matchIds)
    : { data: [] };

  const { data: userRatings } = user && matchIds.length
    ? await supabase
        .from("manager_ratings")
        .select("match_id, rating")
        .eq("manager_id", managerId)
        .eq("user_id", user.id)
        .in("match_id", matchIds)
    : { data: [] };

  const communityAvgByMatch: Record<string, number> = {};
  if (communityRatings) {
    const grouped: Record<string, number[]> = {};
    for (const r of communityRatings) {
      if (!grouped[r.match_id]) grouped[r.match_id] = [];
      grouped[r.match_id].push(r.rating);
    }
    for (const [mid, ratings] of Object.entries(grouped)) {
      communityAvgByMatch[mid] =
        Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10;
    }
  }

  const userRatingByMatch: Record<string, number> = {};
  if (userRatings) {
    for (const r of userRatings) userRatingByMatch[r.match_id] = r.rating;
  }

  // Build history (no role — manager doesn't start/sub)
  const history: PlayerRatingHistory[] = (matches ?? [])
    .map((m: { id: string; date: string; opponent: string }) => ({
      match_id: m.id,
      match_date: m.date,
      opponent: m.opponent,
      user_rating: userRatingByMatch[m.id] ?? null,
      community_avg: communityAvgByMatch[m.id] ?? null,
    }));

  const allUserRatings   = history.map((h) => h.user_rating).filter(Boolean) as number[];
  const allCommunityAvgs = history.map((h) => h.community_avg).filter(Boolean) as number[];

  const userSeasonAvg = allUserRatings.length
    ? Math.round((allUserRatings.reduce((s, r) => s + r, 0) / allUserRatings.length) * 10) / 10
    : null;
  const communitySeasonAvg = allCommunityAvgs.length
    ? Math.round((allCommunityAvgs.reduce((s, r) => s + r, 0) / allCommunityAvgs.length) * 10) / 10
    : null;

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
          minHeight: manager.photo_url ? "260px" : "160px",
        }}
      >
        {/* Left gold stripe */}
        <div className="absolute top-0 left-0 bottom-0 w-1 z-20" style={{ background: "#C9A84C" }} />

        {manager.photo_url && (
          <>
            <img
              src={manager.photo_url}
              alt={manager.name}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: "center 12%" }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to right, rgba(13,13,13,0.97) 0%, rgba(13,13,13,0.65) 50%, rgba(13,13,13,0.20) 100%)",
              }}
            />
          </>
        )}

        {/* Gold atmospheric glow */}
        <div
          className="absolute inset-y-0 left-0 w-1/2 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at left center, rgba(201,168,76,0.08) 0%, transparent 65%)",
          }}
        />

        <div className="relative z-10 pl-8 sm:pl-12 pr-6 py-8 flex items-end justify-between gap-6 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span
                className="text-[9px] font-bold px-2 py-0.5 rounded-sm tracking-[0.3em] uppercase"
                style={{
                  color: "#C9A84C",
                  background: "rgba(201,168,76,0.12)",
                  fontFamily: "var(--font-condensed)",
                  border: "1px solid rgba(201,168,76,0.22)",
                }}
              >
                Head Coach
              </span>
              <span
                className="text-white/25 text-[9px] tracking-[0.28em]"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                {history.length} {history.length === 1 ? "match" : "matches"}
              </span>
            </div>
            <h1
              className="text-4xl sm:text-6xl text-white leading-none tracking-wider"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {manager.name.toUpperCase()}
            </h1>
          </div>

          {/* Season stats */}
          <div className="flex gap-8 shrink-0">
            {communitySeasonAvg != null && (
              <div className="text-center">
                <div
                  className="text-5xl leading-none tabular-nums"
                  style={{ fontFamily: "var(--font-display)", color: ratingColor(communitySeasonAvg) }}
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
                  style={{ fontFamily: "var(--font-display)", color: ratingColor(userSeasonAvg) }}
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
        <div className="absolute top-0 left-0 bottom-0 w-1" style={{ background: "#C9A84C" }} />
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
          <RatingGraph data={history} playerName={manager.name} />
        </div>
      </div>

      {/* Match log */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="absolute top-0 left-0 bottom-0 w-1" style={{ background: "#C9A84C" }} />
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
              No matches yet.
            </p>
          ) : (
            <div>
              <div className="grid grid-cols-[1fr_72px_72px] gap-4 pb-2 mb-1 border-b border-white/[0.06]">
                {["Match", "You", "Avg"].map((col) => (
                  <span
                    key={col}
                    className={`text-[11px] text-white/40 tracking-[0.25em] uppercase ${col !== "Match" ? "text-center" : ""}`}
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    {col}
                  </span>
                ))}
              </div>
              {[...history].reverse().map((h) => (
                <div
                  key={h.match_id}
                  className="grid grid-cols-[1fr_72px_72px] gap-4 py-3 border-b border-white/[0.04] last:border-0 items-center"
                >
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
                  </div>
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
