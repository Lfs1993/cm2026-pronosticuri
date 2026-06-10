import Link from "next/link";
import { SignUpForm } from "@/components/auth/auth-forms";
export default function SignUpPage() { return <main className="min-h-screen bg-stadium px-4 py-10 text-white md:px-8"><div className="mx-auto max-w-md card p-8"><h1 className="text-3xl font-bold">Creează cont</h1><p className="mt-2 text-white/70">Fiecare prieten își creează propriul cont și își pune numele lui.</p><div className="mt-6"><SignUpForm /></div><p className="mt-6 text-sm text-white/60">Ai deja cont? <Link href="/auth/login" className="text-fifa-gold">Intră aici</Link></p></div></main>; }
