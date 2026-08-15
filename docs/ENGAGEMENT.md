# Khabuan — Persona & Group-Bot Engagement Design

> How to make people actually *play* Khabuan, decoded from Parnuan (ป้านวล) and KhunThong (ขุนทอง).
> Owner: PO/CTO. Status: draft spec for implementation.

---

## 0. Why this exists (the research in one paragraph)

Two LINE-native products won where others didn't, and for the same three reasons:

- **ป้านวล (Parnuan)** — 24.4M items logged, 567K users. It's not an "expense tracker," it's *Auntie Nuan*, your auntie who keeps accounts, and you're one of her "หลาน" (grandchildren). You type `"coffee 80"` like a text message and it's logged. It lives inside LINE — the app Thai people already open every day.
- **ขุนทอง (KhunThong)** — KBank's "social chatbot treasurer," a talking-bird persona you add to your LINE *group*. It splits bills and **chases friends for money until they pay** — it does the socially awkward chore so the human doesn't have to damage a friendship.

The shared formula: **a warm named persona, living inside the LINE group, doing an awkward chore by chat, framed around relationships.** Khabuan has the chore (convoy coordination + the "who's late / who's lost" nag) and the LINE distribution. It is missing the **persona** and the **group-chat presence**. This doc specs both.

---

## 1. The Persona — พี่นำขบวน (P' Nam Khabuan)

**"The convoy marshal who rides ahead and calls the group home."**

| Attribute | Value |
|-----------|-------|
| Name | พี่นำขบวน (Phi Nam Khabuan) — "convoy leader" |
| Role | Group's marshal: roll-caller, arrival announcer, gentle nagger, celebrant |
| Personality | Warm · a little cheeky · **proud of the convoy** · protective (safety-first) |
| Voice | Thai-first, short sentences, light emoji, never dry/robotic |

**Tone rules (enforced, non-negotiable):**
1. **Never imply speed.** The word "เร็ว" (fast) is banned. Celebrate *arrival*, not *pace*. "ถึงแล้ว" (arrived) — never "ไปถึงเร็วมาก" (got there fast).
2. **Never rank-shame in the group.** Late arrivals are private (DM), never public. The "late" badge stays private (already enforced in the badge engine — keep it).
3. **Frame wins as the GROUP (ขบวน), not the individual.** "ขบวนถึงครบ" (the convoy all arrived) — not "you won."
4. **Absorb the awkward chore.** The bot does the nagging so the organizer never has to be the bad guy.
5. **Safety is the brand.** When someone is running late, the message is "drive safe, just tell us you're okay" — never "hurry up."

**Why a persona (not a "notification system"):** people bond with characters, not tools. Parnuan users call themselves Auntie Nuan's grandchildren. Khabuan members should call themselves "ลูกขบวน" (the convoy's crew) — a shared identity, not "users."

---

## 2. Where it lives — two surfaces, one persona

| Surface | Purpose | Example |
|---------|---------|---------|
| **LINE group chat (bot)** | The habit layer — announcements, roll calls, arrivals, nagging | "🚗 คันที่ 3 ออกตัวแล้ว!" |
| **LIFF (web/PWA)** | The depth layer — live map, ETA, badges, trip archive | full convoy map |

The bot in the group is the **habit**; the LIFF is the **depth**. KhunThong's whole trick is being a *group bot*. Khabuan should post into the group chat, not require everyone to open the map.

---

## 3. The message flow (before → during → after)

The exact messages พี่นำขบวน posts. Thai-first with English in brackets.

### 3.1 Before — anticipation (build the ritual)

| Trigger | Message |
|---------|---------|
| Trip created | 📋 ทริป "เขาใหญ่ 4 มี.ค." พร้อมแล้ว! กี่คันมาเอ่ย? — *[Trip "Khao Yai 4 Mar" is ready! How many cars?]* |
| Roll call | เช็คชื่อขบวน! คันไหนมาบ้าง แตะ "🚗 มา" หน่อย — *[Roll call! Who's coming? Tap "🚗 in"]* |
| T-3 days | เหลือ 3 วันถึงวันออกขบวน! ตรวจรถกันรึยัง? ⛽ — *[3 days to go! Checked your car yet?]* |
| T-1 day checklist | เช็กลิสต์ก่อนออก: น้ำมัน ⛽ · น้ำดื่ม 💧 · แผนที่ 🗺️ · เจอกัน 6 โมง — *[Pre-trip checklist: fuel, water, map. Meet 6am]* |

**Why:** low-frequency activity needs an *anticipation* loop to replace the "daily habit" Parnuan has. The countdown + roll call turns "a trip next month" into an ongoing thread people keep touching.

### 3.2 During — live coordination (the core chore)

| Trigger | Message |
|---------|---------|
| First departure | 🚗 คันที่ 1 ออกตัวแล้ว! ขบวนพร้อมออก! — *[Car 1 departed! Convoy, ready to roll!]* |
| Each departure | ออกตัวแล้ว 3 คัน เหลืออีก 2 — *[3 departed, 2 to go]* |
| Each arrival | 🏁 คันที่ 3 เข้าเส้นชัย — เป๊ะ! — *[Car 3 crossed the line — spot on!]* |
| Halfway | ขบวนถึงครึ่งทาง ทุกคันปลอดภัยดี ✅ — *[Convoy halfway, everyone safe]* |
| Gentle nag (in group, anonymous) | เหลือ 2 คันกำลังมา ETA ~10 นาที — ไม่ต้องรีบนะ ขับปลอดภัย 😊 — *[2 cars still coming, ETA ~10 min — no rush, drive safe]* |
| Late (DM only, private) | ถึงช้าไม่เป็นไร แต่บอกหน่อยน้าว่าปลอดภัย 💙 — *[Running late is fine — just tell us you're safe]* |

**The KhunThong move:** the "who's late" nag is the awkward social chore. The bot does it *gently and anonymously*, so the organizer never has to be the bad guy. Late status goes to **DM**, never the group.

### 3.3 After — the payoff (the memory that compounds)

| Trigger | Message |
|---------|---------|
| All arrived | 🎉 ขบวนถึงครบ 100%! วันนี้เป๊ะมาก! — *[Convoy 100% arrived! Today was spot on!]* |
| Badge drop | 🏅 "Road Captain" ตกเป็นของ [organizer] — ขบวนถึง 80%+ ตรงเวลา! — *["Road Captain" goes to [organizer] — 80%+ arrived on time!]* |
| Streak | 🔥 [Club] ถึงตรงเวลา 3 ทริปติด! ขบวนนี้น่าเชื่อถือสุดๆ — *[[Club] on-time 3 trips straight — most reliable crew!]* |
| Trip recap (auto) | 📸 สรุปทริปพร้อมแล้ว — ระยะทาง 180 km · เวลา 3 ชม. · ถึงครบ 12 คัน · ดูแผนที่ย้อนหลัง — *[Trip recap ready — 180km, 3hrs, 12 cars. Replay the map]* |

**The data-collection payoff:** the auto-recap is the *voluntary* data flywheel. Every trip becomes a richer archive (route, timing, photos, badges) the club *wants* to keep — so they keep feeding it. This is the thing Parnuan monetizes ("export your data") inverted: here the richer history *is* the product.

---

## 4. Chat-as-interface (the chore by typing, not forms)

Parnuan's trick: the chore is done by *chatting*, not by filling forms. Khabuan's commands — members just type in the LINE group:

| Typed | Meaning | Bot action |
|-------|---------|------------|
| `ถึงแล้ว` / `ถึง` | I've arrived | Mark arrival → fire arrival window / badge logic |
| `ออกตัว` / `ออก` | I'm departing | Mark departed → update map + announce |
| `แวะปั๊ม` | Pit stop | Pause tracking, ETA +15 min |
| `หลงทาง` | I'm lost | Alert organizer + share nearest meeting point |
| `เช็คขบวน` | Where is everyone? | Post full status: X arrived, Y en route, Z departed |

Multi-modal (from Parnuan): allow **voice** ("บอกพี่นำขบวนได้เลย") and **photo** (send a receipt/parking photo → logs a checkpoint). Voice matters on the road where hands aren't free.

---

## 5. Gamification → club identity (not a private score)

Your badge engine is already safety-smart and idempotent. The missing layer is *social visibility*:

1. **Club leaderboard, not personal score.** A monthly "Road Captain" and "most reliable crew" ranking, posted to the group. Individual *shame* stays private; group *pride* is public.
2. **The collective win is the game.** The "conquest" is *the convoy arriving together on time*, framed as a group achievement — not a solo high-score. (This is also the safety-safe way to gamify: the reward is punctuality + completeness, never speed.)
3. **Streaks as reputation.** "3 trips on time" (Reliable Cruiser) surfaces as *club* reputation, not a badge in a drawer.
4. **Badge → memory.** Every badge attaches to the trip recap, so the badge collection *is* the trip history.

---

## 6. Privacy as the pitch (not a disclaimer)

Khabuan's privacy model is a real moat vs Glympse/Life360 (always-on). Make it the headline:

1. **"ตำแหน่งของคุณแชร์แค่ทริปนี้ — แล้วหายไป"** (*Your location is shared only for this trip — then it's gone.*) Lead with this in onboarding. It's the trust that makes a luxury club comfortable sharing.
2. **Visibility tiers as a user-facing choice** (you already have `visibility: "exact"`): exact / fuzzy (only ETA, not dot) / hidden (participating but not tracked). Frame it as "you control who sees you."
3. **The bot nags so the organizer doesn't.** Privacy-preserving social pressure — no one is publicly shamed; the bot does private nudges. This *is* a privacy feature (organizers don't have to confront members).

---

## 7. What each mechanic captures (the data-collection map)

| Mechanic | Data captured (voluntarily) |
|----------|------------------------------|
| Roll call | who's-in, opt-in rate per club |
| Departure / arrival chat | real arrival timestamps (feeds badge engine) |
| Pit stop / lost | route events, pain points |
| Live map | GPS trace per trip (consented, trip-scoped) |
| Trip recap | route, timing, photos, badge outcomes |
| Club leaderboard | retention, trip frequency, club health |

**Design principle:** every engagement mechanic should *also* be a data-capture mechanic. The persona + chat + social layer all raise data *quality* because people contribute location, arrivals, and trip metadata voluntarily — because it's fun and social, not because they're asked.

---

## 8. Implementation order (MoSCoW for this doc)

| Priority | Item | Why first |
|----------|------|-----------|
| **Must** | Persona voice + tone rules (section 1) | Everything downstream uses it |
| **Must** | Group-bot surface + message flow (section 3) | The habit layer; highest engagement lift |
| **Must** | Chat-as-interface commands (section 4) | Zero-friction data capture |
| **Should** | Club leaderboard + streak framing (section 5) | Social retention |
| **Should** | Privacy-as-pitch onboarding (section 6) | Trust = sharing = data |
| **Could** | Auto trip recap / memory reel (section 3.3) | The compounding archive |

---

*Research basis: parnuan.com (24.4M items, 567K users, Aug 2026), KhunThong KBTG social chatbot (KBank), LINE Mini App gamification patterns.*
