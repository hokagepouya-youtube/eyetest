"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Props {
  matchId: string;
}

export default function AdminMatchActions({ matchId }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (
      !window.confirm(
        "Delete this match? This will also remove all ratings and lineup data. This cannot be undone."
      )
    ) return;

    setDeleting(true);
    const { error } = await supabase.from("matches").delete().eq("id", matchId);
    if (error) {
      toast.error(error.message);
      setDeleting(false);
      return;
    }
    toast.success("Match deleted.");
    router.refresh();
  }

  const btnBase: React.CSSProperties = {
    fontFamily: "var(--font-condensed)",
  };

  return (
    <div className="flex items-center gap-2 shrink-0">
      <Link
        href={`/admin/matches/${matchId}/edit`}
        className="px-3 py-1.5 text-[10px] font-bold tracking-[0.18em] uppercase text-white/40 border border-white/10 rounded hover:border-white/25 hover:text-white/60 transition-all"
        style={btnBase}
      >
        Edit Match
      </Link>
      <Link
        href={`/admin/lineups/${matchId}`}
        className="px-3 py-1.5 text-[10px] font-bold tracking-[0.18em] uppercase text-white/40 border border-white/10 rounded hover:border-white/25 hover:text-white/60 transition-all"
        style={btnBase}
      >
        Lineup
      </Link>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="px-3 py-1.5 text-[10px] font-bold tracking-[0.18em] uppercase text-white/50 border border-red-900/40 rounded hover:border-red-500/60 hover:text-red-400 disabled:opacity-40 transition-all"
        style={btnBase}
      >
        {deleting ? "…" : "Delete"}
      </button>
    </div>
  );
}
