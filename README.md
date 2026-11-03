# 🏥 Claim Rush

> A 3D clinic arcade game. Get every patient from **intake → exam → claim → lien** before the clock runs out.

**Code Clash 48** entry by Zain · Built with Vite + Three.js · All patient data is made up (no PHI)

**Play online:** https://zain-pathora.github.io/claim-rush/

---

## How to play

You are the clinic coordinator. Patients arrive in the waiting room. Pick one up and walk them to each desk in order.

| Station | What you do | Mistake = denial |
|---|---|---|
| 📋 **Intake** | Spot the document missing from the chart | Missing document |
| 🩺 **Exam** | Chart the service the doctor performed | Chart mismatch |
| 💳 **Claim** | Pick the right CPT code for that service | Wrong CPT code |
| ⚖️ **Lien** | File with the attorney on the Letter of Protection | Wrong attorney |

- Each patient has a **patience bar**. If it runs out, they walk out and you get a denial.
- **Three denials** end your shift. So does running out of time before you hit the level quota.
- Finish patients back to back for **combo** bonuses. Each level adds patients, speed and time pressure.

### Controls

| Key | Action |
|---|---|
| `W A S D` / arrow keys | Move |
| `E` / `Space` | Pick up a patient / check in at a desk |
| `1` `2` `3` | Answer the desk question (or click) |

---

## Run it locally

**Requirements:** Node.js 20+ (works on macOS, Windows, Linux)

```bash
git clone https://github.com/zain-pathora/claim-rush.git
cd claim-rush
npm install && npm run dev
```

Open **http://localhost:5173**

### Other commands

```bash
npm run build     # production build into dist/
npm run preview   # serve the build at http://localhost:5173
```

---

## Project structure

```
claim-rush/
├── index.html            # page shell: HUD, prompts, title screen
├── src/
│   ├── main.js           # Three.js scene, characters, game loop, scoring, effects, sound
│   └── style.css         # UI styling and animations
├── public/
│   └── seed.json         # made-up patients, documents, exams + CPT codes, attorneys
├── vite.config.js
├── .github/workflows/
│   └── deploy.yml        # builds and publishes to GitHub Pages on every push to main
├── ABOUT.md              # what it is, why, features, what's next
└── CLAUDE.md             # setup notes for Claude Code
```

## Tech

- **Three.js** for the 3D clinic, characters, lighting and particles
- **Vite** for the dev server and build
- **Web Audio API** for synthesized sound effects (no audio files)
- **Google Fonts** (Fredoka)
- No backend, no accounts, no secrets. `.env.example` is included for completeness.

## Deployment

Every push to `main` runs `.github/workflows/deploy.yml`, which builds the game and publishes it to GitHub Pages.

## More

- [ABOUT.md](ABOUT.md): purpose, features and roadmap
- [CLAUDE.md](CLAUDE.md): setup notes for Claude Code
