"use client";

import { useState } from "react";
import type { Manager } from "@/lib/types";
import ManagerRatingModal from "./ManagerRatingModal";

function ratingColor(r: number) {
  if (r >= 8) return "#4ade80";
  if (r >= 6.5) return "#facc15";
  if (r >= 5) return "#fb923c";
  return "#f87171";
}

interface Props {
  manager: Manager;
  matchId: string;
  userId: string | null;
  communityAvg: number | null;
  userRating: number | null;
}

export default function ManagerCard({
  manager,
  matchId,
  userId,
  communityAvg: initialAvg,
  userRating: initialRating,
}: Props) {
  const [userRating, setUserRating] = useState<number | null>(initialRating);
  const [communityAvg, setCommunityAvg] = useState<number | null>(initialAvg);
  const [modalOpen, setModalOpen] = useState(false);

  function handleRated(_managerId: string, rating: number, newAvg: number | null) {
    setUserRating(rating);
    if (newAvg !== null) setCommunityAvg(newAvg);
  }

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="relative overflow-hidden rounded-lg border border-white/[0.06] hover:border-[#C9A84C]/30 transition-all duration-200 w-full text-left group"
        style={{ background: "#141414" }}
      >
        {/* Gold left stripe */}
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#C9A84C]" />

        {/* Faint "MGR" watermark */}
        <div
          className="absolute right-2 top-1 leading-none select-none pointer-events-none text-white/[0.025] tracking-widest"
          style={{ fontFamily: "var(--font-display)", fontSize: "52px" }}
        >
          MGR
        </div>

        <div className="relative pl-5 pr-4 pt-4 pb-4 flex items-center gap-4">
          {/* Manager photo */}
          {manager.photo_url && (
            <div
              className="w-14 h-14 rounded-full overflow-hidden shrink-0 border border-[#C9A84C]/30"
              style={{ background: "#1A1A1A" }}
            >
              <img
                src={manager.photo_url}
                alt={manager.name}
                className="w-full h-full object-cover"
                style={{ objectPosition: "center 10%" }}
              />
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p
              className="text-[9px] text-white/20 tracking-[0.3em] uppercase mb-1"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Manager
            </p>
            <p
              className="text-white font-bold text-lg leading-tight tracking-wide"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              {manager.name.toUpperCase()}
            </p>
            {userRating !== null ? (
              <p
                className="text-[9px] mt-1.5 tracking-widest uppercase font-bold"
                style={{ fontFamily: "var(--font-condensed)", color: ratingColor(userRating) }}
              >
                Your rating: {userRating.toFixed(1)}
              </p>
            ) : (
              <p
                className="text-[9px] text-white/20 mt-1.5 tracking-widest uppercase group-hover:text-white/35 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                {userId ? "tap to rate" : "sign in to rate"}
              </p>
            )}
          </div>

          {/* Community avg */}
          <div className="text-right shrink-0">
            <span
              className="text-4xl leading-none tabular-nums"
              style={{
                fontFamily: "var(--font-display)",
                color: communityAvg ? ratingColor(communityAvg) : "rgba(255,255,255,0.12)",
              }}
            >
              {communityAvg?.toFixed(1) ?? "—"}
            </span>
            <p
              className="text-[9px] text-white/20 tracking-widest uppercase mt-0.5"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              avg
            </p>
          </div>
        </div>
      </button>

      {modalOpen && (
        <ManagerRatingModal
          manager={manager}
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
