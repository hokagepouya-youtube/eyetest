"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { Manager } from "@/lib/types";

const COMPETITIONS = ["Bundesliga", "Champions League", "DFB-Pokal", "DFL-Supercup", "UEFA Super Cup", "Friendly"];
const FORMATIONS = ["4-3-3", "4-2-3-1", "4-4-2", "3-4-3", "3-5-2", "4-1-4-1", "4-4-1-1", "3-4-2-1", "5-3-2", "4-3-2-1"];

export default function NewMatchPage() {
  const router = useRouter();
  const supabase = createClient();
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    opponent: "",
    date: "",
    competition: "",
    home_away: "home" as "home" | "away",
    score_for: "",
    score_against: "",
    manager_id: "",
    formation: "4-3-3",
    opponent_logo_url: "",
  });

  useEffect(() => {
    supabase.from("managers").select("*").eq("active", true).then(({ data }) => {
      if (data) setManagers(data);
      if (data?.length) setForm((f) => ({ ...f, manager_id: data[0].id }));
    });
  }, []);

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setLoading(true);
    const { data: match, error } = await supabase
      .from("matches")
      .insert({
        opponent: form.opponent,
        date: form.date,
        competition: form.competition || null,
        home_away: form.home_away,
        score_for: form.score_for !== "" ? parseInt(form.score_for) : null,
        score_against: form.score_against !== "" ? parseInt(form.score_against) : null,
        manager_id: form.manager_id || null,
        formation: form.formation || null,
        opponent_logo_url: form.opponent_logo_url || null,
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    toast.success("Match created! Now enter the lineup.");
    router.push(`/admin/lineups/${match.id}`);
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">New Match</h1>
      <Card>
        <CardHeader>
          <CardTitle>Match Details</CardTitle>
          <CardDescription>Enter the basic info, then you&apos;ll set the lineup on the next page.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="opponent">Opponent</Label>
              <Input
                id="opponent"
                placeholder="e.g. Borussia Dortmund"
                value={form.opponent}
                onChange={(e) => setForm((f) => ({ ...f, opponent: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Competition</Label>
                <Select value={form.competition} onValueChange={(v) => setForm((f) => ({ ...f, competition: v ?? "" }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPETITIONS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Home / Away</Label>
                <Select value={form.home_away} onValueChange={(v) => setForm((f) => ({ ...f, home_away: v as "home" | "away" }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home">Home</SelectItem>
                    <SelectItem value="away">Away</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Formation</Label>
              <Select value={form.formation} onValueChange={(v) => setForm((f) => ({ ...f, formation: v ?? "4-3-3" }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select formation…" />
                </SelectTrigger>
                <SelectContent>
                  {FORMATIONS.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="score_for">Bayern score</Label>
                <Input
                  id="score_for"
                  type="number"
                  min={0}
                  placeholder="—"
                  value={form.score_for}
                  onChange={(e) => setForm((f) => ({ ...f, score_for: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="score_against">Opponent score</Label>
                <Input
                  id="score_against"
                  type="number"
                  min={0}
                  placeholder="—"
                  value={form.score_against}
                  onChange={(e) => setForm((f) => ({ ...f, score_against: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="opponent_logo_url">Opponent Badge</Label>
              <Input
                id="opponent_logo_url"
                placeholder="/badges/borussia-dortmund.svg"
                value={form.opponent_logo_url}
                onChange={(e) => setForm((f) => ({ ...f, opponent_logo_url: e.target.value }))}
              />
              <p className="text-[11px] text-muted-foreground">
                Put SVGs in <code>public/badges/</code> and enter the path, e.g. <code>/badges/bvb.svg</code>
              </p>
            </div>
            {managers.length > 0 && (
              <div className="space-y-2">
                <Label>Manager</Label>
                <Select value={form.manager_id} onValueChange={(v) => setForm((f) => ({ ...f, manager_id: v ?? "" }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select manager…" />
                  </SelectTrigger>
                  <SelectContent>
                    {managers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
          <div className="px-6 pb-6">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating…" : "Create match & set lineup →"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
