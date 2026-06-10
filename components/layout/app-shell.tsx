"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, ListChecks, GanttChartSquare, UserCircle2, ShieldCheck, Home, Table2 } from "lucide-react";

const links = [
  { href: "/groups", label: "Grupele CM 2026", icon: Table2 },
  { href: "/predictions/groups", label: "Pronosticuri Grupe", icon: ListChecks },
  { href: "/predictions/knockout", label: "Pronosticuri Faze Eliminatorii", icon: GanttChartSquare },
  { href: "/leaderboard", label: "Clasament Blyats CM 2026", icon: Trophy },
  { href: "/profile", label: "Profil", icon: UserCircle2 },
  { href: "/admin/results", label: "Admin", icon: ShieldCheck },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-stadium">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <div className="mb-6 flex items-center justify-between rounded-3xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur">
          <div>
            <div className="text-xs uppercase tracking-[0.35em] text-fifa-gold">World Cup 2026</div>
            <h1 className="text-2xl font-bold md:text-3xl">LIGA de pronosticuri a blyats-ilor CM 2026</h1>
          </div>
          <Link href="/" className="btn-secondary">Pagina principală</Link>
        </div>

        <div className="mb-6 grid gap-2 rounded-3xl border border-white/10 bg-black/15 p-2 md:grid-cols-6 xl:grid-cols-6">
          {links.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;
            return (
              <Link key={link.href} href={link.href} className={active ? "btn bg-fifa-gold text-black" : "btn-secondary justify-start md:justify-center"}>
                <Icon className="mr-2 h-4 w-4" /> {link.label}
              </Link>
            );
          })}
        </div>

        {children}
      </div>
    </div>
  );
}