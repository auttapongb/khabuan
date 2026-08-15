# Spec critique (PO + CTO + QA)

## Verdict

The draft SDS is **strong enough to build against**. Scope boundaries, safety rules, and LIFF honesty about background GPS are unusually clear. Gaps below are closed by product decisions in `DECISIONS.md` and backlog priorities — not by waiting for another discovery cycle for MVP demo.

## Strengths

- Critical product rule (no speed rewards) is enforceable and testable.
- Dual entry (LIFF + external/PWA) matches real LINE platform limits.
- Freshness model (Live / Delayed / Stale) prevents dangerous UX lies.
- Privacy retention defaults + invite threat model are launch-grade.
- Acceptance criteria AC-01…AC-12 map cleanly to automated tests.

## Gaps / risks closed by us

| Gap | Decision |
|-----|----------|
| Map vendor undecided | MapLibre UI + adapter; Mapbox primary for prod ETA |
| Launch country / residency | Default **Thailand / Asia/Bangkok**; i18n-ready strings |
| Group binding vs signed invite | MVP = signed invite only; OA group bind Phase 2 |
| Trip base definition | Destination + meeting point MVP; checkpoints Phase 2 |
| Capacity 100 concurrent | Design target; demo load-test harness Phase 2 |
| PTT in same release | Feature-flagged LiveKit scaffold; not MVP gate |
| Native background GPS | Explicitly deferred; UI discloses foreground-only |

## Critique of requirements

- **FR-13 PTT as Optional** — correct; keep out of MVP Definition of Done.
- **Passenger/navigator persona** — must be a first-class UX toggle (implemented), not docs-only.
- **Admin / support** — SDS under-specifies support SLA; we ship least-privilege admin + audit stubs.
- **Badge “Late Arrival +2 private”** — good; UI must never rank-shame (enforced in summary defaults).
- **ETA every meaningful move** — needs hard cache TTL + budget alerts before pilot (NFR-09).

## Tester notes

Highest defect risk areas: (1) LIFF↔external continuation identity mismatch, (2) stale markers shown as live, (3) arrival double-fire, (4) invite forward intrusion, (5) sharing indicator lying after OS permission revoke.
