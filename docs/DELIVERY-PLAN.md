# Estimation & delivery plan

## Team assumption (from SDS)

PO, UX, tech lead, 2–3 full-stack, QA automation, part-time DevOps/security, privacy/legal support.

## Calendar (planning ranges)

| Phase | Weeks | Exit |
|-------|-------|------|
| 0 Discovery & spike | 2–3 | Device matrix, LINE topology, map PoC, threat model — **compressed into DECISIONS + working demo** |
| 1 MVP build | 10–14 | Production-ready core — **in progress in this repo** |
| 2 Pilot & harden | 3–4 | Controlled MCG trips, pen-test, launch gate |
| 3 Enhancements | 4–8 | Checkpoints, PWA polish, OA messaging |
| Optional PTT | 4–6 | LiveKit pilot go/no-go |

## Cost / vendor notes (non-binding)

- Mapbox Directions + MapLibre tiles: budget per active trip; cache aggressively.
- LINE Messaging API: only if OA joins groups; otherwise share-picker only.
- LiveKit Cloud: enable only after PTT pilot criteria met.
- Infra: start single-region containers; WebSocket-capable host required.

## Definition of Done (MVP)

- [x] Demo path: auth → invite → lobby → live map → arrive → badges
- [x] No speed-based scoring in engine
- [x] Freshness labels implemented
- [x] Safety banner + passenger mode
- [ ] AC E2E suite green in CI
- [ ] LINE channel credentials configured in staging
- [ ] DPIA / legal copy approved by MCG
- [ ] Pen-test + critical/high closed
- [ ] On-call runbooks + retention job evidence

## Launch gate owners

| Gate | Owner |
|------|-------|
| Product acceptance | MCG PO |
| Security/privacy | MCG + delivery security |
| LINE production channels | MCG |
| Go-live | Joint |
