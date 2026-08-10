"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
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
  initialRating: number | null;
  initialAvg: number | null;
  onClose: () => void;
  onRated: (playerId: string, rating: number, newAvg: number | null) => void;
}

export default function RatingModal({
  player,
  matchId,
  userId,
  initialRating,
  initialAvg,
  onClose,
  onRated,
}: Props) {
  const supabase = createClient();
  const [sliderValue, setSliderValue] = useState<number>(initialRating ?? 7.0);
  const [saving, setSaving] = useState(false);

  const pos      = player.position ?? "MID";
  const posStyle = POSITION_STYLES[pos] ?? POSITION_STYLES.MID;
  const fillPct  = ((sliderValue - 1) / 9) * 100;
  const color    = ratingColor(sliderValue);

  async function handleSubmit() {
    if (!userId) return;
    setSaving(true);

    const rating = Math.round(sliderValue * 10) / 10;

    const { error } = await supabase.from("player_ratings").upsert(
      { user_id: userId, match_id: matchId, player_id: player.id, rating },
      { onConflict: "user_id,match_id,player_id" }
    );

    if (error) {
      toast.error("Failed to save rating.");
      setSaving(false);
      return;
    }

    const { data } = await supabase
      .from("player_ratings")
      .select("rating")
      .eq("match_id", matchId)
      .eq("player_id", player.id);

    let newAvg: number | null = null;
    if (data && data.length > 0) {
      const avg = data.reduce((s, r) => s + Number(r.rating), 0) / data.length;
      newAvg = Math.round(avg * 10) / 10;
    }

    const shortName = player.name.split(" ").pop() ?? player.name;
    toast.success(`${shortName} — ${rating.toFixed(1)}/10`);
    onRated(player.id, rating, newAvg);
    setSaving(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{
          background: "#111111",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 -8px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(220,5,45,0.15)",
        }}
      >
        {/* Position-colored top line */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px] z-20"
          style={{ background: posStyle.color }}
        />

        {/* Player photo */}
        <div className="relative h-56 overflow-hidden" style={{ background: "#161616" }}>
          {player.photo_url ? (
            <img
              src={player.photo_url}
              alt={player.name}
              className="w-full h-full object-cover"
              style={{ objectPosition: "center 10%" }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span
                className="select-none text-white/[0.04]"
                style={{ fontFamily: "var(--font-display)", fontSize: "140px" }}
              >
                {player.squad_number ?? "?"}
              </span>
            </div>
          )}

          {/* Gradient */}
          <div
            className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
            style={{ background: "linear-gradient(to top, #111111 25%, transparent)" }}
          />

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white/80 transition-colors z-10 text-sm"
            style={{ background: "rgba(0,0,0,0.6)" }}
          >
            ✕
          </button>

          {/* Position + number */}
          <div className="absolute top-3 left-3 z-10">
            <span
              className="text-[9px] font-bold px-2 py-1 rounded-sm tracking-wider"
              style={{
                background: "rgba(0,0,0,0.65)",
                color: posStyle.color,
                fontFamily: "var(--font-condensed)",
                border: `1px solid ${posStyle.color}25`,
              }}
            >
              {posStyle.label}
              {player.squad_number ? ` · #${player.squad_number}` : ""}
            </span>
          </div>

          {/* Name overlay */}
          <div className="absolute bottom-4 left-5 right-16 z-10">
            <p
              className="text-white text-[26px] leading-tight tracking-[0.06em] truncate"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {player.name.toUpperCase()}
            </p>
          </div>

          {/* Community avg — top right corner of photo */}
          {initialAvg !== null && (
            <div className="absolute bottom-4 right-5 z-10 text-right">
              <p
                className="text-[9px] text-white/20 tracking-[0.25em] uppercase leading-none mb-0.5"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Community
              </p>
              <span
                className="text-3xl leading-none tabular-nums"
                style={{ fontFamily: "var(--font-display)", color: ratingColor(initialAvg) }}
              >
                {initialAvg.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* Rating section */}
        <div className="px-5 pt-5 pb-6">
          {/* Big live rating */}
          <div className="text-center mb-4">
            <span
              className="tabular-nums leading-none"
              style={{ fontFamily: "var(--font-display)", fontSize: "96px", color }}
            >
              {sliderValue.toFixed(1)}
            </span>
            <span
              className="text-white/15 text-lg ml-1"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              /10
            </span>
          </div>

          {userId ? (
            <>
              {/* Slider */}
              <div className="relative h-8 flex items-center mb-2">
                <div
                  className="absolute left-0 right-0 h-2 rounded-full"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  <div
                    className="h-full rounded-full transition-none"
                    style={{ width: `${fillPct}%`, background: color }}
                  />
                </div>
                <div
                  className="absolute w-5 h-5 rounded-full border-[2.5px] pointer-events-none"
                  style={{
                    left: `calc(${fillPct}% - 10px)`,
                    background: color,
                    borderColor: "rgba(255,255,255,0.7)",
                    boxShadow: `0 0 16px ${color}80`,
                  }}
                />
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={0.1}
                  value={sliderValue}
                  onChange={(e) => setSliderValue(parseFloat(e.target.value))}
                  className="absolute inset-0 w-full cursor-pointer rating-range"
                  style={{ opacity: 0 }}
                />
              </div>

              <div className="flex justify-between mb-5">
                <span className="text-[9px] text-white/12" style={{ fontFamily: "var(--font-condensed)" }}>1.0</span>
                <span className="text-[9px] text-white/12" style={{ fontFamily: "var(--font-condensed)" }}>10.0</span>
              </div>

              <button
                onClick={handleSubmit}
                disabled={saving}
                className="w-full py-3.5 rounded-xl text-[12px] font-bold tracking-[0.25em] uppercase text-white disabled:opacity-50 transition-all hover:brightness-110 active:scale-[0.98]"
                style={{
                  background: "#DC052D",
                  fontFamily: "var(--font-condensed)",
                  boxShadow: "0 0 28px rgba(220,5,45,0.28)",
                }}
              >
                {saving ? "Saving…" : initialRating !== null ? "Update Rating" : "Submit Rating"}
              </button>
            </>
          ) : (
            <div className="text-center py-3">
              <p className="text-[11px] text-white/20 tracking-wider" style={{ fontFamily: "var(--font-condensed)" }}>
                <a href="/auth/login" className="text-white/45 hover:text-white underline-offset-2 hover:underline transition-colors">
                  Sign in
                </a>{" "}
                to rate players
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
