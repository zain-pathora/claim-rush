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
| 1 · Order Intake | Back Office | Tag a 5-page fax (RX, PHOTO_ID, DEMOGRAPHICS, INSURANCE) against a timer, catch the page the AI wrongly put in Maya's chart, record her seat in the car | Pulse inbox, orders (AI split, a person accepts), claim details |
| 2 · Scheduling | Back Office | Call Maya and log the outcome (voicemail → LEFT_VM), then book a slot on the lease calendar that fits her: afternoons, open MRI, inside the leased block | Booking-call outcomes, scheduler, block lease, SCHEDULED → CONFIRMED |
| 3 · Front Desk | Lobby | Log in with a one-time SMS code, catch a wrong DOB on the referral, build the intake packet, e-sign, mark the visit **Arrived** | Front Desk portal, patient portal OTP, intake consents (HIPAA_AUTH, TREATMENT_CONSENT, RECORDS_RELEASE) |
| 4 · Prescreen & MRI | Imaging wing | Flag prescreen red flags, pick the open magnet for a claustrophobic patient, clear metal before it flies into the magnet, time 3 scan sequences, assign the radiologist | Prescreen, exam status chain (Completed → Read Assigned), TECH vs RAD components |
| 5 · Reading Room & QC | Reading Room | Know that the signed report arrives before the images, then pass or hold three studies in the QC queue (wrong body part, wrong DOB) | QC Exams queue, image viewer (verify only, never read) |
| 6 · Billing & Liens | Billing | Split CPT 72148 into TECH and RAD bills, send the TECH bill first (DRAFT → SENT), route PSL/ASL liens to patient and attorney, reach the attorney by email/fax, and decide whether to buy the radiologist's lien | CPT pricing per component, bills, liens, lien sale + assignment notice |
| 7 · The Negotiation | Law Firm | A two-way bill-offer duel with the attorney: hold, counter, meet halfway or approve before her patience runs out | Bill offers: SENT → COUNTERED → APPROVED |
| 8 · Settlement | Law Firm | Split the cheque across TECH and RAD in proportion, refuse a single cheque for two owners, issue the **Release of Lien** | Receive payments, allocation, Release of Lien |

Three meters track how you do: **Patient Trust**, **Compliance** and **Recovery**. After each step, an "In MediFlow, this is…" card names the real screen. The game ends on a settlement statement (billed, reduction, collected, lien released) with a grade from S to D.

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
│   ├── engine/core.js    # renderer, bloom, input (keys + touch), synth audio, characters, particles
│   ├── engine/models.js  # loads and clones the Kenney GLB models
│   ├── engine/music.js   # generated background music
│   ├── world/campus.js   # the 3D campus: rooms, furniture, gates, NPCs, collisions
│   ├── ui/ui.js          # dialog, mini-game modal, meters, phone, MediFlow cards
│   ├── chapters/         # frontDesk.js, mri.js (one module per chapter)
│   ├── data/case.js      # Maya's fictional case, prescreen, metal items
│   ├── rush.js           # Rush mode game
│   ├── story.css         # Story mode UI
│   └── style.css         # Rush mode UI
├── public/seed.json      # Rush mode data: made-up patients, documents, CPT codes
├── public/models/        # Kenney CC0 GLB models (characters, cars, furniture, nature)
├── vite.config.js        # two-page build (story + rush)
├── .github/workflows/
│   └── deploy.yml        # builds and publishes to GitHub Pages on every push to main
├── PLAN.md               # the full design and build order
├── ABOUT.md              # what it is, why, features, what's next
└── CLAUDE.md             # setup notes for Claude Code
```

## Tech

- **Three.js** for the 3D campus, lighting with bloom, cutscene and particles
- **Kenney** CC0 models (Mini Characters, Furniture Kit, Car Kit, Nature Kit) for the animated characters, props, trees and cars, in `public/models/` ([kenney.nl](https://kenney.nl), license in `public/models/LICENSE-kenney.txt`)
- **Vite** for the dev server and the two-page build
- **Web Audio API** for generated music and sound effects (no audio files)
- **Google Fonts** (Fredoka)
- No backend, no accounts, no secrets. `.env.example` is included for completeness.

## Deployment

Every push to `main` runs `.github/workflows/deploy.yml`, which builds the game and publishes it to GitHub Pages.

## More

- [PLAN.md](PLAN.md): the full design, chapter by chapter
- [ABOUT.md](ABOUT.md): purpose, features and roadmap
- [CLAUDE.md](CLAUDE.md): setup notes for Claude Code

## Credits

3D models by [Kenney](https://kenney.nl), CC0 (public domain). Everything else was made for this project.
