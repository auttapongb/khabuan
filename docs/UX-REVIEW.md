# UX review log (user verification)

## Persona walkthroughs

### Organizer
1. Landing → Enter demo as organizer → Create trip → Lobby → Open live → Share → Close → Summary.
2. Expectation: brand-first landing, one job per screen, champagne/graphite luxury tone.

### Member
1. Landing → Enter as member → Invite `demo-invite-mcg` → Vehicle → Join → Live → Simulate convoy → Arrive → Summary.
2. Expectation: privacy summary before join; sharing indicator always honest; late badges private.

### Passenger
1. Live map → Passenger mode ON → dense inputs unlocked while “moving”.
2. Expectation: driver not forced to tap small controls.

## Findings → fixes (iteration 1)

| Finding | Severity | Fix |
|---------|----------|-----|
| Duplicate brand + H1 competing | Med | Single hero brand composition |
| Demo invite token mismatch vs API | High | Alias `demo-invite-mcg` + API-first client |
| Port 4000 vs API 3001 | High | Align env to 3001 |
| Demo mode never hit API | High | Prefer API when healthy |
| Map demo tiles low-contrast | Med | Carto Dark Matter style |
| Join failed on API response shape | High | Treat join 200 + GET trip |
| Map jumped to Africa (0,0 GPS) | High | Ignore far GPS; fitBounds near destination |
| Simulation invisible vs API refresh | High | Local sim overlay markers |
| Live HUD covered full map | Med | Compact desktop sheet |

## Iteration 6 — Flex + expressway briefing (15 Aug 2026)

| Change | Why |
|--------|-----|
| Real LINE Flex bubble (graphite/champagne) | shareTargetPicker; club group is the foyer |
| ด่านดินแดง / Easy Pass / M-Flow note | Thai convoys break at the wrong toll lane |
| OA reminder 30 min stub | Organizer job: “อย่าลืมออก” without spam |
| PDPA consent persisted | Auditable opt-in for location purpose |
| Separate จุดนัดพบ on create | Meeting ≠ destination |

## Iteration 5 — Thai market + persona language (15 Aug 2026)

Research: LINE Mini App TH-first, PDPA opt-in, Porsche/Mercedes/Lambo club LINE groups, จุดนัดพบ / รถนำ / รถปิดท้าย, Google Maps as the nav habit.

| Change | Why |
|--------|-----|
| TH default + EN toggle (equal weight) | Bilingual owners; Thai passengers/staff |
| IBM Plex Sans Thai | Cormorant/Outfit cannot render Thai |
| `th-TH` Buddhist calendar | Local time literacy |
| จุดนัดพบ / จุดหมาย / พักปั๊ม cards | How Thai convoys actually brief |
| รถนำ / รถปิดท้าย on roster | Club roles, not SaaS “organizer/member” |
| LINE Flex-style share card | Group chat is the foyer |
| PDPA location checkbox on invite | Purpose-limited, withdrawable |

## Iteration 4 — instrument cluster + foyer ritual (15 Aug 2026)

Research: TomTom “action + overview”, Android Automotive “build from black”, AAOS cluster = dark / non-interactive while driving. Ferrari Luce analogue depth → NumberFlow, not 3D chrome.

| Change | Screen |
|--------|--------|
| Sim binds to real trip members (no Nova/Remy ghosts in roster) | Live HUD |
| Peek = share + ETA; expand = roster + passenger + extras | Live HUD |
| Recenter map action (cluster strip) | Live map |
| Invite / convoy / arrive ritual tiles | Landing |
| Ceremony card + privacy icons | Invite, lobby, create, arrive, summary |
| Cursor rule `mcg-convoy-luxury-ui` | Repo |

Skipped: next-view-transitions (uneven iOS LIFF), Howler (audio in webview is risky), Embla (garage radios already large).

## Iteration 3 — branded map + garage + Base UI

Decision: OpenFreeMap dark + champagne/graphite remint (no Protomaps API key, no 120GB planet). Skip Rive (no authored `.riv`). Camera fits once per convoy set, not every GPS tick.

| Change | Screen |
|--------|--------|
| OpenFreeMap + MCG flavor | Live map |
| 150 m arrival geofence ring | Live map |
| Sim route trails | Live map |
| Base UI Switch | Passenger mode |
| Garage stage + paint radios | Vehicle |
| Phosphor safety / admin / create | Chrome |

## Iteration 2 — Motion / Vaul / NumberFlow / Sonner / Phosphor / Turf

| Change | Screen |
|--------|--------|
| Motion enter + stagger | Landing, lobby list, badges |
| NumberFlow countdown / ETA / points | Lobby, live, summary |
| Vaul snap drawer (mobile) + side sheet (desktop) | Live map |
| Sonner toasts + haptic tap | Join, share, arrive, close |
| Phosphor icons | Sharing, lobby, live, arrive |
| Turf bearing → heading needles | Live markers |

## User verification (browser, 15 Aug 2026)

- Landing → member → invite Bangkok Sunset Convoy: **pass**
- Join → lobby with 2 participants: **pass**
- Start sharing → live map + safety banner + sharing ON: **pass**
- Simulate convoy (Bangkok paths + freshness): **pass after fix**
- Remaining for staging: real LINE channel, Prisma persistence, pen-test, E2E CI

