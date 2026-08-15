# Thai market + persona UX (Iteration 5)

Locked 15 Aug 2026 after Thailand / LINE / PDPA / club-culture research. Owner: PO (agent).

## Personas (from SDS + Thai club reality)

| Persona | Who in Thailand | Jobs to be done |
|---------|-----------------|-----------------|
| Organizer / หัวขบวน | Club officer or host (often bilingual EN+TH) | Create trip, drop LINE link in the group, see who is late without shaming |
| Driver / สมาชิก | Owner in a 5–30 car run to Khao Yai, Hua Hin, or a Bangkok dinner | Join from LINE, pick a silhouette, share only while live, follow รถนำ |
| Passenger / นำทาง | Partner or friend in the right seat | Operate the map; driver never taps |
| Admin | MCG staff | Revoke invite, close trip |

Thai luxury convoys (Porsche Club, Mercedes Club, Lamborghini Club, cross-brand LINE groups) already speak this language: **จุดนัดพบ**, **รถนำ**, **รถปิดท้าย**, **พักปั๊ม**, then a dinner. Coordination today is a noisy LINE group (“ถึงไหนแล้ว”). MCG replaces that without becoming a race app.

## Market rules we ship

1. **Thai-default, English toggle.** LINE Mini App 2026 guidance is Thai-first. Owners are bilingual; staff and passengers often are not. Equal-weight TH | EN — no dark pattern.
2. **Thai-capable type.** Cormorant/Outfit do not cover Thai. IBM Plex Sans Thai for Thai UI; Cormorant stays on Latin brand marks.
3. **Buddhist calendar when `th`.** `th-TH` + `Asia/Bangkok` (พ.ศ. 2569).
4. **LINE is the foyer.** Share card + deep link must look like a Flex preview. Sessions are seconds-long; one thumb-primary action.
5. **PDPA (พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล).** Location is purpose-limited: only while the convoy is open, withdraw = Pause/Stop. Invite requires an explicit opt-in checkbox. Not a cookie wall; not marketing consent.
6. **Club vocabulary on the HUD.** Lead / sweep / meeting point are first-class, not buried in notes.
7. **Google Maps out.** Thai drivers already navigate there. We coordinate; we do not replace turn-by-turn.
8. **Safety copy in both languages.** No speed rewards. Passengers operate the map.

## Iteration 6 — Flex + ด่าน / Easy Pass

Thai convoys stall at ด่านดินแดง when someone cuts into the cash lane. Briefing is a safety feature, not decoration.

| Ship | Detail |
|------|--------|
| Real Flex bubble JSON | `shareTargetPicker` single bubble (no carousel). Demo copies JSON. |
| บรีฟขบวน | ทางด่วนเฉลิมมหานคร/ศรีรัช, ด่านดินแดง Easy Pass ชิดขวา, M-Flow = มอเตอร์เวย์ only |
| OA reminder stub | 30 นาทีก่อนเป้าถึง — queues until Messaging API is connected |
| PDPA consent log | `localStorage` record: trip + purpose + time |
| Create trip | จุดนัดพบ field separate from destination |

## Explicit non-goals this pass

- Production LINE OA credentials / live Flex send from an Official Account.
- Longdo Maps (Google is the habit).
- Gendered ครับ/ค่ะ on buttons (keep polite-neutral).
- Marketing cookies / LINE OA friend-gate before value.
