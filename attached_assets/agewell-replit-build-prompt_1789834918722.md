# AgeWell — Replit Build Prompt

**How to use this file**

- **PROMPT 1** is the big one. Paste it whole into Replit Agent. It builds the entire app.
- **PROMPTS 2–6** are follow-ups. Paste them one at a time, after Prompt 1 finishes, in order.
- **PROMPT 7** is the GitHub push. Run it as soon as Prompt 1 completes — don't wait for the rest.
- Teammates pulling from GitHub run **PROMPT 8** in their own Repl.

Prompt 1 is written so that if you stop after it, you still have a complete, demoable product.

---

# PROMPT 1 — Full build (paste this first)

```
Build a complete, working web application called AgeWell.

=== WHAT IT IS ===

AgeWell is an AI-powered 7-day post-discharge monitoring platform for older adults.
When a patient leaves the hospital, AgeWell reads their discharge summary, turns it into
a structured care plan, and uses that plan as ground truth for the next seven days.
Each day it compares what is actually happening at home against what THAT patient's
discharge plan predicted, assigns a risk level, explains its reasoning in writing,
routes the case to the right human, and then verifies the case was actually resolved.

The core product insight: this is NOT a threshold monitor. Two patients can have the
same blood pressure reading and be at completely different risk. 150/90 is unremarkable
for a patient whose baseline is 145/88. For a patient discharged at 118/72 three days ago
with a beta-blocker dose change who is now reporting dizziness, the same number is a case.
Context is the product.

=== THREE NON-NEGOTIABLE SAFETY RULES (build these into the code, not just the copy) ===

1. FLAG, NEVER ADVISE. The AI describes what it observed and names who should review it.
   It never gives a dose, never names a treatment, never tells a patient to change,
   stop, start or adjust a medication. Enforce this in the system prompt AND with a
   post-processing check that rejects any AI output containing dosing language.

2. THE AI NEVER CONTACTS EMERGENCY SERVICES. On a RED level, the UI instructs the
   patient/caregiver to call 911 and notifies the care team. The app must never claim
   to dial 911 itself. Label the button "Call 911" as a tel: link the human presses.

3. SYNTHETIC DATA ONLY. Every patient in this app is fictional. Put a persistent,
   visible "SYNTHETIC DATA — NOT REAL PATIENTS" badge in the app header on every screen.

=== TECH STACK ===

- Node.js + Express backend
- React + Vite frontend (JavaScript is fine, TypeScript optional)
- NO DATABASE. All state lives in a server-side in-memory store, seeded at boot from a
  JSON file at /server/data/seed.json. A "Reset demo" endpoint restores the seed.
- Charts: use a lightweight charting approach (Recharts, or hand-rolled SVG). No heavy deps.
- LLM: Anthropic Claude via the ANTHROPIC_API_KEY environment variable.
  Use model "claude-sonnet-4-5" (or the newest available Sonnet).

CRITICAL — DEMO SAFETY: The app MUST work fully with no API key present.
Implement a MOCK MODE: if ANTHROPIC_API_KEY is missing, or an API call fails, times out,
or returns malformed JSON, fall back to a deterministic pre-computed result loaded from
/server/data/fallback-assessments.json. Log which mode was used. Show a tiny "AI: live"
or "AI: cached" indicator in the corner of the clinician dashboard. The demo must NEVER
break on stage because of a missing key, a rate limit, or a network hiccup.

=== DATA MODEL ===

CarePlan (produced once, at intake — this is ground truth):
{
  patient: { id, name, age, lives_alone },
  caregiver: { name, relation, phone, distance_miles },
  admission_reason,
  discharge_diagnoses: [string],
  chronic_conditions: [string],
  primary_condition: "CHF" | "DIABETES" | "COPD" | "POST_OP" | "HYPERTENSION",
  medications: [{ name, dose, frequency, time_of_day, changed_at_discharge, previous_dose }],
  discharge_baseline: { bp_systolic, bp_diastolic, heart_rate, weight_lb, spo2, temp_f, glucose },
  monitoring_instructions: [{ what, frequency, threshold_text }],
  red_flag_symptoms: [string],
  follow_up: [{ provider, specialty, due_date }],
  diet_activity_restrictions: [string]
}

DayLog (one per patient per day):
{ day, date, bp_systolic, bp_diastolic, heart_rate, weight_lb, spo2, temp_f, glucose,
  meds_taken: [{ med_name, taken: bool, time }],
  med_verification: { checked: bool, label_dose, expected_dose, mismatch: bool },
  symptoms: [string], sleep_hours, activity_steps, free_text_note }

Assessment (produced per day by the risk engine):
{ day, level: "GREEN"|"YELLOW"|"ORANGE"|"RED", headline, rationale: [string],
  deviation_from_plan, who_should_act, recommended_action, confidence,
  triggered_hard_rules: [string], ai_mode: "live"|"cached" }

Case (opened when level >= YELLOW):
{ id, patient_id, day, level, headline, who_should_act,
  state: "DETECTED"|"NOTIFIED"|"ACKNOWLEDGED"|"ACTED"|"RESOLVED",
  events: [{ timestamp, state, actor, note }],
  resolution_check: { status, reason, next_check_hours } }

=== CONDITION-SPECIFIC MONITORING PROTOCOLS ===

Different conditions activate different monitoring sets. Build this as a config map
so the elder app only asks for what that patient's condition requires:

CHF:          weight (daily, primary), BP, HR, SpO2, ankle swelling, breathlessness
DIABETES:     glucose (primary), medication timing, meals, activity, BP
COPD:         SpO2 (primary), breathlessness, sputum change, HR, activity tolerance
POST_OP:      pain score, temperature (infection), wound check, mobility milestones, HR
HYPERTENSION: BP twice daily (primary), HR, dizziness, medication adherence

Show the active protocol by name on the clinician patient-detail view, e.g.
"Monitoring protocol: CHF — daily weight, BP, HR, SpO2".

=== LAYER 1: DETERMINISTIC SAFETY RULES (plain JavaScript, runs BEFORE the LLM) ===

const HARD_RULES = [
  { id:"HR_SBP_CRIT_HIGH", level:"RED",    when: v => v.bp_systolic >= 180,
    msg:"Systolic BP at or above 180 — hypertensive crisis threshold." },
  { id:"HR_SBP_CRIT_LOW",  level:"RED",    when: v => v.bp_systolic <= 90,
    msg:"Systolic BP at or below 90 — hypotension threshold." },
  { id:"HR_HR_CRIT",       level:"RED",    when: v => v.heart_rate >= 130 || v.heart_rate <= 45,
    msg:"Heart rate outside safe range." },
  { id:"HR_SPO2_CRIT",     level:"RED",    when: v => v.spo2 != null && v.spo2 < 88,
    msg:"Oxygen saturation below 88%." },
  { id:"HR_TEMP_FEVER",    level:"ORANGE", when: v => v.temp_f >= 100.4,
    msg:"Fever at or above 100.4F — possible infection." },
  { id:"HR_CHF_WEIGHT_1D", level:"ORANGE", when:(v,ctx)=> ctx.primary==="CHF" && ctx.prev && (v.weight_lb-ctx.prev.weight_lb)>=3,
    msg:"Weight up 3+ lb in 24 hours — discharge instruction threshold met." },
  { id:"HR_CHF_WEIGHT_7D", level:"ORANGE", when:(v,ctx)=> ctx.primary==="CHF" && (v.weight_lb-ctx.baseline.weight_lb)>=5,
    msg:"Weight up 5+ lb from discharge baseline — discharge instruction threshold met." },
  { id:"HR_GLUCOSE_CRIT",  level:"RED",    when: v => v.glucose != null && (v.glucose < 60 || v.glucose > 400),
    msg:"Blood glucose outside safe range." },
  { id:"HR_RED_FLAG_SX",   level:"RED",
    when: v => v.symptoms.some(s => ["chest pain","shortness of breath at rest","fainting","confusion","severe bleeding"].includes(s)),
    msg:"Patient reported a discharge red-flag symptom." },
  { id:"HR_MED_MISMATCH",  level:"ORANGE", when: v => v.med_verification?.mismatch === true,
    msg:"Medication on hand does not match discharge list — pharmacist review required." },
  { id:"HR_MED_MISSED_2",  level:"YELLOW", when:(v,ctx)=> ctx.missed_doses_48h >= 2,
    msg:"Two or more doses missed in 48 hours." }
];

FINAL LEVEL = max(layer1_level, layer2_level).
The LLM may RAISE a level. The LLM may NEVER lower one. Enforce this in code.

=== LAYER 2: LLM PROMPTS ===

-- PROMPT A: discharge summary -> CarePlan (run once at intake) --
System: "You are a clinical document parser. Extract structured data from the hospital
discharge summary. Output ONLY valid JSON matching the provided schema. Do not add
clinical advice. Do not infer facts not written in the document. If a field is absent,
use null. Never guess a dose."
User: the schema + the raw discharge text.

-- PROMPT B: daily contextual risk assessment --
System:
"You are AgeWell's post-discharge risk engine. You assess whether a patient's recovery
is deviating from what their own discharge plan predicted.

HARD CONSTRAINTS — violating any of these is a failure:
1. You NEVER give medical advice, dosing instructions, or a diagnosis.
2. You NEVER tell a patient to change, stop, start or adjust a medication.
3. You describe what you observed and who should review it. Nothing more.
4. You may RAISE the risk level set by the deterministic rules. You may NEVER lower it.
5. Every claim in your rationale must cite a specific value from the data provided or
   quote a specific discharge instruction. No claim without a number or a quotation.

RISK LEVELS:
GREEN  - tracking as expected for this patient. No action.
YELLOW - early deviation. Patient self-care prompt, extra monitoring, notify caregiver.
ORANGE - pattern of concern across multiple signals. Pharmacist or nurse review within 24h.
RED    - emergency escalation condition met. Instruct patient/caregiver to call 911 and
         notify the care team. You do NOT contact emergency services yourself.

CONSIDER: deviation from THIS patient's discharge baseline rather than population norms;
direction and slope of the trend across days; whether a medication changed at discharge;
whether reported symptoms corroborate the vitals; whether the patient lives alone;
medication adherence; sleep and activity change. A reading that is normal for the
population may be abnormal for this patient, and vice versa."

User message contains: the CarePlan JSON, all prior days, today's DayLog, and the list
of hard rules already triggered.

Output ONLY this JSON:
{ "level":"GREEN|YELLOW|ORANGE|RED",
  "headline":"one sentence under 15 words, plain English",
  "rationale":["one observation per line, each citing a number or quoting an instruction"],
  "deviation_from_plan":"what the plan expected vs what is happening, or null",
  "who_should_act":"patient|caregiver|pharmacist|nurse|physician|emergency",
  "recommended_action":"what that person should do — never what drug to take",
  "confidence":"high|medium|low" }

-- PROMPT C: closed-loop resolution check --
"A care gap was opened for this patient. Determine whether it is actually resolved.
A case is RESOLVED only if BOTH are true:
 (a) a human in the correct role acknowledged and acted, AND
 (b) the underlying signal has returned toward the patient's discharge baseline, OR a
     clinician explicitly documented that the new state is expected.
Acknowledgement alone is NOT resolution.
Output: {"status":"OPEN|ACTED_UNRESOLVED|RESOLVED","reason":str,"next_check_hours":int}"

-- PROMPT D: daily summary, two versions from one call --
Produce BOTH:
  patient_summary: warm, plain language, 6th-grade reading level, no clinical jargon,
    no numbers the patient has to interpret. Example tone: "Good news, Margaret — your
    medications are on track today. We've asked your care team to check one thing."
  clinical_summary: dense, factual, cites values and trends, written for a nurse.

=== SCREENS TO BUILD (three personas, one app) ===

Use a persona switcher in the top bar: [ Elder ] [ Family ] [ Clinician ]
so the demo can move between views in one click.

--- SCREEN 1: INTAKE (clinician or family) ---
- Large textarea: "Paste the discharge summary"
- "Upload a file" option (.txt/.pdf — text extraction is enough)
- A "Load Margaret's discharge summary" button that fills the textarea with the seed text
- On submit: call Prompt A, show a loading state, then render the extracted CarePlan in a
  clean review panel — medications (highlight any with changed_at_discharge = true in amber),
  baseline vitals, monitoring instructions, red-flag symptoms, follow-up appointments.
- "Confirm and start 7-day monitoring" button.
THIS IS THE OPENING OF THE DEMO. Make the extraction render feel impressive and legible.

--- SCREEN 2: ELDER APP (designed for a 78-year-old) ---
Design rules, follow them strictly:
- Minimum body font size 20px, headings 30px+
- Very high contrast, large tap targets (minimum 60px tall buttons)
- One task visible at a time, minimal navigation, no graphs, no clinical numbers to interpret
- Plain warm language, no jargon
Contents:
  "Good morning, Margaret" + today's date + "Day 5 of 7"
  TODAY'S MEDICATIONS — one row per med, big [ TAKEN ] button each, checkmark when done
  A "Check my medicine bottle" flow: shows the expected medication name and dose, asks
    "What does your bottle say?" with a large text input or dose dropdown. If it does not
    match, do NOT tell the patient what to do — show: "Thank you. We've asked your
    pharmacist to check this for you." and open a case.
  TODAY'S READINGS — large numeric inputs only for the fields this patient's condition
    protocol requires
  HOW ARE YOU FEELING — large symptom buttons (tired, dizzy, short of breath, swelling
    in ankles, chest pain, no problems today) with icons
  YOUR RECOVERY TODAY — one big status card: green "On track" / amber "We're keeping an
    eye on something" / orange "Your care team has been notified" / red "Please call 911 now"
  The patient-facing daily summary in plain language at the bottom.

--- SCREEN 3: FAMILY VIEW (the adult child, 400 miles away) ---
- "Mom — Day 5 of 7" with the 7-day status strip (7 colored dots, one per day)
- Trend charts: weight, BP, HR, SpO2 — each with the discharge baseline drawn as a
  dashed reference line so deviation is visually obvious
- Medication adherence bar for the week
- Open cases with their current state and who is handling it
- Plain-language daily summary
- A "What changed today" line at the top — the single most important thing

--- SCREEN 4: CLINICIAN COMMAND CENTER (the money screen) ---
Top row of four counts, big and scannable:
   72 STABLE   19 MONITOR   7 REVIEW   2 URGENT
Below: a patient list sorted RED first, then ORANGE, then YELLOW, then GREEN.
Each row: name, age, primary diagnosis, day N of 7, a colored severity stripe on the left
edge, the one-line AI headline, and who should act.
A prominent line above the list: "AgeWell doesn't give you more data. It tells you who
needs you now, and why."

--- SCREEN 5: PATIENT DETAIL (click any row) ---
- Header: name, age, day N of 7, current level as a large colored pill
- "AI REASON FOR ESCALATION" panel — the most important element on the screen.
  Render each rationale line as a separate bulleted statement. Show deviation_from_plan
  in its own callout. Show which hard rules fired as small monospace chips.
- Trend charts with the discharge baseline as a dashed line
- Medication adherence table, flagging any dose that changed at discharge
- Reported symptoms timeline across the 7 days
- The CLOSED-LOOP CASE TRACKER (build this well — it is the differentiator):
  a vertical timeline with states DETECTED -> NOTIFIED -> ACKNOWLEDGED -> ACTED -> RESOLVED,
  each with a timestamp and actor. Buttons to advance the state so it can be driven live
  on stage. When a case reaches ACTED, run Prompt C and display the verdict. If the
  verdict is ACTED_UNRESOLVED, show it in amber with "Acknowledged is not resolved —
  auto-recheck scheduled in N hours."

--- SCREEN 6: 7-DAY RECOVERY REPORT ---
A clean, printable report generated at day 7:
  Days monitored, medication adherence %, count of yellow/orange/red events,
  number of human interventions, trend direction per vital, symptom log,
  cases opened and how each resolved, follow-up appointment status,
  an AI-written overall recovery trajectory paragraph.
Include a "Print / Save as PDF" button using CSS @media print. This report is the artifact
that goes back to the follow-up clinician — it closes the loop from hospital to home to
follow-up.

=== DEMO CONTROL BAR (fixed, bottom of screen, collapsible) ===
- "Load Margaret" — resets to Margaret, day 1
- "Advance one day" — steps the day forward and runs the risk engine on the new day
- "Jump to day 7" — the escalation moment
- "Reset demo"
- A tiny AI mode indicator: "AI: live" or "AI: cached"
This bar must be quick and reliable. It drives the entire stage demo.

=== SEED DATA — create /server/data/seed.json with exactly this ===

PATIENT 1 (the demo patient):
Margaret Ellis, 78, female, lives alone. Daughter Dana Ellis, 430 miles away.
Discharged 2026-09-12. primary_condition: CHF.

discharge_summary_raw (use this exact text for the "Load Margaret" button):
"MERCY GENERAL HOSPITAL - DISCHARGE SUMMARY
Patient: Margaret Ellis   DOB: 03/11/1948   Age 78
Admitted: 09/09/2026   Discharged: 09/12/2026

ADMISSION REASON: Acute decompensated heart failure with volume overload.

DISCHARGE DIAGNOSES: Heart failure with reduced ejection fraction (HFrEF, EF 38%);
essential hypertension; type 2 diabetes mellitus; stage 3a chronic kidney disease.

HOSPITAL COURSE: Patient presented with 4 days of progressive dyspnea and 8 lb weight
gain. Diuresed with IV furosemide with good response. Beta blocker uptitrated prior to
discharge. Ambulating independently at discharge.

DISCHARGE MEDICATIONS:
  1. Metoprolol succinate 25 mg PO once daily - DOSE CHANGED (previously 12.5 mg daily)
  2. Furosemide 40 mg PO once daily - NEW
  3. Lisinopril 10 mg PO once daily - unchanged
  4. Metformin 500 mg PO twice daily - unchanged
  5. Atorvastatin 20 mg PO nightly - unchanged

DISCHARGE VITALS: BP 118/72, HR 68, SpO2 96% on room air, Temp 98.2F, Weight 154.2 lb.

MONITORING INSTRUCTIONS:
  - Weigh yourself every morning before breakfast, same scale, after using the bathroom.
  - Check blood pressure twice daily, morning and evening.
  - Low sodium diet, under 2 g daily. Fluid restriction 1.5 L daily.

CALL YOUR DOCTOR IMMEDIATELY IF YOU HAVE: weight gain of 3 lb in one day or 5 lb in one
week; increased shortness of breath or difficulty breathing lying flat; new or worsening
swelling in legs or ankles; dizziness or lightheadedness; chest pain; fainting.

FOLLOW-UP: Cardiology, Dr. Alan Reyes, 09/19/2026. Primary care, Dr. Priya Nair, 09/26/2026."

Margaret's 7 days (day, bp_sys/bp_dia, HR, weight_lb, SpO2, temp_f, symptoms, note):
 1 | 120/74 | 70 | 154.0 | 96 | 98.1 | none | "Feeling alright. Slept okay." | meds all taken
 2 | 118/72 | 69 | 154.3 | 97 | 98.3 | none | "Went to the mailbox and back." | meds all taken
 3 | 122/75 | 71 | 154.1 | 96 | 98.0 | none | "Good day." | meds all taken
 4 | 119/73 | 72 | 154.6 | 96 | 98.2 | none | "A little tired but fine." | meds all taken
 5 | 124/76 | 78 | 155.9 | 95 | 98.4 | [mild fatigue] | "Feet felt a bit puffy in my shoes." | meds all taken
 6 | 131/80 | 84 | 156.8 | 94 | 98.3 | [mild fatigue, ankle swelling, dizziness on standing] | "Got lightheaded getting up from the chair. Didn't go down for the mail today." | meds all taken
 7 | 138/84 | 91 | 157.8 | 93 | 98.5 | [fatigue, ankle swelling, dizziness on standing, short of breath climbing stairs] | "I think I already took the blue one this morning. Stairs were harder than usual." | meds all taken, AND med_verification: { checked:true, label_dose:"50 mg", expected_dose:"25 mg", mismatch:true }

Expected engine behavior: days 1-4 GREEN, day 5 YELLOW, day 6 YELLOW or ORANGE,
day 7 ORANGE with who_should_act = "pharmacist".
Day 5 is the teaching moment: no single value is abnormal, but weight is up 1.7 lb in
24 hours with HR climbing and new puffiness. A threshold monitor sees nothing on day 5.

OTHER COHORT PATIENTS (for the dashboard — each needs a plausible 7-day series):
- Robert Vance, 81, COPD exacerbation, day 4, GREEN — "Recovering as expected. SpO2 stable at 94-95%."
- Alice Moreau, 74, cellulitis + T2DM, day 3, YELLOW — "Two missed antibiotic doses logged; glucose trending up." who: caregiver
- James Okonkwo, 69, total hip arthroplasty, day 6, GREEN — "Mobility milestones on track. No red flags."
- Susan Park, 86, community-acquired pneumonia, day 2, RED — "SpO2 87% with new confusion — urgent evaluation required." who: emergency
- Then generate 95 additional synthetic patients programmatically with random plausible
  names, ages 65-92, one of the five conditions, and levels distributed so the dashboard
  totals read exactly: 72 GREEN, 19 YELLOW, 7 ORANGE, 2 RED.

=== VISUAL DESIGN ===
Clinical and calm, not consumer-flashy. Off-white or soft slate ground, deep navy ink,
one restrained accent colour for interactive elements. The severity ramp (green / amber /
orange / red) is SEMANTIC and must be visually distinct from the accent colour — never
use red or orange as a general UI accent. Support light and dark mode. Tabular figures
for all numbers. The elder app uses the same palette but a much larger type scale.

=== BUILD ORDER (important — build in this sequence) ===
1. Express server, in-memory store, seed loading, and all API routes returning real data
2. Layer 1 hard rules + Layer 2 LLM calls + the mock-mode fallback
3. Clinician command center and patient detail (the demo core)
4. Closed-loop case tracker
5. Intake screen
6. Elder app
7. Family view
8. 7-day report
9. Demo control bar
Get 1-4 fully working before moving on. If anything fails, keep 1-4 working.

Build it now. Make it actually run.
```

---

# PROMPT 2 — Harden the demo (run right after Prompt 1)

```
Now harden this for a live stage demo. Do all of the following:

1. Verify the app works end to end with ANTHROPIC_API_KEY deleted. Every screen must
   still render and every risk assessment must still appear, served from the cached
   fallback file. Pre-compute and store a fallback assessment for all 7 of Margaret's
   days and for all five named cohort patients.

2. Add a 6-second timeout to every LLM call. On timeout, fall back to cached immediately.
   Never let the UI show a spinner for more than 6 seconds.

3. Add the "flag, never advise" output guard: a function that scans AI output for dosing
   patterns (a number followed by mg/mcg/ml/units, or the words "take", "increase",
   "decrease", "stop taking", "double the") and, if found, replaces the recommended_action
   with the safe default for that level and logs a warning.

4. Make the persona switcher and the demo control bar keyboard-accessible, and add
   keyboard shortcuts: 1 = Elder, 2 = Family, 3 = Clinician, right-arrow = advance day.

5. Add an error boundary so that no single failing component can white-screen the app.

6. Make sure the whole app is usable at phone width — a judge may look at it on a phone.
```

---

# PROMPT 3 — The competitive answer, built in

```
Add a "Connected devices" panel to the clinician patient-detail view.

It lists the data sources feeding this patient's monitoring, each with a status dot and
the last reading time:
  - Blood pressure cuff (Omron) — simulated
  - Digital scale (Withings) — simulated
  - Pulse oximeter — simulated
  - Smartwatch (Apple Watch / Fitbit) — simulated
  - Adhesive biosensor patch — simulated
  - Patient self-report — active
  - Hospital discharge summary — active

Above the list, put this line: "AgeWell is hardware-agnostic. We do not make sensors.
We make the layer that turns any of them into a decision."

Make the panel visually real — status dots, last-sync timestamps, a small "+ Add device"
button that opens a modal listing supported device categories. This panel exists to answer
a specific judge question about hardware competitors, so it needs to look deliberate.
```

---

# PROMPT 4 — The reimbursement layer (this is the business model, built into the product)

```
Add a "Billing readiness" section to the 7-day recovery report, and a small badge on the
clinician patient row.

Background: Medicare's Transitional Care Management codes (CPT 99495 and 99496) pay a
per-patient fee for the post-discharge period. They require:
  - interactive contact with the patient or caregiver within 2 business days of discharge
  - medication reconciliation performed within days 1-7 post-discharge
  - a face-to-face visit within 14 days (99495) or 7 days (99496)
The most common reasons these claims get denied are missing documentation of the
interactive contact and missing documentation of the medication reconciliation.

AgeWell automatically generates and timestamps exactly that documentation. Build it:

For each patient, track and display:
  [x] Interactive contact within 2 business days — timestamp, method, who
  [x] Medication reconciliation days 1-7 — timestamp, what was reconciled, discrepancies found
  [ ] Face-to-face visit scheduled — date, provider, within window yes/no
  -> "TCM documentation: COMPLETE — ready to bill 99495" (or which element is missing)

On the clinician dashboard patient rows, add a small monospace chip: "TCM ✓" when all
required documentation exists, or "TCM ⚠ 1 missing" when it does not.

In the 7-day report, add a "TCM documentation packet" section that lays out each
requirement with its timestamped evidence, formatted so it could be attached to a claim.
```

---

# PROMPT 5 — Seven-day report polish

```
Improve the 7-day recovery report:

1. Add a large visual "recovery trajectory" strip at the top: 7 day-blocks, each colored
   by that day's risk level, with the case markers overlaid.
2. Add small sparkline charts for each monitored vital showing the week's trend, with the
   discharge baseline as a dashed reference line and an emphasized endpoint.
3. Add a "What we caught" section listing each case: what triggered it, who acted, how
   long until acknowledgement, and whether it was verified resolved.
4. Add an "Open questions for the follow-up visit" section generated by the AI from the
   week's unresolved items — phrased as observations and questions for the clinician,
   never as recommendations.
5. Make the print stylesheet genuinely good: page breaks in sensible places, no dark
   backgrounds, header on every page.
```

---

# PROMPT 6 — Final pass

```
Final pass before we demo:

1. Walk the entire Margaret flow yourself and confirm: intake extracts her plan correctly,
   days 1-4 are GREEN, day 5 is YELLOW, day 7 is ORANGE with pharmacist as the actor and
   the medication discrepancy named in the rationale.
2. Confirm the 911 language appears only on RED and only as an instruction to a human.
3. Confirm the "SYNTHETIC DATA" badge is visible on every screen.
4. Remove any placeholder text, lorem ipsum, TODO comments, or dead buttons.
5. Write a README.md explaining what the app is, how to run it, where the env var goes,
   how mock mode works, and how to drive the demo. Include a one-paragraph product
   description at the top.
6. Confirm the app boots cleanly from a fresh clone with no API key.
```

---

# PROMPT 7 — Push to GitHub (run as soon as Prompt 1 finishes)

```
Push this project to GitHub so my teammates can pull it and keep building.

1. Create a .gitignore that excludes node_modules, .env, .replit internals, build output,
   and any local cache.
2. Make sure no API key or secret is committed anywhere. Check the seed files too.
3. Initialize git, commit everything with the message
   "AgeWell: 7-day AI post-discharge monitoring platform — initial build".
4. Create a new PUBLIC GitHub repository named "agewell" under my account and push to it.
5. Print the repository URL clearly when you are done.

If you cannot create the repo yourself, tell me exactly what to click in the Replit
Version Control pane, and prepare everything so that connecting and pushing is one step.
```

**Manual fallback if the agent can't do it:**
Replit sidebar → **Version Control** (branch icon) → **Create a Git repo** → **Connect to GitHub** → authorize → set repo name `agewell`, visibility **Public** → **Create repository and push**. Then send teammates the URL.

---

# PROMPT 8 — For teammates pulling from GitHub

Each teammate: in their own Replit account, **Create Repl → Import from GitHub →** paste the repo URL. Then paste this:

```
This is the AgeWell project, pulled from GitHub. Before changing anything:
1. Install dependencies and get it running.
2. Confirm it boots with no ANTHROPIC_API_KEY (mock mode must work).
3. Tell me which files exist and what each one does.

Then I will give you a specific feature to work on. Do not refactor anything you were
not asked to change, and do not touch files outside the ones I name — other people are
working in this repo at the same time.
```

**File ownership so nobody collides:**

| Owner | Files |
|---|---|
| A (Mehul) | `/server/index.js`, routing, data model, merges |
| B | `/server/engine/*` — hard rules, LLM prompts, fallback |
| C | `/client/screens/Clinician*`, `/client/screens/PatientDetail*` |
| D | `/server/data/*` — seed and fallback JSON |
| E | `README.md`, `/client/screens/Report*` |

Rule: if you need a change in someone else's file, ask them. Do not edit it.
