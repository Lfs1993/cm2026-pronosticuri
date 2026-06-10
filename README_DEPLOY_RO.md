# CM 2026 Pronosticuri – proiect final

## Faci doar acești pași:
1. GitHub -> New repository -> `cm2026-pronosticuri`
2. În repo -> Add file -> Upload files -> urci TOATE fișierele din acest proiect -> Commit changes
3. Supabase -> New Project -> activezi Authentication / Email / Password
4. Supabase -> SQL Editor -> deschizi fișierul `supabase/schema.sql` -> copiezi tot -> Run
5. Supabase -> Settings / API / Connect -> copiezi:
   - Project URL
   - Publishable key
6. Vercel -> Add New Project -> alegi repo-ul GitHub -> Import
7. În Vercel -> Environment Variables -> adaugi:
   - NEXT_PUBLIC_SUPABASE_URL = Project URL
   - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = Publishable key
8. În Vercel -> Deploy
9. Primești linkul public
10. Intri pe site -> îți faci cont
11. Supabase -> Authentication -> Users -> copiezi UUID-ul tău
12. Supabase -> SQL Editor -> rulezi:
   update public.profiles set is_admin = true where id = 'UUID_UL_TĂU';
13. Trimiți linkul la ceilalți 3 prieteni

## Dacă vrei local:
```bash
npm install
npm run dev
```