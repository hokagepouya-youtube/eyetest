"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .single()
          .then(({ data }) => setIsAdmin(data?.is_admin ?? false));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user ?? null;
      setUser(newUser);
      if (!newUser) {
        setIsAdmin(false);
      } else {
        supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", newUser.id)
          .single()
          .then(({ data }) => setIsAdmin(data?.is_admin ?? false));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  const navLinks = user
    ? [
        { href: "/", label: "Match" },
        { href: "/players", label: "Squad" },
        ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
      ]
    : [];

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        background: "rgba(8,8,8,0.97)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(220,5,45,0.18)",
      }}
    >
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-6">

        {/* Wordmark */}
        <Link href="/" className="flex items-center shrink-0 gap-2.5 group">
          <img
            src="/EyeTest.png"
            alt="EyeTest"
            className="h-8 w-auto object-contain"
          />
          <span
            className="text-[22px] text-white tracking-[0.18em] leading-none"
            style={{ fontFamily: "var(--font-display)" }}
          >
            EYE
          </span>
          <span
            className="text-[22px] leading-none px-[3px]"
            style={{ color: "#DC052D", fontFamily: "var(--font-display)" }}
          >
            ·
          </span>
          <span
            className="text-[22px] text-white tracking-[0.18em] leading-none"
            style={{ fontFamily: "var(--font-display)" }}
          >
            TEST
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center flex-1 justify-center">
          {navLinks.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-5 h-16 flex items-center text-[11px] font-bold tracking-[0.22em] uppercase transition-colors duration-150 ${
                  active ? "text-white" : "text-white/35 hover:text-white/70"
                }`}
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                {link.label}
                {active && (
                  <span
                    className="absolute bottom-0 left-3 right-3 h-[2px]"
                    style={{ background: "#DC052D" }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Auth */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <>
              <span
                className="text-[11px] text-white/20 hidden sm:block truncate max-w-[150px] tracking-wide"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                {user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="px-4 py-1.5 text-[11px] font-bold tracking-[0.18em] uppercase text-white/35 border border-white/10 rounded hover:border-white/30 hover:text-white/60 transition-all"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="px-4 py-1.5 text-[11px] font-bold tracking-[0.18em] uppercase text-white/35 hover:text-white/60 transition-colors"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                Login
              </Link>
              <Link
                href="/auth/register"
                className="px-4 py-1.5 text-[11px] font-bold tracking-[0.18em] uppercase text-white rounded transition-all hover:brightness-110"
                style={{
                  background: "#DC052D",
                  fontFamily: "var(--font-condensed)",
                  boxShadow: "0 0 18px rgba(220,5,45,0.3)",
                }}
              >
                Join
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
