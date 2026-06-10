import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
export const metadata: Metadata = { title: "CM 2026 Pronosticuri", description: "Pronosticuri World Cup 2026 pentru 4 prieteni" };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="ro"><body><Providers>{children}</Providers></body></html>; }
