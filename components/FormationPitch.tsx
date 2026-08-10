"use client";

import { useState } from "react";
import type { PlayerWithLineup, Manager } from "@/lib/types";
import RatingModal from "./RatingModal";
import ManagerRatingModal from "./ManagerRatingModal";

interface Props {
  players: PlayerWithLineup[];
  formation: string | null;
  matchId: string;
  userId: string | null;
  manager?: Manager | null;
  managerCommunityAvg?: number | null;
  managerUserRating?: number | null;
}

interface PlayerState {
  userRating: number | null;
  communityAvg: number | null;
}

// Vertical sort order within a column: lower = top (left touchline side)
const VERT_ORDER: Record<string, number> = {
  GK: 5,
  LWB: 0, LB: 1, LCB: 2, CB: 5, RCB: 8, RB: 9, RWB: 10,
  LDM: 1, CDM: 5, RDM: 9,
  LM: 1, LCM: 2, CM: 5, RCM: 8, RM: 9,
  LAM: 1, CAM: 5, RAM: 9,
  LW: 1, CF: 5, ST: 5, RW: 9, SS: 5,
};

function vertOrder(specificPos: string | null): number {
  return specificPos ? (VERT_ORDER[specificPos] ?? 5) : 5;
}

function parseFormation(formation: string | null): number[] {
  if (!formation) return [4, 3, 3];
  const parts = formation.split("-").map(Number).filter((n) => !isNaN(n) && n > 0);
  return parts.length > 0 ? parts : [4, 3, 3];
}

function ratingColor(r: number) {
  if (r >= 8) return "#4ade80";
  if (r >= 6.5) return "#facc15";
  if (r >= 5) return "#fb923c";
  return "#f87171";
}

function getPositionStyle(pos: string | null): { bg: string; text: string } {
  const p = pos ?? "";
  if (p === "GK") return { bg: "rgba(250,204,21,0.15)", text: "#facc15" };
  if (["LB","RB","CB","LCB","RCB","LWB","RWB","DEF"].includes(p))
    return { bg: "rgba(96,165,250,0.15)", text: "#60a5fa" };
  if (["CDM","CM","LM","RM","CAM","LCM","RCM","LAM","RAM","LDM","RDM","MID"].includes(p))
    return { bg: "rgba(74,222,128,0.15)", text: "#4ade80" };
  return { bg: "rgba(220,5,45,0.18)", text: "#f87171" };
}

function shortName(fullName: string): string {
  const parts = fullName.trim().split(" ");
  if (parts.length === 1) return fullName.toUpperCase();
  const last = parts[parts.length - 1];
  if (last.length <= 3 && parts.length >= 3) {
    return `${parts[parts.length - 2]} ${last}`.toUpperCase();
  }
  return last.toUpperCase();
}

export default function FormationPitch({ players, formation, matchId, userId, manager, managerCommunityAvg, managerUserRating }: Props) {
  const [ratingStates, setRatingStates] = useState<Record<string, PlayerState>>(() => {
    const initial: Record<string, PlayerState> = {};
    for (const p of players) {
      initial[p.id] = { userRating: p.user_rating, communityAvg: p.community_avg };
    }
    return initial;
  });

  const [modalPlayer, setModalPlayer] = useState<PlayerWithLineup | null>(null);
  const [managerModalOpen, setManagerModalOpen] = useState(false);
  const [managerRating, setManagerRating] = useState<number | null>(managerUserRating ?? null);
  const [managerAvg, setManagerAvg] = useState<number | null>(managerCommunityAvg ?? null);

  // --- Column grouping ---
  // If formation_line is set on players, use it; otherwise fall back to position-based grouping.
  const hasFormationLines = players.some((p) => p.formation_line !== null);

  let allColumns: PlayerWithLineup[][];

  if (hasFormationLines) {
    // Group by formation_line, sort by formation_line asc (GK=0 on left, FWD on right)
    const colMap = new Map<number, PlayerWithLineup[]>();
    for (const p of players) {
      const line = p.formation_line ?? 0;
      if (!colMap.has(line)) colMap.set(line, []);
      colMap.get(line)!.push(p);
    }
    const sortedKeys = [...colMap.keys()].sort((a, b) => a - b);
    allColumns = sortedKeys.map((k) =>
      (colMap.get(k) ?? []).sort((a, b) => vertOrder(a.specific_position) - vertOrder(b.specific_position))
    );
  } else {
    // Legacy: group by general position category using formation string
    const rows = parseFormation(formation);
    const posOrder = ["GK", "DEF", "MID", "FWD"];
    const sorted = [...players].sort((a, b) => {
      const ai = posOrder.indexOf(a.position ?? "MID");
      const bi = posOrder.indexOf(b.position ?? "MID");
      if (ai !== bi) return ai - bi;
      return (a.squad_number ?? 99) - (b.squad_number ?? 99);
    });
    const gks = sorted.filter((p) => p.position === "GK");
    const outfield = sorted.filter((p) => p.position !== "GK");
    const pitchCols: PlayerWithLineup[][] = [];
    let idx = 0;
    for (const count of rows) {
      pitchCols.push(outfield.slice(idx, idx + count));
      idx += count;
    }
    allColumns = [gks, ...pitchCols];
  }

  // Find MOTM: all players tied for highest community avg (must have at least one rating)
  const motmIds = (() => {
    let bestAvg = -1;
    for (const col of allColumns) {
      for (const p of col) {
        const avg = ratingStates[p.id]?.communityAvg ?? p.community_avg ?? -1;
        if (avg > bestAvg) bestAvg = avg;
      }
    }
    if (bestAvg <= 0) return new Set<string>();
    const winners = new Set<string>();
    for (const col of allColumns) {
      for (const p of col) {
        const avg = ratingStates[p.id]?.communityAvg ?? p.community_avg ?? -1;
        if (avg === bestAvg) winners.add(p.id);
      }
    }
    return winners;
  })();

  function handleRated(playerId: string, rating: number, newAvg: number | null) {
    setRatingStates((prev) => ({
      ...prev,
      [playerId]: { userRating: rating, communityAvg: newAvg },
    }));
  }

  const modalState = modalPlayer
    ? (ratingStates[modalPlayer.id] ?? {
        userRating: modalPlayer.user_rating,
        communityAvg: modalPlayer.community_avg,
      })
    : null;

  return (
    <>
      <div
        className="relative w-full rounded-xl overflow-hidden"
        style={{
          background: "#2e8b40",
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
        }}
      >
        {/* SVG half-pitch markings: goal line on left, halfway line on right */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Penalty area */}
          <rect x="0" y="16" width="29" height="68" fill="none" stroke="white" strokeWidth="0.45" opacity="0.6" rx="2.5" ry="2.5" />
          {/* Goal box */}
          <rect x="0" y="33" width="10" height="34" fill="none" stroke="white" strokeWidth="0.45" opacity="0.6" rx="1.5" ry="1.5" />
          {/* Penalty spot */}
          <circle cx="19.5" cy="50" r="0.7" fill="white" opacity="0.6" />
          {/* Penalty D arc */}
          <path d="M 29 38 A 17 17 0 0 1 29 62" fill="none" stroke="white" strokeWidth="0.45" opacity="0.6" />
          {/* Centre circle at right edge (halfway line) */}
          <ellipse cx="100" cy="50" rx="14" ry="25" fill="none" stroke="white" strokeWidth="0.45" opacity="0.6" />
          {/* Centre spot */}
          <circle cx="100" cy="50" r="0.7" fill="white" opacity="0.6" />
          {/* Top-left corner arc */}
          <path d="M 0 4 A 4 4 0 0 0 4 0" fill="none" stroke="white" strokeWidth="0.35" opacity="0.45" />
          {/* Bottom-left corner arc */}
          <path d="M 4 100 A 4 4 0 0 0 0 96" fill="none" stroke="white" strokeWidth="0.35" opacity="0.45" />
        </svg>

        {/* Formation label — top-left */}
        {formation && (
          <div className="absolute top-3 left-4 z-10">
            <span
              className="text-white text-2xl tracking-[0.3em] uppercase"
              style={{
                fontFamily: "var(--font-display)",
                textShadow: "0 2px 12px rgba(0,0,0,1), 0 0 20px rgba(0,0,0,0.9)",
              }}
            >
              {formation}
            </span>
          </div>
        )}

        {/* Hint */}
        <div className="absolute bottom-2 right-3 z-10">
          <span
            className="text-white/15 text-[8px] tracking-[0.3em] uppercase"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            {userId ? "tap to rate" : "sign in to rate"}
          </span>
        </div>

        {/* Manager bubble — top-right corner, z-20 to sit above player columns */}
        {manager && (
          <button
            onClick={() => setManagerModalOpen(true)}
            className="absolute top-3 right-3 z-20 flex flex-col items-center gap-1 group"
            title={manager.name}
          >
            <div
              className="rounded-full overflow-hidden border transition-all duration-150 group-hover:scale-110"
              style={{
                width: "80px",
                height: "80px",
                background: "#1A1A1A",
                border: managerRating !== null ? "2.5px solid #C9A84C" : "2px solid rgba(201,168,76,0.35)",
                boxShadow: managerRating !== null ? "0 0 16px rgba(201,168,76,0.5)" : "0 2px 10px rgba(0,0,0,0.6)",
              }}
            >
              {manager.photo_url ? (
                <img
                  src={manager.photo_url}
                  alt={manager.name}
                  className="w-full h-full object-cover"
                  style={{ objectPosition: "center 10%" }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-[#C9A84C]/50 text-[10px] font-bold" style={{ fontFamily: "var(--font-condensed)" }}>
                    MGR
                  </span>
                </div>
              )}
            </div>
            {managerRating !== null && (
              <div
                className="h-6 min-w-[28px] px-1.5 rounded-full flex items-center justify-center border border-black/70 text-[10px] font-bold"
                style={{ background: ratingColor(managerRating), color: "#000", fontFamily: "var(--font-condensed)" }}
              >
                {managerRating.toFixed(1)}
              </div>
            )}
            <span
              className="text-white/50 group-hover:text-white/80 transition-colors leading-none"
              style={{ fontFamily: "var(--font-condensed)", fontSize: "9px" }}
            >
              MGR
            </span>
          </button>
        )}

        {/* Player columns: GK (left) → FWD (right) */}
        <div className="relative z-10 flex flex-row items-stretch py-7 px-3 sm:px-5">
          {allColumns.map((colPlayers, colIdx) => (
            <div
              key={colIdx}
              className="flex flex-col items-center justify-around gap-2 flex-1 py-2"
            >
              {colPlayers.map((player) => {
                const state = ratingStates[player.id] ?? {
                  userRating: player.user_rating,
                  communityAvg: player.community_avg,
                };
                const hasRated = state.userRating !== null;
                const isMotm = motmIds.has(player.id);
                const displayPos = player.specific_position ?? player.position;
                const posStyle = getPositionStyle(displayPos);

                return (
                  <button
                    key={player.id}
                    onClick={() => setModalPlayer(player)}
                    className="flex flex-col items-center gap-[4px] group cursor-pointer"
                    title={player.name}
                  >
                    {/* Photo circle */}
                    <div className="relative">
                      <div
                        className="rounded-full overflow-hidden transition-all duration-150 group-hover:scale-110"
                        style={{
                          width: "80px",
                          height: "80px",
                          border: hasRated
                            ? "2.5px solid #DC052D"
                            : "2px solid rgba(255,255,255,0.22)",
                          boxShadow: hasRated
                            ? "0 0 20px rgba(220,5,45,0.55)"
                            : "0 2px 14px rgba(0,0,0,0.65)",
                          background: "#1A1A1A",
                        }}
                      >
                        {player.photo_url ? (
                          <img
                            src={player.photo_url}
                            alt={player.name}
                            className="w-full h-full object-cover"
                            style={{ objectPosition: "center 15%" }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span
                              className="text-white/30 text-lg leading-none"
                              style={{ fontFamily: "var(--font-display)" }}
                            >
                              {player.squad_number ?? "?"}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Rating badge: user's own rating; blue + star if MOTM */}
                      {(hasRated || isMotm) && (
                        <div
                          className="absolute -bottom-1 -right-1 h-6 min-w-[28px] px-1.5 rounded-full flex items-center justify-center gap-[2px] border border-black/70 text-[10px] font-bold"
                          style={{
                            background: isMotm ? "#3b82f6" : ratingColor(state.userRating!),
                            color: isMotm ? "#fff" : "#000",
                            fontFamily: "var(--font-condensed)",
                          }}
                        >
                          {hasRated && state.userRating!.toFixed(1)}
                          {isMotm && <span style={{ fontSize: "10px" }}>★</span>}
                        </div>
                      )}

                      {/* Goal / assist badges — top-right */}
                      {((player.goals ?? 0) > 0 || (player.assists ?? 0) > 0) && (
                        <div className="absolute -top-1.5 -right-1.5 flex flex-col gap-[3px] z-10">
                          {(player.goals ?? 0) > 0 && (
                            <div
                              className="flex items-center gap-[3px] rounded-full"
                              style={{
                                height: "17px",
                                paddingLeft: "4px",
                                paddingRight: "5px",
                                background: "#16a34a",
                                border: "1.5px solid rgba(0,0,0,0.5)",
                                boxShadow: "0 1px 6px rgba(0,0,0,0.7)",
                              }}
                            >
                              <img src="/goal-icon.svg" alt="goal" width={11} height={11} style={{ flexShrink: 0 }} />
                              <span
                                style={{
                                  fontFamily: "var(--font-condensed)",
                                  fontSize: "9px",
                                  color: "white",
                                  fontWeight: "bold",
                                  lineHeight: 1,
                                }}
                              >
                                {player.goals}
                              </span>
                            </div>
                          )}
                          {(player.assists ?? 0) > 0 && (
                            <div
                              className="flex items-center gap-[3px] rounded-full"
                              style={{
                                height: "17px",
                                paddingLeft: "4px",
                                paddingRight: "5px",
                                background: "#92400e",
                                border: "1.5px solid rgba(0,0,0,0.5)",
                                boxShadow: "0 1px 6px rgba(0,0,0,0.7)",
                              }}
                            >
                              <img src="/assist-icon.svg" alt="assist" width={11} height={11} style={{ flexShrink: 0 }} />
                              <span
                                style={{
                                  fontFamily: "var(--font-condensed)",
                                  fontSize: "9px",
                                  color: "white",
                                  fontWeight: "bold",
                                  lineHeight: 1,
                                }}
                              >
                                {player.assists}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Short name with squad number */}
                    <span
                      className="text-center text-white font-bold leading-none"
                      style={{
                        fontFamily: "var(--font-condensed)",
                        fontSize: "13px",
                        maxWidth: "92px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        textShadow: "0 1px 4px rgba(0,0,0,1), 0 0 8px rgba(0,0,0,0.9)",
                      }}
                    >
                      {player.squad_number != null && (
                        <span className="text-white mr-[3px]">{player.squad_number}</span>
                      )}
                      {shortName(player.name)}
                    </span>

                    {/* Specific position badge */}
                    {displayPos && displayPos !== "GK" && (
                      <span
                        className="text-[8px] font-bold leading-none px-1.5 py-[2px] rounded"
                        style={{
                          background: posStyle.bg,
                          color: posStyle.text,
                          fontFamily: "var(--font-condensed)",
                        }}
                      >
                        {displayPos}
                      </span>
                    )}

                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {modalPlayer && modalState && (
        <RatingModal
          player={modalPlayer}
          matchId={matchId}
          userId={userId}
          initialRating={modalState.userRating}
          initialAvg={modalState.communityAvg}
          onClose={() => setModalPlayer(null)}
          onRated={handleRated}
        />
      )}

      {manager && managerModalOpen && (
        <ManagerRatingModal
          manager={manager}
          matchId={matchId}
          userId={userId}
          initialRating={managerRating}
          initialAvg={managerAvg}
          onClose={() => setManagerModalOpen(false)}
          onRated={(_id, rating, newAvg) => {
            setManagerRating(rating);
            if (newAvg !== null) setManagerAvg(newAvg);
          }}
        />
      )}
    </>
  );
}
