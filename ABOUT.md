# Claim Rush

**Get every patient from intake to lien before the clock runs out.**

## Purpose
A 3D arcade game that teaches the MediFlow workflow: a personal-injury patient moves through
intake, exam, claim and lien, and a slip at any step means a denial.

## Why
Billing and front-desk workflows are hard to explain and dull to train. Claim Rush makes the
same steps physical and timed, so new staff learn the order and the common failure points by playing.

## Features
- Low-poly 3D clinic with four stations: Intake, Exam, Claim, Lien
- Carry patients between stations; the next station pulses
- Intake: spot the missing document. Exam: chart the service. Claim: pick the CPT code. Lien: file with the attorney on the LOP
- Wrong answer, wrong order handling or an impatient patient = denial; three denials ends the shift
- Patience bars, combos, levels with rising quota, speed and spawn rate
- Synth sound effects, best score saved locally
- All data is made up and loaded from `public/seed.json`

## How it's built
Vite + Three.js in plain JavaScript, with Web Audio for sound and Google Fonts (Fredoka). No backend, no paid services.
Built with Claude Code.

## What's next
- Touch controls for phones
- Kenney low-poly character and furniture models
- More denial reasons (modifiers, expired authorizations, duplicate claims)
- GitHub Pages build
