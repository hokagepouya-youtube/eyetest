import { createClient } from "@/lib/supabase/server";
import MatchHeader from "@/components/MatchHeader";
import FormationPitch from "@/components/FormationPitch";
import PlayerCard from "@/components/PlayerCard";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Player, Manager, MatchLineup } from "@/lib/types";

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: match } = await supabase
    .from("matches")
    .select("*, manager:managers(*)")
    .eq("id", matchId)
    .single();

  if (!match) notFound();

  const [
    { data: lineupRows },
    { data: playerRatingsData },
    { data: managerRatingsData },
  ] = await Promise.all([
    supabase.from("match_lineups").select("*, player:players(*)").eq("match_id", matchId),
    supabase.from("player_ratings").select("player_id, rating").eq("match_id", matchId),
    supabase.from("manager_ratings").select("rating").eq("match_id", matchId).eq("manager_id", match.manager_id ?? ""),
  ]);

  const { data: userRatingsData } = await supabase
    .from("player_ratings")
    .select("player_id, rating")
    .eq("match_id", matchId)
    .eq("user_id", user.id);

  const { data: userManagerRatingData } = match.manager_id
    ? await supabase
        .from("manager_ratings")
        .select("rating")
        .eq("match_id", matchId)
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
    <div className="animate-fade-up">
      {/* Back */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-[10px] text-white/20 hover:text-white/50 tracking-[0.35em] uppercase mb-6 transition-colors"
        style={{ fontFamily: "var(--font-condensed)" }}
      >
        ← Match History
      </Link>

      <MatchHeader match={match} />

      {starters.length > 0 && (
        <section className="mb-12" style={{ animationDelay: "80ms" }}>
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
            matchId={matchId}
            userId={user?.id ?? null}
            manager={manager}
            managerCommunityAvg={managerCommunityAvg}
            managerUserRating={userManagerRatingData ? Number(userManagerRatingData.rating) : null}
          />
        </section>
      )}

      {subs.length > 0 && (
        <section className="mb-12">
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
                matchId={matchId}
                userId={user?.id ?? null}
              />
            ))}
          </div>
        </section>
      )}

      {starters.length === 0 && subs.length === 0 && (
        <div className="text-center py-24">
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
            No lineup entered for this match
          </p>
        </div>
      )}
    </div>
  );
}
