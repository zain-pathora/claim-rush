# 🏥 Claim Rush

> A 3D hospital story game about a real personal-injury case. One accident, one patient, one lien, followed through MediFlow 360 from the front door to the release.

**Code Clash 48** entry by Zain · Built with Vite + Three.js · Every person, clinic and firm is made up (no PHI)

**Play online:** https://zain-pathora.github.io/claim-rush/

---

## How to play

### Story mode (main game)

Maya Reyes (fictional) is rear-ended at a red light. She has no insurance that covers this, so her attorney refers her to an imaging centre that treats her **on a lien**: the clinic gets paid from her settlement.

You are the clinic's care coordinator. Walk the campus, talk to staff, and clear a mini-task at each step.

| Chapter | Where | What you do | Real MediFlow workflow |
|---|---|---|---|
| 0 · The Accident | Street | Cutscene: the crash and the attorney's referral | Firm referral |
| 1 · Front Desk | Lobby | Log in with a one-time SMS code, catch a wrong DOB on the referral, build the intake packet, e-sign, mark the visit **Arrived** | Front Desk portal, patient portal OTP, intake consents (HIPAA_AUTH, TREATMENT_CONSENT, RECORDS_RELEASE) |
| 2 · Prescreen & MRI | Imaging wing | Flag prescreen red flags, pick the open magnet for a claustrophobic patient, clear metal before it flies into the magnet, time 3 scan sequences, assign the radiologist | Prescreen, exam status chain (Completed → Read Assigned), TECH vs RAD components |
| 3 → 6 | Reading Room, Billing, Law Firm | *Coming next*: QC, split bills and liens, negotiation, settlement and Release of Lien | See [PLAN.md](PLAN.md) |

Three meters track how you do: **Patient Trust**, **Compliance** and **Recovery**. After each step, an "In MediFlow, this is…" card names the real screen.

### Rush mode (arcade)

The original arcade loop: carry patients through intake → exam → claim → lien before the timer runs out. Open it from the title screen or at `rush.html`.

### Controls

| Input | Action |
|---|---|
| `W A S D` / arrow keys | Walk |
| `E` / `Space` | Talk / use |
| `1` `2` `3` | Choose a dialog option |
| `Enter` | Continue |
| Touch | Drag to walk, tap to use |

---

## Run it locally

**Requirements:** Node.js 20+ (macOS, Windows or Linux)

```bash
git clone https://github.com/zain-pathora/claim-rush.git
cd claim-rush
npm install && npm run dev
```

Open **http://localhost:5173**. Rush mode is at http://localhost:5173/rush.html.

### Other commands

```bash
npm run build     # production build into dist/
npm run preview   # serve the build at http://localhost:5173
```

---

## Project structure

```
claim-rush/
├── index.html            # Story mode page
├── rush.html             # Rush mode (arcade) page
├── src/
│   ├── story.js          # story flow: intro cutscene, player, camera, chapters
│   ├── engine/core.js    # renderer, input (keys + touch), synth audio, characters, particles
│   ├── world/campus.js   # the 3D campus: rooms, furniture, gates, NPCs, collisions
│   ├── ui/ui.js          # dialog, mini-game modal, meters, phone, MediFlow cards
│   ├── chapters/         # frontDesk.js, mri.js (one module per chapter)
│   ├── data/case.js      # Maya's fictional case, prescreen, metal items
│   ├── rush.js           # Rush mode game
│   ├── story.css         # Story mode UI
│   └── style.css         # Rush mode UI
├── public/seed.json      # Rush mode data: made-up patients, documents, CPT codes
├── vite.config.js        # two-page build (story + rush)
├── .github/workflows/
│   └── deploy.yml        # builds and publishes to GitHub Pages on every push to main
├── PLAN.md               # the full design and build order
├── ABOUT.md              # what it is, why, features, what's next
└── CLAUDE.md             # setup notes for Claude Code
```

## Tech

- **Three.js** for the 3D campus, characters, lighting, cutscene and particles
- **Vite** for the dev server and the two-page build
- **Web Audio API** for synthesized sound effects (no audio files)
- **Google Fonts** (Fredoka)
- No backend, no accounts, no secrets. `.env.example` is included for completeness.

## Deployment

Every push to `main` runs `.github/workflows/deploy.yml`, which builds the game and publishes it to GitHub Pages.

## More

- [PLAN.md](PLAN.md): the full design, chapter by chapter
- [ABOUT.md](ABOUT.md): purpose, features and roadmap
- [CLAUDE.md](CLAUDE.md): setup notes for Claude Code
