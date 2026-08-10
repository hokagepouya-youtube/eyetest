"use client";

import { useState } from "react";
import RatingModal from "./RatingModal";
import type { PlayerWithLineup } from "@/lib/types";

const POSITION_STYLES: Record<string, { color: string; label: string }> = {
  GK:  { color: "#facc15", label: "GK"  },
  DEF: { color: "#60a5fa", label: "DEF" },
  MID: { color: "#4ade80", label: "MID" },
  FWD: { color: "#f87171", label: "FWD" },
};

function ratingColor(r: number) {
  if (r >= 8)   return "#4ade80";
  if (r >= 6.5) return "#facc15";
  if (r >= 5)   return "#fb923c";
  return "#f87171";
}

interface Props {
  player: PlayerWithLineup;
  matchId: string;
  userId: string | null;
}

export default function PlayerCard({ player, matchId, userId }: Props) {
  const [userRating, setUserRating]     = useState<number | null>(player.user_rating);
  const [communityAvg, setCommunityAvg] = useState<number | null>(player.community_avg);
  const [modalOpen, setModalOpen]       = useState(false);

  const pos      = player.position ?? "MID";
  const posStyle = POSITION_STYLES[pos] ?? POSITION_STYLES.MID;

  function handleRated(_playerId: string, rating: number, newAvg: number | null) {
    setUserRating(rating);
    setCommunityAvg(newAvg);
  }

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="relative overflow-hidden rounded-xl group text-left w-full cursor-pointer transition-transform duration-200 hover:scale-[1.02]"
        style={{
          background: "#111111",
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: userRating !== null
            ? "0 0 0 1px rgba(220,5,45,0.35), 0 8px 32px rgba(0,0,0,0.5)"
            : "0 4px 24px rgba(0,0,0,0.4)",
        }}
      >
        {/* Left red stripe */}
        <div
          className="absolute top-0 left-0 bottom-0 w-[3px] z-10"
          style={{ background: "#DC052D" }}
        />

        {/* Position top accent line */}
        <div
          className="absolute top-0 left-[3px] right-0 h-[1px] z-10 opacity-60"
          style={{ background: posStyle.color }}
        />

        {/* Photo */}
        <div
          className="relative overflow-hidden"
          style={{ height: "220px", background: "#161616" }}
        >
          {player.photo_url ? (
            <img
              src={player.photo_url}
              alt={player.name}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              style={{ objectPosition: "center 12%" }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span
                className="select-none text-white/[0.04]"
                style={{ fontFamily: "var(--font-display)", fontSize: "90px" }}
              >
                {player.squad_number ?? "?"}
              </span>
            </div>
          )}

          {/* Deep gradient fade */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(to top, #111111 0%, rgba(17,17,17,0.6) 45%, transparent 75%)",
            }}
          />

          {/* Sub minute — top left */}
          {player.role === "sub_in" && player.sub_minute && (
            <div className="absolute top-3 left-5 z-10">
              <span
                className="text-[9px] text-white/50 font-bold tracking-wider px-2 py-0.5 rounded"
                style={{
                  fontFamily: "var(--font-condensed)",
                  background: "rgba(0,0,0,0.55)",
                }}
              >
                ↑ {player.sub_minute}&apos;
              </span>
            </div>
          )}

          {/* Position chip — top right */}
          <div className="absolute top-3 right-3 z-10">
            <span
              className="text-[9px] font-bold px-2 py-0.5 rounded-sm tracking-widest"
              style={{
                background: "rgba(0,0,0,0.6)",
                color: posStyle.color,
                fontFamily: "var(--font-condensed)",
                border: `1px solid ${posStyle.color}30`,
              }}
            >
              {posStyle.label}
            </span>
          </div>

          {/* Community avg — large overlaid number */}
          {communityAvg !== null && (
            <div
              className="absolute bottom-3 right-3 z-10 leading-none tabular-nums"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "48px",
                color: ratingColor(communityAvg),
                opacity: 0.9,
                textShadow: `0 2px 20px ${ratingColor(communityAvg)}60`,
              }}
            >
              {communityAvg.toFixed(1)}
            </div>
          )}

          {/* Squad number — bottom left */}
          {player.squad_number && (
            <div
              className="absolute bottom-[14px] left-5 z-10 leading-none text-white/20"
              style={{ fontFamily: "var(--font-display)", fontSize: "12px" }}
            >
              #{player.squad_number}
            </div>
          )}
        </div>

        {/* Name + rating row */}
        <div className="pl-5 pr-4 pt-3 pb-4">
          <p
            className="text-white font-bold text-[13px] leading-tight tracking-[0.08em] truncate mb-2"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            {player.name.toUpperCase()}
          </p>

          <div className="flex items-center justify-between">
            <span
              className="text-[9px] text-white/20 tracking-[0.3em] uppercase"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              {communityAvg !== null ? "community avg" : "no ratings yet"}
            </span>

            {userRating !== null ? (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-sm tracking-wider"
                style={{
                  background: ratingColor(userRating),
                  color: "#000",
                  fontFamily: "var(--font-condensed)",
                }}
              >
                You: {userRating.toFixed(1)}
              </span>
            ) : (
              <span
                className="text-[9px] text-white/15 tracking-wider uppercase group-hover:text-white/35 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                {userId ? "tap to rate" : "sign in"}
              </span>
            )}
          </div>
        </div>
      </button>

      {modalOpen && (
        <RatingModal
          player={player}
          matchId={matchId}
          userId={userId}
          initialRating={userRating}
          initialAvg={communityAvg}
          onClose={() => setModalOpen(false)}
          onRated={handleRated}
        />
      )}
    </>
  );
}
