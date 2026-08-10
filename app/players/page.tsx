import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Player, Manager } from "@/lib/types";

const POSITION_ORDER = ["GK", "DEF", "MID", "FWD"];

const POSITION_META: Record<string, { label: string; color: string }> = {
  GK:  { label: "Goalkeepers", color: "#facc15" },
  DEF: { label: "Defenders",   color: "#60a5fa" },
  MID: { label: "Midfielders", color: "#4ade80" },
  FWD: { label: "Forwards",    color: "#f87171" },
};

export default async function PlayersPage() {
  const supabase = await createClient();
  const [{ data: players }, { data: managers }] = await Promise.all([
    supabase.from("players").select("*").eq("active", true).order("squad_number"),
    supabase.from("managers").select("*").eq("active", true),
  ]);

  const grouped = POSITION_ORDER.map((pos) => ({
    pos,
    meta: POSITION_META[pos],
    players: (players ?? []).filter((p: Player) => p.position === pos),
  })).filter((g) => g.players.length > 0);

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-1 h-8 shrink-0" style={{ background: "#DC052D" }} />
          <h1
            className="text-4xl text-white tracking-[0.18em] leading-none"
            style={{ fontFamily: "var(--font-display)" }}
          >
            SQUAD
          </h1>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          <span
            className="text-[9px] text-white/20 tracking-[0.35em] uppercase shrink-0"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            {players?.length ?? 0} players
          </span>
        </div>
        <p
          className="text-white/25 text-[11px] tracking-[0.28em] uppercase pl-5"
          style={{ fontFamily: "var(--font-condensed)" }}
        >
          Click a player to view their rating history
        </p>
      </div>

      {grouped.map(({ pos, meta, players: groupPlayers }) => (
        <section key={pos} className="mb-10">
          {/* Position label */}
          <div className="flex items-center gap-3 mb-4 pl-1">
            <div className="w-0.5 h-4 rounded-full shrink-0" style={{ background: meta.color }} />
            <span
              className="text-[10px] font-bold tracking-[0.35em] uppercase"
              style={{ color: meta.color, fontFamily: "var(--font-condensed)" }}
            >
              {meta.label}
            </span>
            <div className="flex-1 h-px" style={{ background: `${meta.color}18` }} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {groupPlayers.map((player: Player) => (
              <Link key={player.id} href={`/players/${player.id}`}>
                <div
                  className="relative overflow-hidden rounded-xl group cursor-pointer transition-all duration-200 hover:scale-[1.02]"
                  style={{
                    background: "#111111",
                    border: "1px solid rgba(255,255,255,0.05)",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                  }}
                >
                  {/* Position color top line */}
                  <div
                    className="absolute top-0 left-0 right-0 h-[2px] z-10"
                    style={{ background: meta.color, opacity: 0.7 }}
                  />

                  {/* Photo */}
                  <div
                    className="relative overflow-hidden"
                    style={{ aspectRatio: "3/4", background: "#161616" }}
                  >
                    {player.photo_url ? (
                      <img
                        src={player.photo_url}
                        alt={player.name}
                        loading="lazy"
                        className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span
                          className="text-white/[0.05] select-none"
                          style={{ fontFamily: "var(--font-display)", fontSize: "56px" }}
                        >
                          {player.squad_number ?? "?"}
                        </span>
                      </div>
                    )}

                    {/* Gradient */}
                    <div
                      className="absolute bottom-0 left-0 right-0 h-2/3 pointer-events-none"
                      style={{
                        background:
                          "linear-gradient(to top, #111111 15%, rgba(17,17,17,0.5) 55%, transparent)",
                      }}
                    />

                    {/* Squad number */}
                    <div
                      className="absolute bottom-2 left-2.5 z-10 leading-none"
                      style={{
                        color: meta.color,
                        fontFamily: "var(--font-display)",
                        fontSize: "11px",
                        opacity: 0.6,
                      }}
                    >
                      {player.squad_number != null ? `#${player.squad_number}` : ""}
                    </div>
                  </div>

                  {/* Name */}
                  <div className="px-2.5 py-2.5">
                    <p
                      className="text-white text-[11px] font-bold leading-tight tracking-[0.06em] truncate"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      {player.name.toUpperCase()}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {/* Coaching staff */}
      {managers && managers.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4 pl-1">
            <div className="w-0.5 h-4 rounded-full shrink-0" style={{ background: "#C9A84C" }} />
            <span
              className="text-[10px] font-bold tracking-[0.35em] uppercase"
              style={{ color: "#C9A84C", fontFamily: "var(--font-condensed)" }}
            >
              Coaching Staff
            </span>
            <div className="flex-1 h-px" style={{ background: "rgba(201,168,76,0.15)" }} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {(managers as Manager[]).map((manager) => (
              <Link key={manager.id} href={`/players/manager/${manager.id}`}>
                <div
                  className="relative overflow-hidden rounded-xl group cursor-pointer transition-all duration-200 hover:scale-[1.02]"
                  style={{
                    background: "#111111",
                    border: "1px solid rgba(255,255,255,0.05)",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                  }}
                >
                  {/* Gold top line */}
                  <div
                    className="absolute top-0 left-0 right-0 h-[2px] z-10"
                    style={{ background: "#C9A84C", opacity: 0.7 }}
                  />
                  {/* Photo */}
                  <div
                    className="relative overflow-hidden"
                    style={{ aspectRatio: "3/4", background: "#161616" }}
                  >
                    {manager.photo_url ? (
                      <img
                        src={manager.photo_url}
                        alt={manager.name}
                        loading="lazy"
                        className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span
                          className="text-white/[0.05] select-none"
                          style={{ fontFamily: "var(--font-display)", fontSize: "48px" }}
                        >
                          MGR
                        </span>
                      </div>
                    )}
                    <div
                      className="absolute bottom-0 left-0 right-0 h-2/3 pointer-events-none"
                      style={{
                        background: "linear-gradient(to top, #111111 15%, rgba(17,17,17,0.5) 55%, transparent)",
                      }}
                    />
                    <div
                      className="absolute bottom-2 left-2.5 z-10 leading-none text-[10px]"
                      style={{ color: "#C9A84C", fontFamily: "var(--font-display)", opacity: 0.6 }}
                    >
                      MGR
                    </div>
                  </div>
                  <div className="px-2.5 py-2.5">
                    <p
                      className="text-white text-[11px] font-bold leading-tight tracking-[0.06em] truncate"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      {manager.name.toUpperCase()}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {(!players || players.length === 0) && (
        <div className="text-center py-24">
          <p
            className="text-[72px] leading-none text-white/[0.05] tracking-[0.15em]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            NO PLAYERS
          </p>
        </div>
      )}
    </div>
  );
}
