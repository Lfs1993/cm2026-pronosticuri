"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { supabase } from "@/lib/supabase";
export default function ProfilePage() {
  const [displayName, setDisplayName] = useState(""); const [email, setEmail] = useState(""); const [message, setMessage] = useState<string | null>(null);
  useEffect(() => { async function load() { const { data: authData } = await supabase.auth.getUser(); const user = authData.user; if (!user) return (window.location.href = "/auth/login"); setEmail(user.email || ""); const { data } = await supabase.from("profiles").select("display_name").eq("id", user.id).single(); setDisplayName(data?.display_name || user.user_metadata?.display_name || ""); } load(); }, []);
  async function save() { const { data: authData } = await supabase.auth.getUser(); const user = authData.user; if (!user) return; await supabase.from("profiles").update({ display_name: displayName }).eq("id", user.id); setMessage("Profilul a fost actualizat."); }
  async function logout() { await supabase.auth.signOut(); window.location.href = "/auth/login"; }
  return <AppShell><div className="mx-auto max-w-2xl card p-6 md:p-8"><h2 className="text-3xl font-bold">Profilul meu</h2><div className="mt-6 space-y-4"><div><label className="mb-2 block text-sm text-white/70">Email</label><input className="input" disabled value={email} /></div><div><label className="mb-2 block text-sm text-white/70">Numele afișat</label><input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></div>{message ? <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">{message}</div> : null}<div className="flex gap-3"><button className="btn-primary" onClick={save}>Salvează profilul</button><button className="btn-secondary" onClick={logout}>Logout</button></div></div></div></AppShell>;
}