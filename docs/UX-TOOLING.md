# UX/UI tooling research (15 Aug 2026)

Goal: make MCG Convoy feel like a private club instrument cluster — not a generic SaaS dashboard, not an Awwwards 3D car ad.

Current baseline: custom CSS tokens (graphite + champagne), Cormorant Garamond + Outfit, MapLibre + Carto Dark Matter, CSS fade-in only. No icon system, no sheet primitive, no number motion, no branded map flavor.

## Do not adopt as the visual system

| Tool | Why skip as primary |
|------|---------------------|
| Aceternity UI / Magic UI / React Bits | Fast, but Inter + purple glow + glass cards. Fights the brand. Steal *patterns*, never the look. |
| shadcn default theme | Excellent plumbing; default zinc/slate looks like every 2025 SaaS. Use primitives, restyle tokens. |
| Lenis smooth scroll | Wrong for LIFF + live map. Hijacks scroll on a driving UI. |
| Full R3F car configurator on live map | Battery, trademark, and safety risk. Passenger/vehicle *setup* only. |
| GSAP sitewide | Overkill for trip flows. Keep for a future marketing page. |

## Adopt — ranked by appeal × fit

### 1. Motion (`motion` / formerly Framer Motion) — must
- **What:** React layout, enter/exit, shared-element, sheet snap.
- **Where:** lobby → live sheet, invite join, badge reveal, sharing state.
- **Why:** Default 2026 React motion engine (~30 KB). Matches our existing 2–3 motion rule.
- **License:** MIT · https://motion.dev

### 2. Vaul — must (live map HUD)
- **What:** iOS-grade bottom drawer (drag, snap points, overlay).
- **Where:** live convoy sheet: peek (ETA + sharing) / half (participants) / full (controls).
- **Why:** Biggest perceived-quality jump on mobile. Current sheet is a static card that covers the map.
- **License:** MIT · https://github.com/emilkowalski/vaul

### 3. NumberFlow (`@number-flow/react`) — must
- **What:** Odometer-style number transitions (Intl + Web Animations).
- **Where:** lobby countdown, ETA minutes, grace window, badge points.
- **Why:** Luxury products feel “instrumented.” Static `01:59:03` looks cheap next to rolling digits.
- **License:** MIT · https://number-flow.barvian.me

### 4. Protomaps basemaps (`@protomaps/basemaps` + PMTiles) — must
- **What:** Open vector tiles + TypeScript flavor object (colors, fonts, sprites).
- **Where:** live map. Override `dark`/`black` flavor to graphite land + champagne roads/labels.
- **Why:** Carto Dark Matter is competent but generic. A branded map is the product’s hero surface.
- **Tools:** Maputnik (visual style editor) · https://maplibre.org/maputnik
- **License:** BSD/CC0 tiles · https://docs.protomaps.com/basemaps/flavors

### 5. Turf.js (`@turf/turf`) — must
- **What:** along-route interpolation, bearing, geofence, smooth camera.
- **Where:** convoy markers rotate with heading; camera follows without Africa-jumps; arrival geofence viz.
- **Why:** Official MapLibre pattern for “animate a point along a route.”
- **License:** MIT · https://turfjs.org

### 6. Sonner — should
- **What:** Quiet toast stack.
- **Where:** Sharing started / paused / stopped, invite copied, arrival confirmed, GPS denied.
- **Why:** Current flows fail silently or rewrite the whole page. Luxury = confirmation without modal spam.
- **License:** MIT · https://sonner.emilkowalski.com

### 7. Base UI (`@base-ui/react`) — should
- **What:** Unstyled accessible Dialog, Select, Switch, Toast primitives (MUI-maintained successor energy to Radix).
- **Where:** vehicle color/class pickers, admin confirm, passenger toggle, invite states.
- **Why:** We have raw `<select>`/`<input>`. Headless primitives keep champagne styling + WCAG 2.2 AA.
- **Alt:** Radix (more examples) or React Aria (strict a11y). Base UI is the 2026 long-term bet.
- **License:** MIT · https://base-ui.com

### 8. Phosphor Icons or Lucide — should
- **What:** Consistent stroke icon set.
- **Where:** sharing, pause, map, arrival, safety, vehicle class.
- **Pick:** **Phosphor** (duotone/thin weights read more luxury) over Lucide (more SaaS).
- **License:** MIT · https://phosphoricons.com

### 9. Rive (`@rive-app/react-canvas`) — should (small, state-driven)
- **What:** Tiny interactive animations with inputs (sharing on/off, badge unlock).
- **Where:** SharingIndicator pulse, badge chip unlock, “live” pip.
- **Why:** Lottie is fire-and-forget. Rive can bind to `sharingState` / freshness. Keep files <80 KB.
- **Not:** decorative loops on the driving screen.
- **License:** runtime free · https://rive.app

### 10. next-view-transitions — optional
- **What:** Native View Transitions API for App Router.
- **Where:** invite → lobby → live (shared brand mark).
- **Caveat:** iOS LINE webview support is uneven; always pair with Motion fallback.
- **License:** MIT · https://github.com/shuding/next-view-transitions

## High-impact but gated

| Tool | Use | Gate |
|------|-----|------|
| React Three Fiber + drei | Vehicle setup: *generic* rotating silhouette, paint metalness | Never manufacturer models; pause off-screen; no live-map WebGL |
| Howler / Web Audio tick | Soft click on Start/Pause Sharing | Passenger mode or stopped only; mute default in driving mode |
| `navigator.vibrate` | 10–20 ms on share start/stop | Capability-detect; never continuous |
| Embla Carousel | Vehicle icon picker | Fine; keep large touch targets |
| cmdk | Admin command palette | Admin only |

## Cursor skills that help this work

| Skill | Use for MCG |
|-------|-------------|
| [canvas](https://github.com) / Cursor Canvas | Side-by-side visual QA of invite / live / summary — do not dump tables |
| create-skill | Author `mcg-luxury-ui` skill: tokens, motion budget, no-speed, no-shaming, no-Aceternity |
| create-rule | Persist those constraints in `.cursor/rules` so later edits do not regress to SaaS chrome |

## Recommended install set (MVP polish)

```bash
pnpm --filter @mcg-convoy/web add motion vaul @number-flow/react sonner @base-ui/react @phosphor-icons/react @turf/turf
# map flavor later:
# pnpm --filter @mcg-convoy/web add @protomaps/basemaps pmtiles
```

## Screen → tool map

| Screen | Tools |
|--------|-------|
| Landing / invite | Motion enter, Phosphor, View Transition on brand |
| Create trip | Base UI fields, Sonner on save |
| Lobby | NumberFlow countdown, Motion participant list |
| Live map | Vaul snaps + Protomaps flavor + Turf heading + NumberFlow ETA |
| Arrival | Motion confirm, Sonner, optional haptic |
| Summary | NumberFlow points, Rive badge unlock, Motion stagger |
| Vehicle | Phosphor + optional R3F generic mesh |
| Admin | Base UI + Sonner + cmdk later |

## Iteration 4 research notes

- Automotive UX: peek HUD is the cluster (action); expanded sheet is the center stack (overview). Do not dump every control onto the driving surface.
- Color: purpose only; champagne for destination/live trails; green/amber/slate for freshness — never speed heatmaps.
- Recenter is the only map chrome we add (AAOS map-action-strip pattern).
- Still skip Rive until authored `.riv` files exist. Still skip Protomaps self-host until ops is ready.

## Motion budget (keep luxury, stay safe)

- One shared-element or sheet motion per navigation.
- Live map: markers interpolate; HUD does not bounce.
- `prefers-reduced-motion`: NumberFlow `animated={false}`, Vaul snap without spring.
- No custom cursor, no particle fields, no scroll hijack inside LIFF.
