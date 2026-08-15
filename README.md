# ขบวนพร้อม (Khabuan)

LINE LIFF + responsive web/PWA for private luxury-car group trips. Product name is Thai-first; the repo folder stays `mcg-convoy`.

## Quick start (demo)

```bash
cd mcg-convoy
pnpm install
pnpm --filter @mcg-convoy/shared build
pnpm --filter @mcg-convoy/api start:demo   # http://localhost:3001
pnpm --filter @mcg-convoy/web dev          # http://localhost:3000
```

Open http://localhost:3000 → **Enter demo as member** → join → live map → **Simulate convoy**.

## Docs (SDLC)

| Doc | Purpose |
|-----|---------|
| [docs/DECISIONS.md](docs/DECISIONS.md) | Locked stack & vendor choices |
| [docs/CRITIQUE.md](docs/CRITIQUE.md) | Spec review |
| [docs/BACKLOG.md](docs/BACKLOG.md) | MoSCoW + points |
| [docs/DELIVERY-PLAN.md](docs/DELIVERY-PLAN.md) | Phases & DoD |
| [docs/UX-REVIEW.md](docs/UX-REVIEW.md) | User verification log |
| [docs/SPEC-SOURCE.txt](docs/SPEC-SOURCE.txt) | Extracted SDS text |

## Packages

| Path | Role |
|------|------|
| `apps/web` | Next.js 15 LIFF + PWA |
| `apps/api` | NestJS API + Socket.IO |
| `packages/shared` | Zod contracts |

## Production notes

- Set `AUTH_MODE=line`, LINE channel IDs, `PERSISTENCE_MODE=prisma`, Redis, map provider keys.
- PTT: `PTT_ENABLED=true` + LiveKit credentials (scaffold returns 501 when off).
- Docker: `docker compose up -d` for PostGIS + Redis.
