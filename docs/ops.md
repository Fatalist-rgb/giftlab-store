# Ops: backups, monitoring, incidenty (T075)

## Architektura produkcyjna

| Element | Gdzie | Uwagi |
|---|---|---|
| Storefront (Next.js) | Vercel | deploy `vercel deploy --prod` z repo |
| Backend (Medusa) + admin | Railway, serwis `backend` | healthcheck `/health`, migracje przy starcie |
| Render worker | Railway, serwis `render-worker` | kolejka `gl-render` (BullMQ) |
| PostgreSQL 18 | Railway `Postgres` | źródło prawdy zamówień |
| Redis | Railway `Redis` | kolejka renderów |
| Pliki (zdjęcia, paczki druku, grafiki) | Cloudflare R2, bucket `giftlab-prod` (**jurysdykcja EU**) | RODO |

## Backupy — stan i co włączyć

- **PostgreSQL (Railway):** dostępność automatycznych backupów/PITR zależy od planu
  konta. **Do zrobienia po stronie właściciela konta:** w Railway → Postgres → Backups
  włączyć codzienny backup (i sprawdzić okno retencji). Do czasu potwierdzenia można
  robić ręczny dump: `pg_dump "$DATABASE_PUBLIC_URL" > backup-YYYY-MM-DD.sql`.
- **R2:** paczki produkcyjne są odtwarzalne (deterministyczny render z bazy — ten sam
  wynik bajt w bajt), grafiki wgrywa się ponownie skryptem `r2:upload-artwork`.
  Jedyne NIEodtwarzalne obiekty to **zdjęcia klientów** (`photos/*`). Włączenie
  wersjonowania bucketa: Cloudflare dash → R2 → giftlab-prod → Settings → Object
  versioning (wymaga właściciela konta). Retencja zdjęć i tak wynosi 60 dni (RODO),
  więc wersjonowanie chroni głównie przed przypadkowym skasowaniem w tym oknie.
- **Kod i konfiguracja:** repo GitHub; sekrety w Railway variables (nie w repo).

## Monitoring

- **Uptime:** GitHub Actions (.github/workflows/uptime.yml) pinguje prod co 30 min;
  padnięty check = e-mail od GitHuba do obserwujących repo. Docelowo: dedykowany monitor
  (Better Stack / UptimeRobot) na koncie właściciela + Sentry na błędy frontu (konto klienta).

- Railway healthcheck restartuje backend przy padzie (`ON_FAILURE`, 3 próby).
- Kolejka: strona **Produkcja** w adminie pokazuje linie `zablokowane` (job zgubiony)
  — to pierwszy sygnał problemu z workerem/Redisem.
- Logi: `railway logs -s backend` / `-s render-worker` (streaming).

## Typowe incydenty

| Objaw | Diagnoza | Naprawa |
|---|---|---|
| Zamówienie opłacone, brak pliku po kilku minutach | linia w **Produkcja** jako `zablokowany` | przycisk „Ponów render"; jeśli wraca — logi workera |
| Wszystkie linie wiszą `queued` | worker padł / Redis niedostępny | `railway logs -s render-worker`; redeploy serwisu |
| Sklep nie pokazuje zmian treści | cache ISR (do 5 min) | odczekać lub redeploy storefrontu |
| 503 przy wgrywaniu zdjęć | brak/rotacja kluczy R2 na backendzie | Railway variables `R2_*` na serwisie `backend` |
| Panel admina: „An error occurred while rendering this page" zaraz po deployu | karta była otwarta przed deployem i prosi o stare pliki `/app/assets/*` (deploy zmienia ich nazwy) | odświeżenie strony; panel robi to sam — w `index.html` (hook `admin.vite` w `medusa-config.ts`) siedzi skrypt, który po nieudanym ładowaniu assetu przeładowuje kartę raz na 5 minut |

## Sekrety — gdzie mieszkają

Railway `backend`: `DATABASE_URL`, `REDIS_URL` (referencje), `JWT_SECRET`,
`COOKIE_SECRET`, `AUTH_MFA_ENCRYPTION_KEY`, `R2_*`, `RENDER_HOOK_TOKEN`.
Railway `render-worker`: `REDIS_URL`, `R2_*`, `RENDER_HOOK_URL`, `RENDER_HOOK_TOKEN`.
Vercel storefront: `MEDUSA_BACKEND_URL`, `MEDUSA_PUBLISHABLE_KEY`,
`MEDUSA_FIGURINE_PRODUCT_ID`, (opcjonalnie `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_SITE_URL`).
