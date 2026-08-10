"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Manager } from "@/lib/types";

function ratingColor(r: number) {
  if (r >= 8)   return "#4ade80";
  if (r >= 6.5) return "#facc15";
  if (r >= 5)   return "#fb923c";
  return "#f87171";
}

interface Props {
  manager: Manager;
  matchId: string;
  userId: string | null;
  initialRating: number | null;
  initialAvg: number | null;
  onClose: () => void;
  onRated: (managerId: string, rating: number, newAvg: number | null) => void;
}

export default function ManagerRatingModal({
  manager,
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

  const fillPct = ((sliderValue - 1) / 9) * 100;
  const color   = ratingColor(sliderValue);

  async function handleSubmit() {
    if (!userId) return;
    setSaving(true);

    const rating = Math.round(sliderValue * 10) / 10;

    const { error } = await supabase.from("manager_ratings").upsert(
      { user_id: userId, match_id: matchId, manager_id: manager.id, rating },
      { onConflict: "user_id,match_id,manager_id" }
    );

    if (error) {
      toast.error("Failed to save rating.");
      setSaving(false);
      return;
    }

    const { data } = await supabase
      .from("manager_ratings")
      .select("rating")
      .eq("match_id", matchId)
      .eq("manager_id", manager.id);

    let newAvg: number | null = null;
    if (data && data.length > 0) {
      const avg = data.reduce((s, r) => s + Number(r.rating), 0) / data.length;
      newAvg = Math.round(avg * 10) / 10;
    }

    toast.success(`${manager.name} — ${rating.toFixed(1)}/10`);
    onRated(manager.id, rating, newAvg);
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
          boxShadow: "0 -8px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(201,168,76,0.15)",
        }}
      >
        {/* Gold manager top line */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px] z-20"
          style={{ background: "#C9A84C" }}
        />

        {/* Manager photo header */}
        <div
          className="relative h-52 overflow-hidden flex items-end"
          style={{ background: "#161616" }}
        >
          {manager.photo_url ? (
            <img
              src={manager.photo_url}
              alt={manager.name}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: "center 10%" }}
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center select-none pointer-events-none text-white/[0.04] tracking-widest"
              style={{ fontFamily: "var(--font-display)", fontSize: "90px" }}
            >
              MGR
            </div>
          )}

          <div
            className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
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

          {/* Manager chip */}
          <div className="absolute top-3 left-3 z-10">
            <span
              className="text-[9px] font-bold px-2 py-1 rounded-sm tracking-wider"
              style={{
                background: "rgba(0,0,0,0.65)",
                color: "#C9A84C",
                fontFamily: "var(--font-condensed)",
                border: "1px solid rgba(201,168,76,0.20)",
              }}
            >
              MANAGER
            </span>
          </div>

          {/* Name overlay */}
          <div className="relative z-10 px-5 pb-4 flex items-end justify-between w-full">
            <p
              className="text-white text-[26px] leading-tight tracking-[0.06em]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {manager.name.toUpperCase()}
            </p>
            {initialAvg !== null && (
              <div className="text-right">
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
        </div>

        {/* Rating section */}
        <div className="px-5 pt-5 pb-6">
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
              <div className="relative h-8 flex items-center mb-2">
                <div
                  className="absolute left-0 right-0 h-2 rounded-full"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  <div
                    className="h-full rounded-full"
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
                className="w-full py-3.5 rounded-xl text-[12px] font-bold tracking-[0.25em] uppercase disabled:opacity-50 transition-all hover:brightness-110 active:scale-[0.98]"
                style={{
                  background: "#C9A84C",
                  color: "#000",
                  fontFamily: "var(--font-condensed)",
                  boxShadow: "0 0 28px rgba(201,168,76,0.22)",
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
                to rate the manager
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
