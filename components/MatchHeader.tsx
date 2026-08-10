import type { Match } from "@/lib/types";

interface Props {
  match: Match & { manager?: { name: string } | null };
}

export default function MatchHeader({ match }: Props) {
  const hasScore = match.score_for != null && match.score_against != null;

  const win  = hasScore && match.score_for! > match.score_against!;
  const loss = hasScore && match.score_for! < match.score_against!;
  const draw = hasScore && match.score_for! === match.score_against!;

  const scoreColor = win ? "#4ade80" : loss ? "#f87171" : draw ? "#facc15" : "#ffffff";
  const resultGlow = win
    ? "rgba(74,222,128,0.10)"
    : loss
    ? "rgba(248,113,113,0.08)"
    : "rgba(250,204,21,0.07)";

  const dateFormatted = match.date
    ? new Date(match.date + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <div
      className="relative overflow-hidden rounded-xl mb-8 animate-fade-up"
      style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.05)" }}
    >
      {/* Left red stripe — the signature structural accent */}
      <div
        className="absolute top-0 left-0 bottom-0 w-1 z-10"
        style={{ background: "#DC052D" }}
      />

      {/* Red atmospheric glow — left */}
      <div
        className="absolute inset-y-0 left-0 w-2/5 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at left center, rgba(220,5,45,0.14) 0%, transparent 65%)",
        }}
      />

      {/* Result glow — right */}
      {hasScore && (
        <div
          className="absolute inset-y-0 right-0 w-1/3 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at right center, ${resultGlow} 0%, transparent 70%)`,
          }}
        />
      )}

      {/* Diagonal grain texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-45deg, white 0, white 1px, transparent 0, transparent 50%)",
          backgroundSize: "6px 6px",
        }}
      />


      <div className="relative pl-8 pr-6 sm:pl-12 sm:pr-10 py-7">
        {/* Competition + Date */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-7">
          {match.competition && (
            <span
              className="text-[22px] font-bold tracking-[0.45em] uppercase"
              style={{ color: "#DC052D", fontFamily: "var(--font-condensed)" }}
            >
              {match.competition}
            </span>
          )}
          {match.competition && dateFormatted && (
            <span className="text-white/15 text-xl">—</span>
          )}
          {dateFormatted && (
            <span
              className="text-white/35 text-[22px] tracking-[0.12em]"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              {dateFormatted}
            </span>
          )}
        </div>

        {/* Matchup */}
        <div className="flex items-center justify-between gap-4">

          {/* Bayern side */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <img
                src="/fcb-badge.svg"
                alt="FC Bayern München"
                className="w-9 h-11 shrink-0"
              />
              <h1
                className="text-white text-3xl sm:text-5xl leading-none tracking-wider truncate"
                style={{ fontFamily: "var(--font-display)" }}
              >
                BAYERN MÜNCHEN
              </h1>
            </div>
          </div>

          {/* Score */}
          <div className="text-center shrink-0 px-2">
            {hasScore ? (
              <div
                className="tabular-nums leading-none"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(52px, 9vw, 100px)",
                  color: scoreColor,
                  textShadow: `0 0 40px ${scoreColor}40`,
                }}
              >
                {match.score_for} — {match.score_against}
              </div>
            ) : (
              <div
                className="text-white/10 leading-none"
                style={{ fontFamily: "var(--font-display)", fontSize: "clamp(40px, 7vw, 80px)" }}
              >
                VS
              </div>
            )}
          </div>

          {/* Opponent side */}
          <div className="flex-1 min-w-0 text-right">
            <div className="flex items-center justify-end gap-3">
              <h2
                className="text-white text-3xl sm:text-5xl leading-none tracking-wider truncate"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {match.opponent.toUpperCase()}
              </h2>
              {match.opponent_logo_url && (
                <img
                  src={match.opponent_logo_url}
                  alt={match.opponent}
                  className="w-9 h-11 shrink-0 object-contain"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
