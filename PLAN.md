# Claim Rush 2.0: Plan

> One accident, one patient, one lien, followed all the way to the release, through the real MediFlow 360 workflow.

Status: **approved 2026-11-03.** Story chapters 0 and 3–8 are built and playable end to end. Chapters 1–2 (Order Intake, Scheduling), Case Files and Kenney models are still to do.

## 1. What changes from v1, and why

v1 treated the game like insurance billing ("denied claim", "insurance card"). MediFlow doesn't work that way. Sources:
`mediflow-360/docs/business/00–15` and Team Hub RAD 08 *Plain-Language Guide*.

- There is **no payer**. The patient is treated **on credit** against a **lien** (an LOP).
- The bill is **negotiated** with the attorney, and the case closes only when the provider issues a **Release of Lien**.
- Imaging splits one MRI into **two components**: **TECH**, billed by the imaging centre, and **RAD**, billed by the radiologist. That means two bills, two liens and possibly two owners.

v2 teaches *that* story. It's what makes the game feel real to Danny and the judges, and it's the "impact" score.

Naming rules, so the game matches how the product talks about itself:
- In the game, the old radiology product is called **MediFlow Imaging**. The name "RadFlow" is retired and must not appear.
- MediFlow is **never** shown as the place a study is read. The radiologist reads in "their own system".
- Every person, firm and clinic is fictional. No StatCare, Precise or other real tenant names.

## 2. The game in one paragraph

**Maya Reyes** (fictional) is rear-ended on the freeway. The player is the clinic's **care coordinator**. You walk a 3D hospital campus through **six chapters**, each a real MediFlow module. You talk to staff, play a mini-task at each workstation, and keep three meters healthy:

- **Patient Trust**: a slow or careless coordinator loses the patient.
- **Compliance**: wrong consent, wrong ID or a skipped prescreen.
- **Recovery $**: how much of the bill you actually collect.

Your final screen is a **settlement statement** showing billed, reduced, collected and released, plus a grade from S to D.

## 3. Chapters (each = a real module)

| # | Chapter / location | Real MediFlow workflow | Mini-game |
|---|---|---|---|
| 0 | **The Accident** (cinematic street scene) | Firm referral (`FIRM_REFERRAL_STATUS` SENT → ACCEPTED) | Short cutscene. An attorney's referral arrives in the **Pulse inbox** |
| 1 | **Order Intake** (back office) | Orders: AI page split, page tags RX / PHOTO_ID / DEMOGRAPHICS / INSURANCE, a person accepts | **Sort the fax**: drag the pages onto the right tag before the shredder takes them. Catch the AI's wrong patient split |
| 2 | **Scheduling / Call Center** | Booking-call outcomes (LEFT_VM, COULDNT_REACH, WILL_CALL_BACK), scheduler, block lease | **Book the scan**: pick a scanner slot on a lease calendar that fits the facility, the time and the patient's needs (claustrophobic → open magnet) |
| 3 | **Front Desk** (lobby, 3D) | Check-in, patient OTP login, intake packet, consent kinds HIPAA_AUTH / TREATMENT_CONSENT / RECORDS_RELEASE, signature DRAWN / TYPED / UPLOAD | Verify the photo ID against the patient. Hand over the right consents. **Draw a signature** with the mouse. Enter the OTP from a phone that pops up in the scene |
| 4 | **Prescreen → MRI Suite** | Prescreen question bank: weight vs. machine limit, claustrophobia, pregnancy → MRI_PREGNANCY_CONSENT, contrast allergy. Exam status chain Ordered → … → Completed | **Safety screen**: spot the red flag before the magnet. Metal objects get pulled toward the bore if you miss them (a physics gag). Then run the scan as a timing mini-game |
| 5 | **Reading Room & QC** | Read Assigned → Signed, the image viewer for verification only, QC gate (`qcEntry`), split TECH / RAD | **Verify the study**: do the name, DOB and body part match the order? A QC fail blocks billing ("Blocked by TECH") |
| 6 | **Billing & Liens** | CPT pricing per component (MEDICAL / TECH / RAD), bill DRAFT → SENT, lien PSL (patient) + ASL (attorney), PENDING → SIGNED | **Build the bill**: pick the CPT codes and the components. Route the lien to the right signer in the right order |
| 7 | **The Law Firm** (attorney office) | Two-way bill offer: SENT → COUNTERED → APPROVED, reductions, assignment notice, optional lien sale to a funding company | **Negotiation duel**: a card-style back and forth with the attorney. Push too hard and the firm stalls; give too much away and you lose Recovery $. Optional: sell the lien for cash now vs. wait |
| 8 | **Settlement** | Payment RECORDED → ALLOCATED, split between components in proportion, Release of Lien, claim PAID / CLOSED | Allocate the cheque across TECH and RAD. Issue the **Release of Lien** and the case closes. Fireworks and the settlement statement |

Every task ends with a one-line **"In MediFlow this is…"** card naming the real screen. That's the teaching layer, and the main point for "impact".

## 4. Modes

- **Story mode**: Maya's case, chapters 0–8, about 12–15 minutes. Best for the demo video.
- **Rush mode**: v1's arcade loop, upgraded. Many patients at once on the same campus, with endless levels and a high score.
- **Case Files**: three short extra cases taken from RAD 08.2:
  - a simple MRI at a centre that reads its own studies,
  - a split case where the radiologist sells their lien,
  - the shoulder arthrogram, where the radiologist only reads part of the procedure.

## 5. Look and feel ("Best Looking" award)

- **Art:** a stylised low-poly campus built from **Kenney.nl CC0 packs** (City Kit, Furniture Kit, Mini Characters). Toon shading, soft shadows, bloom on screens and signs.
- **Camera:** tilted top-down follow camera in buildings, with cinematic cuts between chapters.
- **People:** NPC staff with names and speech bubbles (front desk, MRI tech, radiologist, biller, attorney), plus simple emotes.
- **UI:** glass-card dialogs. A **phone overlay** shows the patient's view (OTP SMS, e-sign link), mirroring the real patient portal.
- **Sound:** howler.js music per chapter, plus the synth sound effects we already have.
- **Accessibility:** keyboard + mouse + gamepad, plus touch controls so it plays on the MacBook and on a phone.

## 6. Technical approach

- **Stack:** Vite + Three.js, plain JS modules, no backend. Saves in localStorage.
- **Structure:**

  ```
  src/
    engine/     renderer, input, camera, audio, scene loader
    world/      campus + room builders, NPCs
    chapters/   one module per chapter: setup, objectives, mini-game
    ui/         HUD, dialog, phone, settlement statement
    data/       cases.json, cpt.json, prescreen.json, all fictional
  ```

- Data-driven chapters, so the extra Case Files are just JSON.
- Dev-only `window.__game` hooks for automated play-through tests. The browser pane freezes animation frames when it's in the background, so tests step the loop by hand.
- Deploys to GitHub Pages on every push (already live).

## 7. Build order (each step is shippable and pushed)

1. **Engine refactor plus the campus shell**: rooms, doors, walking between chapters, NPC dialog system.
2. **Chapters 3 and 4** (Front Desk + MRI). The most visual and most demo-worthy, so they come first.
3. **Chapters 6 and 7** (Billing + Law Firm negotiation). The heart of what makes MediFlow different.
4. Chapters 1, 2 and 5. Then 0 and 8 (intro cinematic and settlement).
5. Kenney models, music, polish, touch controls.
6. Rush mode on the new campus. Case Files.
7. Docs, then the demo video script and recording checklist.

If time runs short, cut from the bottom. Steps 1–3 alone already beat v1.

## 8. Contest rules to keep

- Claude Code only, Opus at low effort (subagents too).
- No PHI: all data is invented.
- No secrets, no paid services, and no hidden text aimed at the AI judge.
- No commits after the buzzer.

## 9. Open questions for Zain

1. **The buzzer date and time.** Scope depends on it: under 2 days means steps 1–3 only.
2. Product names: I read "MediFill / EggRedFill" as **MediFlow** and the **radiology expansion** (formerly RadFlow). Correct?
3. Is it OK to show real enum and status names on screen (e.g. "IN_NEGOTIATION"), or should they be plain-English labels only?
