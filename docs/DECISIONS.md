# Architecture decisions (ADR summary)

Locked 15 Aug 2026 after tool research. Owner: PO/CTO (agent).

| ID | Decision | Choice | Rationale |
|----|----------|--------|-----------|
| D1 | Monorepo | pnpm workspaces (`apps/*`, `packages/*`) | Shared Zod contracts; one CI surface |
| D2 | Web/LIFF | Next.js 15 App Router + `@line/liff` | Spec-aligned; LIFF is client-only; external browser via same app |
| D3 | API | NestJS 11 + Fastify | Modular domain services; first-class WS; OpenAPI |
| D4 | Realtime | Socket.IO (+ Redis adapter when scaled) | Trip room fan-out; multi-instance ready |
| D5 | Data | PostgreSQL 16 + PostGIS (prod); in-memory demo mode | Spec geospatial; zero-friction local demo |
| D6 | Cache/jobs | Redis + BullMQ | Presence, rate limits, continuation codes, scoring/retention |
| D7 | Maps UI | MapLibre GL | Cost control, custom luxury styling, no Google tile lock-in |
| D8 | Routing/ETA | Provider adapter: Haversine → OSRM → Mapbox/HERE | Spec cost control; Thailand PoC before vendor lock |
| D9 | Map vendor (prod shortlist) | **Mapbox primary**, HERE secondary for convoy scale | Mapbox: UX + Directions; HERE: predictable volume pricing |
| D10 | Auth | LINE ID token server verify; demo `AUTH_MODE=demo` | Spec security; no spoofable client profiles |
| D11 | Session | JWT + httpOnly cookie | LIFF + external browser |
| D12 | PTT (optional) | **LiveKit** SFU, feature-flagged | Open-source escape hatch, hold-to-talk friendly, ~10× cheaper than Daily at scale; Agora if APAC QoS fails PoC |
| D13 | Native GPS | Out of MVP; separate app workstream | Spec: background GPS not guaranteed in LIFF/browser |
| D14 | Vehicle assets | Generic silhouettes only by default | Trademark risk guardrail |
| D15 | Scoring | Versioned badge engine; **no speed inputs** | Critical product rule |

## Explicit non-choices

- Not Flutter/native for MVP (adds delivery risk before product validation).
- Not Google Maps as sole vendor (cost unpredictability at ETA recalculation volume).
- Not custom WebRTC mesh for PTT (operationally unsafe for 5–30 cars).
- Not betting / public discovery / CAN bus telemetry (out of scope).
