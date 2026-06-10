PAȘI EXACȚI

1. Descarci ZIP-ul.
2. Îl dezarhivezi.
3. În GitHub repo cm2026-pronosticuri urci peste cele vechi:
   - app
4. Commit changes.
5. Aștepți Vercel.
6. Ctrl + F5 pe site.

CE SCHIMBĂ
- pe pagina principală apare Login / Creează cont / Recuperare parolă
- dacă ești logat apare și Logout
- adaugă pagina /auth/forgot-password
- adaugă pagina /auth/update-password

IMPORTANT SUPABASE
În Supabase -> Authentication -> URL Configuration
adaugi Redirect URL:
https://cm2026-pronosticuri.vercel.app/auth/update-password