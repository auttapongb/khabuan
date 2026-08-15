# MCG Convoy — Web (LIFF + PWA)

Next.js 15 App Router frontend for private luxury-car convoy coordination. Works in **demo mode** without LINE credentials or a running API (localStorage-backed). When `NEXT_PUBLIC_AUTH_MODE` is not `demo` and `NEXT_PUBLIC_LIFF_ID` is set, it initializes `@line/liff` and exchanges tokens with the API.

## Stack

- Next.js 15 + TypeScript
- `@line/liff`
- `maplibre-gl` live map
- CSS modules + `tokens.css` (graphite + champagne gold)
- PWA manifest + offline shell service worker

## Screens

| Route | Purpose |
|-------|---------|
| `/` | Landing — enter demo as organizer or member |
| `/invite/[token]` | Invitation + privacy summary |
| `/trips/new` | Create trip |
| `/trips/[id]` | Pre-trip lobby |
| `/trips/[id]/live` | Full-bleed live convoy map |
| `/trips/[id]/arrive` | Arrival confirm / dispute |
| `/trips/[id]/summary` | Badges + safe results |
| `/vehicle` | Vehicle class / color / silhouette |
| `/admin` | Trips list, revoke invite, close trip |

## Run

From the monorepo root (pnpm):

```bash
cd mcg-convoy
pnpm install
pnpm dev:web
```

Or from this app:

```bash
cd mcg-convoy/apps/web
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

API (optional):

```bash
pnpm dev:api
```

Default API base: `http://localhost:4000` (`NEXT_PUBLIC_API_URL`).

## Environment

Copy `.env.example` to `.env.local`:

```env
NEXT_PUBLIC_AUTH_MODE=demo
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_LIFF_ID=
NEXT_PUBLIC_MAP_STYLE=https://demotiles.maplibre.org/style.json
```

- `demo` — mock users, skip LIFF; demo store if API is unreachable
- Set `NEXT_PUBLIC_AUTH_MODE=liff` and a real LIFF ID for LINE

## Demo flow

1. Landing → **Enter demo as organizer** → create or use seeded trip  
2. Share `/invite/demo-invite-mcg` or open as member  
3. Lobby → **Start sharing** → grant geolocation  
4. Live map → **Simulate convoy** for fake participants / freshness states  
5. Arrive → Summary (organizer can **Close trip**)

## Safety

- Persistent “Do not operate while driving” notice  
- Sharing indicator always visible while on live trip  
- Dense controls lock when movement is detected (passenger mode override)  
- No speed-based rewards in UI or copy  

## Lib map

- `src/lib/liff.ts` — LIFF init / demo session / share / external browser  
- `src/lib/api.ts` — REST client + demo fallback  
- `src/lib/geo.ts` — freshness, ETA estimate, geolocation watch  
- `src/lib/demo-store.ts` — localStorage demo persistence  
