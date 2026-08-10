"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { PlayerRatingHistory } from "@/lib/types";

interface ChartPoint {
  name: string;
  "Your Rating"?: number;
  "Community Avg"?: number;
  role?: "starter" | "sub_in";
  community_motm?: boolean;
  personal_motm?: boolean;
}

function starPoints(cx: number, cy: number, outerR: number, innerR: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return pts.join(" ");
}

interface TooltipPayload {
  name: string;
  value: number;
  color: string;
  payload: ChartPoint;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const role = payload[0]?.payload?.role;
  return (
    <div
      className="border border-white/10 rounded-lg px-4 py-3 shadow-xl"
      style={{ background: "#1A1A1A" }}
    >
      <p
        className="text-[10px] tracking-widest uppercase mb-1"
        style={{ color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-condensed)" }}
      >
        {label}
      </p>
      {role && (
        <p
          className="text-[9px] tracking-widest uppercase mb-1"
          style={{
            color: role === "starter" ? "#60a5fa" : "#4ade80",
            fontFamily: "var(--font-condensed)",
          }}
        >
          {role === "starter" ? "● Starter" : "◆ Substitute"}
        </p>
      )}
      {(payload[0]?.payload?.community_motm || payload[0]?.payload?.personal_motm) && (
        <p
          className="text-[9px] tracking-widest uppercase mb-2"
          style={{ color: "#C9A84C", fontFamily: "var(--font-condensed)" }}
        >
          ★{payload[0]?.payload?.community_motm && payload[0]?.payload?.personal_motm
            ? " MoTM (Both)"
            : payload[0]?.payload?.community_motm
            ? " Community MoTM"
            : " Your MoTM"}
        </p>
      )}
      {payload.map((entry) => (
        <p
          key={entry.name}
          className="text-[12px] font-semibold"
          style={{ color: entry.color, fontFamily: "var(--font-condensed)" }}
        >
          {entry.name}:{" "}
          <span style={{ fontFamily: "var(--font-display)", fontSize: "16px" }}>
            {entry.value?.toFixed(1)}
          </span>
        </p>
      ))}
    </div>
  );
}

// Circle for starters, diamond for subs, gold star for MOTM (takes precedence)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeDot(color: string, motmKey: "community_motm" | "personal_motm"): (props: any) => React.ReactElement {
  // eslint-disable-next-line react/display-name
  return function Dot(props: any): React.ReactElement {
    const { cx, cy, payload, value } = props;
    if (cx == null || cy == null || value == null) return <g />;

    if ((payload as ChartPoint)?.[motmKey]) {
      return (
        <polygon
          points={starPoints(cx, cy, 8, 3.5)}
          fill="#C9A84C"
          stroke="rgba(0,0,0,0.35)"
          strokeWidth="0.5"
        />
      );
    }

    if ((payload as ChartPoint)?.role === "sub_in") {
      const s = 5;
      return (
        <rect
          x={cx - s}
          y={cy - s}
          width={s * 2}
          height={s * 2}
          fill={color}
          transform={`rotate(45, ${cx}, ${cy})`}
        />
      );
    }
    return <circle cx={cx} cy={cy} r={4.5} fill={color} />;
  };
}

interface Props {
  data: PlayerRatingHistory[];
  playerName?: string;
}

export default function RatingGraph({ data }: Props) {
  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center h-48 tracking-widest uppercase"
        style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-condensed)", fontSize: "13px" }}
      >
        No rating data yet
      </div>
    );
  }

  const hasRoleData = data.some((d) => d.role != null);
  const hasMotmData = data.some((d) => d.community_motm || d.personal_motm);

  const chartData: ChartPoint[] = data.map((d) => ({
    name: `vs ${d.opponent}`,
    "Your Rating": d.user_rating ?? undefined,
    "Community Avg": d.community_avg ?? undefined,
    role: d.role,
    community_motm: d.community_motm,
    personal_motm: d.personal_motm,
  }));

  const communityDot = makeDot("#DC052D", "community_motm");
  const userDot = makeDot("#60a5fa", "personal_motm");

  const axisStyle = {
    fontSize: 13,
    fill: "#ffffff",
    fontFamily: "var(--font-condensed)",
  };

  return (
    <div>
      {/* Legend row: line colors + shape meanings */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-4">
        {/* Line color legend */}
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-1.5" style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>
            <svg width="20" height="3"><rect width="14" height="2" y="0.5" fill="#60a5fa" rx="1" /></svg>
            Your Rating
          </span>
          <span className="flex items-center gap-1.5" style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>
            <svg width="20" height="3"><rect width="14" height="2" y="0.5" fill="#DC052D" rx="1" /></svg>
            Community
          </span>
        </div>

        {/* Shape legend (only when role data exists) */}
        {hasRoleData && (
          <>
            <div className="w-px h-3 self-center" style={{ background: "rgba(255,255,255,0.12)" }} />
            <div className="flex items-center gap-5">
              <span className="flex items-center gap-1.5" style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>
                <svg width="10" height="10" viewBox="0 0 10 10">
                  <circle cx="5" cy="5" r="4.5" fill="rgba(255,255,255,0.5)" />
                </svg>
                Starter
              </span>
              <span className="flex items-center gap-1.5" style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>
                <svg width="10" height="10" viewBox="0 0 10 10">
                  <rect x="1" y="1" width="8" height="8" fill="rgba(255,255,255,0.5)" transform="rotate(45 5 5)" />
                </svg>
                Substitute
              </span>
            </div>
          </>
        )}

        {/* MoTM legend (only when any MOTM data exists) */}
        {hasMotmData && (
          <>
            <div className="w-px h-3 self-center" style={{ background: "rgba(255,255,255,0.12)" }} />
            <span className="flex items-center gap-1.5" style={{ fontFamily: "var(--font-condensed)", fontSize: "11px", color: "#C9A84C" }}>
              <svg width="12" height="12" viewBox="0 0 12 12">
                <polygon
                  points={starPoints(6, 6, 5.5, 2.5)}
                  fill="#C9A84C"
                />
              </svg>
              MoTM
            </span>
          </>
        )}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="name"
            tick={axisStyle}
            angle={-20}
            textAnchor="end"
            height={50}
            axisLine={{ stroke: "rgba(255,255,255,0.10)" }}
            tickLine={false}
          />
          <YAxis
            domain={[1, 10]}
            ticks={[1, 3, 5, 7, 9, 10]}
            tick={axisStyle}
            axisLine={{ stroke: "rgba(255,255,255,0.10)" }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={5} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
          <Line
            type="linear"
            dataKey="Community Avg"
            stroke="#DC052D"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={communityDot}
            activeDot={{ r: 6, fill: "#DC052D" }}
            connectNulls
          />
          <Line
            type="linear"
            dataKey="Your Rating"
            stroke="#60a5fa"
            strokeWidth={2.5}
            dot={userDot}
            activeDot={{ r: 6, fill: "#60a5fa" }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
