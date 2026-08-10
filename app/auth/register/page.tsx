"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: { preventDefault(): void }) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Account created! You can now sign in.");
      router.push("/auth/login");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-8 px-4">
      <div
        className="w-full max-w-3xl overflow-hidden rounded-2xl shadow-2xl flex"
        style={{ minHeight: "560px" }}
      >
        {/* ── Left: Bayern branding panel ── */}
        <div
          className="relative hidden sm:flex flex-col items-center justify-center flex-1 p-10 overflow-hidden"
          style={{ background: "#0A0002" }}
        >
          {/* Atmospheric red glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 90% 80% at 50% 50%, rgba(220,5,45,0.38) 0%, transparent 70%)",
            }}
          />
          {/* Diagonal micro-texture */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.045]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(-45deg, white 0, white 1px, transparent 0, transparent 50%)",
              backgroundSize: "8px 8px",
            }}
          />
          {/* Top red accent line */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#DC052D]" />
          {/* Bottom red accent line */}
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-[#DC052D]/30" />

          {/* Bavarian diamond watermark */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage:
                "repeating-conic-gradient(rgba(255,255,255,0.8) 0% 25%, transparent 0% 50%)",
              backgroundSize: "32px 32px",
            }}
          />

          {/* Content */}
          <div className="relative z-10 text-center">
            <div className="relative inline-block mb-8">
              {/* Badge glow */}
              <div
                className="absolute inset-0 blur-2xl rounded-full pointer-events-none"
                style={{ background: "rgba(220,5,45,0.5)", transform: "scale(1.4)" }}
              />
              <img
                src="/EyeTest.png"
                alt="FC Bayern München"
                className="relative w-28 h-32 drop-shadow-2xl"
              />
            </div>

            <h2
              className="text-5xl text-white tracking-[0.22em] mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              EYETEST
            </h2>

            <p
              className="text-white/35 text-[10px] tracking-[0.45em] uppercase mb-8"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              FC Bayern München
            </p>

            <div className="w-10 h-[2px] bg-[#DC052D] mx-auto mb-8" />

            <p
              className="text-white/20 text-xs tracking-[0.3em] uppercase"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              Mia San Mia
            </p>
          </div>
        </div>

        {/* ── Right: Form panel ── */}
        <div
          className="relative flex-1 flex flex-col justify-center p-8 sm:p-10 overflow-hidden"
          style={{ background: "#141414" }}
        >
          {/* Red top accent */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#DC052D] via-[#DC052D]/50 to-transparent" />
          {/* Subtle right-side red glow */}
          <div
            className="absolute inset-y-0 right-0 w-1/2 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at right center, rgba(220,5,45,0.06) 0%, transparent 70%)",
            }}
          />

          {/* Mobile header */}
          <div className="flex sm:hidden items-center gap-3 mb-8">
            <img src="/EyeTest.png" alt="FC Bayern" className="w-8 h-10" />
            <span
              className="text-white text-xl tracking-widest"
              style={{ fontFamily: "var(--font-display)" }}
            >
              EYETEST
            </span>
          </div>

          <h2
            className="text-2xl text-white tracking-[0.15em] mb-1 relative z-10"
            style={{ fontFamily: "var(--font-display)" }}
          >
            CREATE ACCOUNT
          </h2>
          <p
            className="text-white/25 text-[11px] tracking-wider mb-6 relative z-10"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            Join the community. Rate the players.
          </p>

          <form onSubmit={handleRegister} className="space-y-4 relative z-10">
            <div>
              <label
                className="block text-[10px] text-white/40 tracking-[0.3em] uppercase mb-2"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Mia San Mia"
                className="w-full px-4 py-3 rounded-lg text-sm text-white placeholder-white/20 border border-white/[0.08] bg-white/[0.05] focus:outline-none focus:border-[#DC052D]/60 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              />
            </div>
            <div>
              <label
                className="block text-[10px] text-white/40 tracking-[0.3em] uppercase mb-2"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-lg text-sm text-white placeholder-white/20 border border-white/[0.08] bg-white/[0.05] focus:outline-none focus:border-[#DC052D]/60 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              />
            </div>
            <div>
              <label
                className="block text-[10px] text-white/40 tracking-[0.3em] uppercase mb-2"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="min. 6 characters"
                className="w-full px-4 py-3 rounded-lg text-sm text-white placeholder-white/20 border border-white/[0.08] bg-white/[0.05] focus:outline-none focus:border-[#DC052D]/60 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 rounded-lg text-sm font-bold tracking-[0.2em] uppercase text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:brightness-110"
              style={{
                background: "#DC052D",
                fontFamily: "var(--font-condensed)",
                boxShadow: "0 0 24px rgba(220,5,45,0.25)",
              }}
            >
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <p
            className="text-center text-[11px] text-white/25 mt-6 tracking-wide relative z-10"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="text-white/55 hover:text-white underline-offset-2 hover:underline transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
