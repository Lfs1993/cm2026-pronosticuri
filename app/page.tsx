"use client";

import Link from "next/link";
import Image from "next/image";
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
        backgroundImage: "linear-gradient(rgba(7,19,39,0.78), rgba(7,19,39,0.88)), url('/images/cupa-mondiala.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="mx-auto max-w-7xl">
        <section className="card overflow-hidden p-8 md:p-12">
          <div className="grid gap-10 lg:grid-cols-[1fr_0.95fr] lg:items-center">
            <div>
              <div className="mb-3 text-sm uppercase tracking-[0.4em] text-fifa-gold">World Cup 2026</div>
              <h1 className="text-4xl font-black leading-tight md:text-6xl">LIGA de pronosticuri a blyats-ilor CM 2026</h1>
              <p className="mt-6 max-w-2xl text-lg text-white/75">Grupe, pronosticuri, clasament și admin rezultate.</p>
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

            <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/20 p-3">
              <div className="relative aspect-[16/10] overflow-hidden rounded-2xl">
                <Image src="/images/cupa-mondiala.jpg" alt="Cupa Mondială" fill className="object-cover" priority />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}