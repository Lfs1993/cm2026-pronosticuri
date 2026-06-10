"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function HomePage() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      setLoggedIn(Boolean(data.user));
    }
    load();
  }, []);

  return (
    <main
      className="min-h-screen px-4 py-10 text-white md:px-8"
      style={{
        backgroundImage: "linear-gradient(rgba(7,19,39,0.72), rgba(7,19,39,0.88)), url('/images/cupa-mondiala.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="mx-auto max-w-7xl">
        <section className="card overflow-hidden p-8 md:p-12">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <div className="mb-3 text-sm uppercase tracking-[0.4em] text-fifa-gold">World Cup 2026</div>
              <h1 className="text-4xl font-black leading-tight md:text-6xl">LIGA de pronosticuri a blyats-ilor CM 2026</h1>
              <p className="mt-6 max-w-2xl text-lg text-white/75">Site-ul vostru pentru grupe, pronosticuri, faze eliminatorii, clasament și admin rezultate.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                {loggedIn ? (
                  <>
                    <Link href="/groups" className="btn-primary">Intră în site</Link>
                    <Link href="/leaderboard" className="btn-secondary">Vezi clasamentul</Link>
                  </>
                ) : (
                  <>
                    <Link href="/auth/sign-up" className="btn-primary">Creează cont</Link>
                    <Link href="/auth/login" className="btn-secondary">Am deja cont</Link>
                  </>
                )}
              </div>
            </div>
            <div className="card bg-black/20 p-6">
              <div className="text-sm uppercase tracking-[0.3em] text-fifa-gold">Ce găsești aici</div>
              <ul className="mt-4 space-y-3 text-white/80">
                <li>• Grupe actualizate automat după rezultate</li>
                <li>• Pronosticuri grupe pe etape</li>
                <li>• Pronosticuri faze eliminatorii</li>
                <li>• Clasament live</li>
                <li>• Admin pentru scoruri reale</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}