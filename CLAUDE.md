# Claim Rush

3D clinic arcade game (Vite + Three.js, plain JavaScript). No backend.

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
- `src/main.js`: scene, game loop, stations, prompts, scoring
- `src/style.css`: HUD and screens
- `public/seed.json`: made-up patients, documents, exams with CPT codes, attorneys (no PHI)

## Rules
- Contest entry: Claude Code only, low effort. No secrets, no paid services, no real patient data.
- In dev, `window.__game` exposes state for testing.

## Deploy
Push to `main`; `.github/workflows/deploy.yml` publishes to https://zain-pathora.github.io/claim-rush/
