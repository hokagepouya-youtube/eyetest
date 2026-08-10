"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Player, Match, MatchLineup } from "@/lib/types";

// Each formation maps to column arrays of specific position slots
// Column 0 = GK line, Column 1 = first outfield line, etc.
const FORMATION_TEMPLATES: Record<string, string[][]> = {
  "4-3-3":   [["GK"], ["LB", "LCB", "RCB", "RB"], ["LCM", "CM", "RCM"], ["LW", "ST", "RW"]],
  "4-2-3-1": [["GK"], ["LB", "LCB", "RCB", "RB"], ["LDM", "RDM"], ["LAM", "CAM", "RAM"], ["ST"]],
  "4-4-2":   [["GK"], ["LB", "LCB", "RCB", "RB"], ["LM", "LCM", "RCM", "RM"], ["CF", "ST"]],
  "3-4-3":   [["GK"], ["LCB", "CB", "RCB"], ["LWB", "LCM", "RCM", "RWB"], ["LW", "ST", "RW"]],
  "3-5-2":   [["GK"], ["LCB", "CB", "RCB"], ["LWB", "LCM", "CM", "RCM", "RWB"], ["CF", "ST"]],
  "4-1-4-1": [["GK"], ["LB", "LCB", "RCB", "RB"], ["CDM"], ["LM", "LCM", "RCM", "RM"], ["ST"]],
  "4-4-1-1": [["GK"], ["LB", "LCB", "RCB", "RB"], ["LM", "LCM", "RCM", "RM"], ["SS"], ["ST"]],
  "3-4-2-1": [["GK"], ["LCB", "CB", "RCB"], ["LWB", "LCM", "RCM", "RWB"], ["LAM", "RAM"], ["ST"]],
  "5-3-2":   [["GK"], ["LWB", "LCB", "CB", "RCB", "RWB"], ["LCM", "CM", "RCM"], ["CF", "ST"]],
  "4-3-2-1": [["GK"], ["LB", "LCB", "RCB", "RB"], ["LCM", "CM", "RCM"], ["LAM", "RAM"], ["ST"]],
};

const POS_GROUPS = [
  { group: "Goalkeepers", options: ["GK"] },
  { group: "Defenders", options: ["LB", "LWB", "LCB", "CB", "RCB", "RB", "RWB"] },
  { group: "Midfielders", options: ["CDM", "LDM", "RDM", "LM", "LCM", "CM", "RCM", "RM", "CAM", "LAM", "RAM"] },
  { group: "Forwards", options: ["LW", "RW", "CF", "SS", "ST"] },
];

interface PitchSlot {
  position: string;
  playerId: string | null;
}

interface SubEntry {
  uid: string;
  playerId: string | null;
  specificPosition: string;
  subMinute: string;
}

type ActivePicker =
  | { kind: "pitch"; colIdx: number; slotIdx: number; position: string }
  | { kind: "sub"; uid: string };

function posColor(pos: string): { bg: string; text: string } {
  if (pos === "GK") return { bg: "rgba(250,204,21,0.18)", text: "#facc15" };
  if (["LB","RB","CB","LCB","RCB","LWB","RWB"].includes(pos))
    return { bg: "rgba(96,165,250,0.18)", text: "#60a5fa" };
  if (["CDM","LDM","RDM","LM","RM","LCM","RCM","CM","CAM","LAM","RAM"].includes(pos))
    return { bg: "rgba(74,222,128,0.18)", text: "#4ade80" };
  return { bg: "rgba(220,5,45,0.22)", text: "#f87171" };
}

function shortName(name: string) {
  const parts = name.trim().split(" ");
  if (parts.length === 1) return name.toUpperCase();
  const last = parts[parts.length - 1];
  if (last.length <= 3 && parts.length >= 3) return `${parts[parts.length - 2]} ${last}`.toUpperCase();
  return last.toUpperCase();
}

export default function LineupPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [match, setMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [slots, setSlots] = useState<PitchSlot[][]>([]);
  const [subs, setSubs] = useState<SubEntry[]>([]);
  const [activePicker, setActivePicker] = useState<ActivePicker | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [statsMap, setStatsMap] = useState<Record<string, { goals: number; assists: number }>>({});

  useEffect(() => {
    async function load() {
      const [{ data: matchData }, { data: playerData }, { data: lineupData }] = await Promise.all([
        supabase.from("matches").select("*").eq("id", matchId).single(),
        supabase.from("players").select("*").eq("active", true).order("squad_number"),
        supabase.from("match_lineups").select("*").eq("match_id", matchId),
      ]);

      if (matchData) setMatch(matchData);
      if (playerData) setPlayers(playerData);

      const formation = matchData?.formation ?? null;
      const template = FORMATION_TEMPLATES[formation ?? ""] ?? null;

      if (template) {
        const initialSlots: PitchSlot[][] = template.map((colPositions, colIdx) =>
          colPositions.map((position) => ({
            position,
            playerId:
              lineupData?.find(
                (l: MatchLineup) =>
                  l.specific_position === position &&
                  l.role === "starter" &&
                  l.formation_line === colIdx
              )?.player_id ?? null,
          }))
        );
        setSlots(initialSlots);
      }

      const subLineups = lineupData?.filter((l: MatchLineup) => l.role === "sub_in") ?? [];
      setSubs(
        subLineups.map((l: MatchLineup) => ({
          uid: l.id,
          playerId: l.player_id,
          specificPosition: l.specific_position ?? "",
          subMinute: l.sub_minute?.toString() ?? "",
        }))
      );

      // Load existing goals/assists
      const initialStats: Record<string, { goals: number; assists: number }> = {};
      for (const l of lineupData ?? []) {
        if (l.role !== "unused") {
          initialStats[l.player_id] = {
            goals: (l as MatchLineup).goals ?? 0,
            assists: (l as MatchLineup).assists ?? 0,
          };
        }
      }
      setStatsMap(initialStats);
    }
    load();
  }, [matchId]);

  const assignedIds = new Set<string>(
    [
      ...slots.flat().map((s) => s.playerId),
      ...subs.map((s) => s.playerId),
    ].filter((id): id is string => id !== null)
  );

  function openPicker(picker: ActivePicker) {
    setActivePicker(picker);
    setPickerSearch("");
  }

  function assignToSlot(colIdx: number, slotIdx: number, playerId: string) {
    setSlots((prev) => {
      const next = prev.map((col) => col.map((slot) => ({ ...slot })));
      // Remove from any other pitch slot
      for (const col of next) {
        for (const slot of col) {
          if (slot.playerId === playerId) slot.playerId = null;
        }
      }
      next[colIdx][slotIdx].playerId = playerId;
      return next;
    });
    // Remove from subs if present
    setSubs((prev) => prev.map((s) => (s.playerId === playerId ? { ...s, playerId: null } : s)));
    setActivePicker(null);
  }

  function clearSlot(colIdx: number, slotIdx: number) {
    setSlots((prev) => {
      const next = prev.map((col) => col.map((slot) => ({ ...slot })));
      next[colIdx][slotIdx].playerId = null;
      return next;
    });
  }

  function assignToSub(uid: string, playerId: string) {
    // Remove from pitch if present
    setSlots((prev) =>
      prev.map((col) =>
        col.map((slot) => (slot.playerId === playerId ? { ...slot, playerId: null } : slot))
      )
    );
    // Remove from other subs if present
    setSubs((prev) =>
      prev.map((s) => {
        if (s.playerId === playerId && s.uid !== uid) return { ...s, playerId: null };
        if (s.uid === uid) return { ...s, playerId };
        return s;
      })
    );
    setActivePicker(null);
  }

  function addSub() {
    setSubs((prev) => [
      ...prev,
      { uid: crypto.randomUUID(), playerId: null, specificPosition: "", subMinute: "" },
    ]);
  }

  function removeSub(uid: string) {
    setSubs((prev) => prev.filter((s) => s.uid !== uid));
  }

  function updateSub(uid: string, field: "specificPosition" | "subMinute", value: string) {
    setSubs((prev) => prev.map((s) => (s.uid === uid ? { ...s, [field]: value } : s)));
  }

  function updateStat(playerId: string, field: "goals" | "assists", value: number) {
    setStatsMap((prev) => ({
      ...prev,
      [playerId]: {
        goals: prev[playerId]?.goals ?? 0,
        assists: prev[playerId]?.assists ?? 0,
        [field]: Math.max(0, value),
      },
    }));
  }

  async function handleSave() {
    setSaving(true);
    await supabase.from("match_lineups").delete().eq("match_id", matchId);

    const toInsert: {
      match_id: string;
      player_id: string;
      role: string;
      sub_minute: number | null;
      specific_position: string | null;
      formation_line: number | null;
      goals: number;
      assists: number;
    }[] = [];

    slots.forEach((col, colIdx) => {
      col.forEach((slot) => {
        if (slot.playerId) {
          toInsert.push({
            match_id: matchId,
            player_id: slot.playerId,
            role: "starter",
            sub_minute: null,
            specific_position: slot.position,
            formation_line: colIdx,
            goals: statsMap[slot.playerId]?.goals ?? 0,
            assists: statsMap[slot.playerId]?.assists ?? 0,
          });
        }
      });
    });

    subs.forEach((s) => {
      if (s.playerId) {
        toInsert.push({
          match_id: matchId,
          player_id: s.playerId,
          role: "sub_in",
          sub_minute: s.subMinute ? parseInt(s.subMinute) : null,
          specific_position: s.specificPosition || null,
          formation_line: null,
          goals: statsMap[s.playerId]?.goals ?? 0,
          assists: statsMap[s.playerId]?.assists ?? 0,
        });
      }
    });

    if (toInsert.length > 0) {
      const { error } = await supabase.from("match_lineups").insert(toInsert);
      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
    }
    toast.success("Lineup saved!");
    router.push("/admin");
    setSaving(false);
  }

  if (!match) {
    return (
      <div className="text-white/40 text-sm" style={{ fontFamily: "var(--font-condensed)" }}>
        Loading…
      </div>
    );
  }

  const template = FORMATION_TEMPLATES[match.formation ?? ""];
  const starterCount = slots.flat().filter((s) => s.playerId !== null).length;
  const subCount = subs.filter((s) => s.playerId !== null).length;

  const filteredPlayers = players.filter(
    (p) =>
      pickerSearch === "" ||
      p.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
      String(p.squad_number).includes(pickerSearch)
  );

  return (
    <div className="space-y-6 max-w-4xl">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            className="text-4xl text-white tracking-[0.12em] leading-none"
            style={{ fontFamily: "var(--font-display)" }}
          >
            LINEUP BUILDER
          </h1>
          <p
            className="text-white/40 text-sm mt-1"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            Bayern vs {match.opponent} — {match.date}
            {match.formation && (
              <span className="ml-3 text-white/60 font-semibold">{match.formation}</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div
              className="text-white/35 text-[10px] tracking-[0.25em] uppercase"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Starters / Subs
            </div>
            <div
              className="text-xl font-bold leading-tight"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}
            >
              <span style={{ color: starterCount === 11 ? "#4ade80" : "#facc15" }}>
                {starterCount}
              </span>
              <span className="text-white/20">/11</span>
              <span className="text-white/35 text-base ml-2">+{subCount}</span>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 text-sm font-bold tracking-[0.2em] uppercase transition-opacity"
            style={{
              fontFamily: "var(--font-condensed)",
              background: "#DC052D",
              color: "#fff",
              borderRadius: "6px",
              opacity: saving ? 0.5 : 1,
            }}
          >
            {saving ? "SAVING…" : "SAVE LINEUP"}
          </button>
        </div>
      </div>

      {/* ── No formation warning ── */}
      {!template && (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{
            background: "rgba(250,204,21,0.07)",
            border: "1px solid rgba(250,204,21,0.2)",
            color: "#facc15",
            fontFamily: "var(--font-condensed)",
          }}
        >
          No formation set for this match.{" "}
          <a href="/admin" className="underline opacity-80 hover:opacity-100">
            Edit the match
          </a>{" "}
          to choose one before building the lineup.
        </div>
      )}

      {/* ── Visual Pitch ── */}
      {template && (
        <div
          className="relative rounded-xl overflow-hidden"
          style={{
            background: "#186320",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
            minHeight: "400px",
          }}
        >
          {/* SVG pitch markings */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="0" y="16" width="29" height="68" fill="none" stroke="white" strokeWidth="0.45" opacity="0.55" />
            <rect x="0" y="33" width="10" height="34" fill="none" stroke="white" strokeWidth="0.45" opacity="0.55" />
            <circle cx="19.5" cy="50" r="0.7" fill="white" opacity="0.55" />
            <path d="M 29 38 A 17 17 0 0 1 29 62" fill="none" stroke="white" strokeWidth="0.45" opacity="0.55" />
            <ellipse cx="100" cy="50" rx="14" ry="25" fill="none" stroke="white" strokeWidth="0.45" opacity="0.55" />
            <circle cx="100" cy="50" r="0.7" fill="white" opacity="0.55" />
          </svg>

          {/* Formation label */}
          <div className="absolute top-3 left-4 z-10">
            <span
              className="text-white/60 text-2xl tracking-[0.3em]"
              style={{
                fontFamily: "var(--font-display)",
                textShadow: "0 2px 8px rgba(0,0,0,0.9)",
              }}
            >
              {match.formation}
            </span>
          </div>

          {/* Hint */}
          <div className="absolute bottom-3 right-4 z-10">
            <span
              className="text-white/20 text-[9px] tracking-[0.25em] uppercase"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              click slot to assign · click player to remove
            </span>
          </div>

          {/* Columns */}
          <div className="relative z-10 flex flex-row items-stretch py-12 px-3 sm:px-5 gap-2 min-h-[400px]">
            {slots.map((col, colIdx) => (
              <div
                key={colIdx}
                className="flex flex-col justify-around items-center gap-4 flex-1"
              >
                {col.map((slot, slotIdx) => {
                  const player = slot.playerId
                    ? players.find((p) => p.id === slot.playerId)
                    : null;
                  const pc = posColor(slot.position);

                  return (
                    <div
                      key={slotIdx}
                      className="flex flex-col items-center gap-1.5"
                    >
                      {/* Slot card */}
                      <div className="relative">
                        <button
                          onClick={() =>
                            openPicker({ kind: "pitch", colIdx, slotIdx, position: slot.position })
                          }
                          className="relative flex flex-col items-center justify-center rounded-lg overflow-hidden transition-all duration-150 group"
                          style={{
                            width: "76px",
                            height: "76px",
                            background: player ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.3)",
                            border: player
                              ? `2px solid ${pc.text}55`
                              : "2px dashed rgba(255,255,255,0.18)",
                          }}
                          title={
                            player
                              ? `${player.name} — click to reassign`
                              : `Assign ${slot.position}`
                          }
                        >
                          {player ? (
                            <>
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
                                    className="text-white/50 text-xl"
                                    style={{ fontFamily: "var(--font-display)" }}
                                  >
                                    {player.squad_number ?? "?"}
                                  </span>
                                </div>
                              )}
                              {/* Hover: reassign overlay */}
                              <div
                                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ background: "rgba(0,0,0,0.65)" }}
                              >
                                <span
                                  className="text-white/80 text-[9px] tracking-[0.2em] uppercase"
                                  style={{ fontFamily: "var(--font-condensed)" }}
                                >
                                  change
                                </span>
                              </div>
                            </>
                          ) : (
                            <span className="text-white/25 text-2xl group-hover:text-white/50 transition-colors">
                              +
                            </span>
                          )}
                        </button>

                        {/* Remove button — top-right corner */}
                        {player && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              clearSlot(colIdx, slotIdx);
                            }}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors"
                            style={{
                              background: "rgba(220,5,45,0.85)",
                              color: "#fff",
                              border: "1.5px solid rgba(0,0,0,0.5)",
                            }}
                            title="Remove"
                          >
                            ×
                          </button>
                        )}
                      </div>

                      {/* Position badge */}
                      <span
                        className="text-[9px] font-bold px-1.5 py-[2px] rounded"
                        style={{
                          background: pc.bg,
                          color: pc.text,
                          fontFamily: "var(--font-condensed)",
                        }}
                      >
                        {slot.position}
                      </span>

                      {/* Player name (when assigned) */}
                      {player && (
                        <span
                          className="text-white text-[10px] font-bold leading-none text-center"
                          style={{
                            fontFamily: "var(--font-condensed)",
                            maxWidth: "80px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            textShadow: "0 1px 6px rgba(0,0,0,1)",
                          }}
                        >
                          {shortName(player.name)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Substitutes ── */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-1 h-5 shrink-0" style={{ background: "#DC052D" }} />
          <h2
            className="text-xl text-white tracking-[0.15em]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            SUBSTITUTES
          </h2>
        </div>

        <div className="space-y-2">
          {subs.map((sub) => {
            const player = sub.playerId
              ? players.find((p) => p.id === sub.playerId)
              : null;
            return (
              <div
                key={sub.uid}
                className="flex flex-wrap items-center gap-3 rounded-lg px-4 py-3"
                style={{
                  background: "#111",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {/* Player picker button */}
                <button
                  onClick={() => openPicker({ kind: "sub", uid: sub.uid })}
                  className="flex items-center gap-2 px-3 py-1.5 rounded transition-all duration-150"
                  style={{
                    background: player ? "rgba(255,255,255,0.06)" : "rgba(220,5,45,0.08)",
                    border: player
                      ? "1px solid rgba(255,255,255,0.1)"
                      : "1px dashed rgba(220,5,45,0.35)",
                    minWidth: "180px",
                  }}
                >
                  {player ? (
                    <div className="flex items-center gap-2">
                      {player.photo_url && (
                        <img
                          src={player.photo_url}
                          alt={player.name}
                          className="w-6 h-6 rounded-full object-cover shrink-0"
                          style={{ objectPosition: "center 15%" }}
                        />
                      )}
                      <span
                        className="text-white text-sm"
                        style={{ fontFamily: "var(--font-condensed)" }}
                      >
                        {player.squad_number && (
                          <span className="text-white/40 mr-1.5">{player.squad_number}</span>
                        )}
                        {player.name}
                      </span>
                    </div>
                  ) : (
                    <span
                      className="text-white/35 text-sm"
                      style={{ fontFamily: "var(--font-condensed)" }}
                    >
                      + Pick player…
                    </span>
                  )}
                </button>

                {/* Specific position */}
                <select
                  value={sub.specificPosition}
                  onChange={(e) => updateSub(sub.uid, "specificPosition", e.target.value)}
                  className="px-2 py-1.5 rounded text-sm"
                  style={{
                    background: "#1A1A1A",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: sub.specificPosition ? "#f7f7f7" : "rgba(255,255,255,0.35)",
                    fontFamily: "var(--font-condensed)",
                    outline: "none",
                  }}
                >
                  <option value="">Position…</option>
                  {POS_GROUPS.map(({ group, options }) => (
                    <optgroup key={group} label={group}>
                      {options.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>

                {/* Sub minute */}
                <input
                  type="number"
                  min={1}
                  max={120}
                  placeholder="Min"
                  value={sub.subMinute}
                  onChange={(e) => updateSub(sub.uid, "subMinute", e.target.value)}
                  className="w-20 px-2 py-1.5 rounded text-sm"
                  style={{
                    background: "#1A1A1A",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#f7f7f7",
                    fontFamily: "var(--font-condensed)",
                    outline: "none",
                  }}
                />

                {/* Remove sub */}
                <button
                  onClick={() => removeSub(sub.uid)}
                  className="text-white/25 hover:text-red-400 transition-colors text-xl leading-none ml-auto"
                >
                  ×
                </button>
              </div>
            );
          })}

          <button
            onClick={addSub}
            className="w-full py-2.5 rounded-lg text-sm tracking-[0.15em] uppercase transition-all duration-150 hover:bg-white/[0.04]"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px dashed rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.35)",
              fontFamily: "var(--font-condensed)",
            }}
          >
            + ADD SUBSTITUTE
          </button>
        </div>
      </div>

      {/* ── Match Stats ── */}
      {(() => {
        const assignedPlayers: Player[] = [];
        const seen = new Set<string>();
        for (const col of slots) {
          for (const slot of col) {
            if (slot.playerId && !seen.has(slot.playerId)) {
              const p = players.find((p) => p.id === slot.playerId);
              if (p) { assignedPlayers.push(p); seen.add(slot.playerId); }
            }
          }
        }
        for (const sub of subs) {
          if (sub.playerId && !seen.has(sub.playerId)) {
            const p = players.find((p) => p.id === sub.playerId);
            if (p) { assignedPlayers.push(p); seen.add(sub.playerId); }
          }
        }
        if (assignedPlayers.length === 0) return null;

        return (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-1 h-5 shrink-0" style={{ background: "#DC052D" }} />
              <h2
                className="text-xl text-white tracking-[0.15em]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                MATCH STATS
              </h2>
              <span
                className="text-[10px] text-white/25 tracking-[0.25em] uppercase"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                goals & assists per player
              </span>
            </div>

            {/* Column headers */}
            <div
              className="grid items-center gap-3 px-4 pb-2 mb-1"
              style={{ gridTemplateColumns: "1fr 100px 100px" }}
            >
              {["Player", "Goals", "Assists"].map((h) => (
                <span
                  key={h}
                  className="text-[10px] text-white/30 tracking-[0.25em] uppercase"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  {h}
                </span>
              ))}
            </div>

            <div className="space-y-1">
              {assignedPlayers.map((p) => {
                const g = statsMap[p.id]?.goals ?? 0;
                const a = statsMap[p.id]?.assists ?? 0;
                return (
                  <div
                    key={p.id}
                    className="grid items-center gap-3 rounded-lg px-4 py-2.5"
                    style={{
                      gridTemplateColumns: "1fr 100px 100px",
                      background: "#111",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    {/* Player */}
                    <div className="flex items-center gap-2 min-w-0">
                      {p.photo_url ? (
                        <img
                          src={p.photo_url}
                          alt={p.name}
                          className="w-7 h-7 rounded-full object-cover shrink-0"
                          style={{ objectPosition: "center 15%" }}
                        />
                      ) : (
                        <div
                          className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center"
                          style={{ background: "#1A1A1A" }}
                        >
                          <span className="text-white/30 text-[11px]" style={{ fontFamily: "var(--font-display)" }}>
                            {p.squad_number ?? "?"}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <span
                          className="text-white/80 text-sm truncate block"
                          style={{ fontFamily: "var(--font-condensed)" }}
                        >
                          {p.squad_number && (
                            <span className="text-white/30 mr-1.5">{p.squad_number}</span>
                          )}
                          {p.name}
                        </span>
                      </div>
                    </div>

                    {/* Goals counter */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateStat(p.id, "goals", g - 1)}
                        disabled={g === 0}
                        className="w-7 h-7 rounded flex items-center justify-center text-lg font-bold transition-colors"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          color: g === 0 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.6)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        −
                      </button>
                      <span
                        className="w-6 text-center tabular-nums"
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: "20px",
                          color: g > 0 ? "#4ade80" : "rgba(255,255,255,0.25)",
                        }}
                      >
                        {g}
                      </span>
                      <button
                        onClick={() => updateStat(p.id, "goals", g + 1)}
                        className="w-7 h-7 rounded flex items-center justify-center text-lg font-bold transition-colors"
                        style={{
                          background: "rgba(74,222,128,0.1)",
                          color: "rgba(74,222,128,0.7)",
                          border: "1px solid rgba(74,222,128,0.2)",
                        }}
                      >
                        +
                      </button>
                    </div>

                    {/* Assists counter */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateStat(p.id, "assists", a - 1)}
                        disabled={a === 0}
                        className="w-7 h-7 rounded flex items-center justify-center text-lg font-bold transition-colors"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          color: a === 0 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.6)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        −
                      </button>
                      <span
                        className="w-6 text-center tabular-nums"
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: "20px",
                          color: a > 0 ? "#facc15" : "rgba(255,255,255,0.25)",
                        }}
                      >
                        {a}
                      </span>
                      <button
                        onClick={() => updateStat(p.id, "assists", a + 1)}
                        className="w-7 h-7 rounded flex items-center justify-center text-lg font-bold transition-colors"
                        style={{
                          background: "rgba(250,204,21,0.1)",
                          color: "rgba(250,204,21,0.7)",
                          border: "1px solid rgba(250,204,21,0.2)",
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── Player Picker Modal ── */}
      {activePicker && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.75)" }}
            onClick={() => setActivePicker(null)}
          />

          {/* Modal */}
          <div
            className="fixed z-50 flex flex-col rounded-xl overflow-hidden"
            style={{
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "min(420px, calc(100vw - 32px))",
              maxHeight: "78vh",
              background: "#0F0F0F",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.85)",
            }}
          >
            {/* Modal header */}
            <div
              className="flex items-center justify-between px-5 py-4 shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div>
                <div
                  className="text-white/35 text-[10px] tracking-[0.3em] uppercase"
                  style={{ fontFamily: "var(--font-condensed)" }}
                >
                  {activePicker.kind === "pitch" ? "Assigning position" : "Select substitute"}
                </div>
                {activePicker.kind === "pitch" && (
                  <div className="mt-1 flex items-center gap-2">
                    {(() => {
                      const pc = posColor(activePicker.position);
                      return (
                        <>
                          <span
                            className="text-2xl"
                            style={{
                              fontFamily: "var(--font-display)",
                              color: pc.text,
                              letterSpacing: "0.15em",
                            }}
                          >
                            {activePicker.position}
                          </span>
                          <span
                            className="text-[10px] px-1.5 py-[2px] rounded"
                            style={{ background: pc.bg, color: pc.text, fontFamily: "var(--font-condensed)" }}
                          >
                            {activePicker.position === "GK"
                              ? "Goalkeeper"
                              : ["LB","RB","CB","LCB","RCB","LWB","RWB"].includes(activePicker.position)
                              ? "Defender"
                              : ["CDM","LDM","RDM","LM","RM","LCM","RCM","CM","CAM","LAM","RAM"].includes(activePicker.position)
                              ? "Midfielder"
                              : "Forward"}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
              <button
                onClick={() => setActivePicker(null)}
                className="text-white/30 hover:text-white/70 transition-colors text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Search */}
            <div
              className="px-4 py-3 shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <input
                autoFocus
                type="text"
                placeholder="Search by name or number…"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                className="w-full px-3 py-2 rounded text-sm"
                style={{
                  background: "#1A1A1A",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#f7f7f7",
                  fontFamily: "var(--font-condensed)",
                  outline: "none",
                }}
              />
            </div>

            {/* Player list */}
            <div className="overflow-y-auto flex-1">
              {(["GK", "DEF", "MID", "FWD"] as const).map((posGroup) => {
                const groupPlayers = filteredPlayers.filter((p) => p.position === posGroup);
                if (groupPlayers.length === 0) return null;
                const groupLabel = {
                  GK: "Goalkeepers",
                  DEF: "Defenders",
                  MID: "Midfielders",
                  FWD: "Forwards",
                }[posGroup];

                return (
                  <div key={posGroup}>
                    <div
                      className="px-4 py-1.5 text-[10px] tracking-[0.3em] uppercase"
                      style={{
                        color: "rgba(255,255,255,0.2)",
                        fontFamily: "var(--font-condensed)",
                        background: "rgba(255,255,255,0.02)",
                      }}
                    >
                      {groupLabel}
                    </div>
                    {groupPlayers.map((p) => {
                      const isAssigned = assignedIds.has(p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => {
                            if (activePicker.kind === "pitch") {
                              assignToSlot(activePicker.colIdx, activePicker.slotIdx, p.id);
                            } else {
                              assignToSub(activePicker.uid, p.id);
                            }
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                          style={{
                            background: "transparent",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          {p.photo_url ? (
                            <img
                              src={p.photo_url}
                              alt={p.name}
                              className="w-8 h-8 rounded-full object-cover shrink-0"
                              style={{ objectPosition: "center 15%" }}
                            />
                          ) : (
                            <div
                              className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center"
                              style={{ background: "#222" }}
                            >
                              <span
                                className="text-white/40 text-xs"
                                style={{ fontFamily: "var(--font-display)" }}
                              >
                                {p.squad_number ?? "?"}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <span
                              className="text-sm"
                              style={{
                                fontFamily: "var(--font-condensed)",
                                color: isAssigned ? "rgba(255,255,255,0.35)" : "#f7f7f7",
                              }}
                            >
                              {p.squad_number && (
                                <span style={{ color: "rgba(255,255,255,0.3)", marginRight: "6px" }}>
                                  {p.squad_number}
                                </span>
                              )}
                              {p.name}
                            </span>
                          </div>
                          {isAssigned && (
                            <span
                              className="text-[9px] px-1.5 py-[2px] rounded shrink-0"
                              style={{
                                background: "rgba(255,255,255,0.07)",
                                color: "rgba(255,255,255,0.3)",
                                fontFamily: "var(--font-condensed)",
                              }}
                            >
                              in lineup
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}

              {filteredPlayers.length === 0 && (
                <div
                  className="px-4 py-8 text-center text-sm"
                  style={{ color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-condensed)" }}
                >
                  No players match "{pickerSearch}"
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
