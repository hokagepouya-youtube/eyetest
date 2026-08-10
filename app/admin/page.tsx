import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import AdminMatchActions from "@/components/AdminMatchActions";
import type { Match } from "@/lib/types";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: matches } = await supabase
    .from("matches")
    .select("*, manager:managers(name)")
    .order("date", { ascending: false })
    .limit(20);

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-1 h-8 shrink-0" style={{ background: "#DC052D" }} />
          <div>
            <h1
              className="text-3xl text-white tracking-[0.18em] leading-none"
              style={{ fontFamily: "var(--font-display)" }}
            >
              ADMIN
            </h1>
            <p
              className="text-white/20 text-[10px] tracking-[0.3em] uppercase mt-1"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Manage matches and lineups
            </p>
          </div>
        </div>
        <Link
          href="/admin/matches/new"
          className="px-5 py-2.5 text-[11px] font-bold tracking-[0.2em] uppercase text-white rounded transition-all hover:brightness-110"
          style={{
            background: "#DC052D",
            fontFamily: "var(--font-condensed)",
            boxShadow: "0 0 20px rgba(220,5,45,0.25)",
          }}
        >
          + New Match
        </Link>
      </div>

      {/* Matches table */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Left red stripe */}
        <div className="absolute top-0 left-0 bottom-0 w-1" style={{ background: "#DC052D" }} />

        {/* Table header */}
        <div
          className="pl-8 pr-6 py-4 border-b"
          style={{ borderColor: "rgba(255,255,255,0.05)" }}
        >
          <div className="grid grid-cols-[1fr_auto] gap-4 items-center">
            <div className="grid grid-cols-[1fr_80px_100px_80px] gap-4">
              {["Match", "Score", "Competition", "Date"].map((h) => (
                <span
                  key={h}
                  className="text-[9px] text-white/20 tracking-[0.35em] uppercase"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  {h}
                </span>
              ))}
            </div>
            <span
              className="text-[9px] text-white/20 tracking-[0.35em] uppercase"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Actions
            </span>
          </div>
        </div>

        {!matches?.length ? (
          <div className="pl-8 pr-6 py-12 text-center">
            <p
              className="text-white/15 text-[11px] tracking-[0.35em] uppercase"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              No matches yet — create your first one above
            </p>
          </div>
        ) : (
          <div>
            {matches.map((match: Match & { manager: { name: string } | null }, idx: number) => (
              <div
                key={match.id}
                className="pl-8 pr-6 py-4 border-b last:border-0 transition-colors hover:bg-white/[0.02]"
                style={{
                  borderColor: "rgba(255,255,255,0.04)",
                  animationDelay: `${idx * 40}ms`,
                }}
              >
                <div className="grid grid-cols-[1fr_auto] gap-4 items-center">
                  <div className="grid grid-cols-[1fr_80px_100px_80px] gap-4 items-center">
                    {/* Opponent */}
                    <p
                      className="text-white text-[13px] font-bold tracking-[0.06em] truncate"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      Bayern vs {match.opponent}
                    </p>

                    {/* Score */}
                    <p
                      className="tabular-nums text-[22px] leading-none"
                      style={{
                        fontFamily: "var(--font-display)",
                        color:
                          match.score_for != null && match.score_against != null
                            ? match.score_for > match.score_against
                              ? "#4ade80"
                              : match.score_for < match.score_against
                              ? "#f87171"
                              : "#facc15"
                            : "rgba(255,255,255,0.15)",
                      }}
                    >
                      {match.score_for != null && match.score_against != null
                        ? `${match.score_for}–${match.score_against}`
                        : "—"}
                    </p>

                    {/* Competition */}
                    {match.competition ? (
                      <span
                        className="text-[9px] font-bold tracking-[0.25em] uppercase px-2 py-1 rounded-sm"
                        style={{
                          color: "#DC052D",
                          background: "rgba(220,5,45,0.08)",
                          fontFamily: "var(--font-condensed)",
                          border: "1px solid rgba(220,5,45,0.15)",
                        }}
                      >
                        {match.competition}
                      </span>
                    ) : (
                      <span />
                    )}

                    {/* Date */}
                    <span
                      className="text-white/25 text-[11px]"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      {match.date}
                    </span>
                  </div>

                  {/* Actions */}
                  <AdminMatchActions matchId={match.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
