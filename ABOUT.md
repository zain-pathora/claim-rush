# Claim Rush

**One accident. One patient. One lien. Follow a personal-injury case through MediFlow 360, from the front door to the release.**

## Purpose
A 3D story game that teaches how Pathora's MediFlow 360 runs a personal-injury lien case from end to end, including the radiology expansion where one MRI becomes two bills (TECH and RAD).

## Why
The lien world is hard to explain. Nobody here is an insurance payer. The patient is treated on credit, the bill is negotiated with the attorney for years, and the case only closes when the provider releases its lien. New staff, developers and customers learn this slowly from specs. Claim Rush puts it into something you can do with your hands in fifteen minutes.

## Features
- **Story mode, seven chapters:** the accident, Front Desk, Prescreen & MRI, Reading Room & QC, Billing & Liens, the Law Firm negotiation, and Settlement.
- **Mini-games built from real workflows:**
  - a one-time-code login from a phone overlay
  - catching a wrong date of birth on the referral
  - choosing the intake consents
  - drawing a signature
  - flagging prescreen red flags and choosing the open magnet
  - the metal sweep (miss an item and it flies into the magnet)
  - timing three scan sequences
  - the QC queue
  - splitting the TECH/RAD bill and routing the liens
  - an optional lien purchase
  - a negotiation duel with the attorney
  - splitting the settlement cheque and issuing the Release of Lien
- **"In MediFlow, this is…" cards** after each step, naming the real screen and statuses.
- **Three meters** (Patient Trust, Compliance, Recovery), and a final settlement statement with a grade.
- **A 3D campus:** six rooms, staff characters, gates that unlock as you go, cutscene camera, particles and synth sound.
- **Rush mode:** the original arcade game, for quick replays.
- **Controls:** keyboard, mouse and touch.
- **Data:** everything is made up. No PHI, no real tenants.

## How it's built
- Vite + Three.js in plain JavaScript, with Web Audio for sound and Google Fonts (Fredoka). No backend, no paid services.
- Chapters are async functions that wait for the player to reach an NPC or spot, then run dialogs and DOM mini-games.
- Deployed to GitHub Pages by a GitHub Actions workflow.
- Built with Claude Code.

## What's next
- Chapters for Order Intake (sorting fax pages) and Scheduling (a lease-calendar puzzle).
- Case Files: the radiologist-sells case and the shoulder arthrogram.
- Kenney low-poly models and music.
