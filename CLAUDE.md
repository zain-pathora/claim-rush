# Claim Rush

3D hospital story game about a personal-injury lien case in MediFlow 360, plus an arcade Rush mode (Vite + Three.js, plain JavaScript). No backend.

## Prerequisites
- Node.js 20 or newer (built on Node 24)

## Run
```bash
npm install && npm run dev
```
Open http://localhost:5173

## Build
```bash
npm run build && npm run preview
```

## Layout
- `index.html` + `src/story.js`: Story mode. `rush.html` + `src/rush.js`: Rush mode.
- `src/engine/core.js`: renderer, input, audio, characters, effects.
- `src/world/campus.js`: rooms, NPCs, gates, collisions.
- `src/ui/ui.js`: dialog, mini-game modal, meters, phone, MediFlow cards.
- `src/chapters/*.js`: one async function per chapter. Each awaits `waitFor({ npc } | { pos, label })`, then runs dialogs and mini-games.
- `src/data/case.js`, `public/seed.json`: made-up data only (no PHI).
- `PLAN.md`: the full design and build order.

## Rules
- Contest entry: Claude Code only, low effort. No secrets, no paid services, no real patient data.
- The name "RadFlow" must not appear; the game says "MediFlow Imaging". Never show MediFlow as the place a study is read.
- In dev, `window.__story` (Story) and `window.__game` (Rush) expose state for testing.

## Testing in the Claude browser pane
The pane freezes `requestAnimationFrame` while it's in the background. In the console, run
`window.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 16)`, then drive the game through `window.__story`.

## Deploy
Push to `main`; `.github/workflows/deploy.yml` publishes to https://zain-pathora.github.io/claim-rush/
