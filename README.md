# AgeWell

AgeWell is a synthetic, AI-assisted seven-day post-discharge monitoring demo. It turns a discharge summary into a patient-specific care plan, compares daily observations with that plan, explains contextual risk, routes cases to the appropriate human reviewer, and checks whether an intervention was actually resolved. It is designed to demonstrate the closed loop from hospital discharge to home monitoring to follow-up review—not to provide medical care.

> **Synthetic data only — not real patients.** AgeWell is a nonmedical demo. Do not use it for diagnosis, treatment, medication decisions, or real patient care.

## Run locally

Use **Node.js 24** and **pnpm 10**. This is a pnpm monorepo; run commands from the repository root. No database or API key is needed for the synthetic demo.

```bash
pnpm install
```

Start the backend in one terminal (macOS/Linux or Windows WSL):

```bash
PORT=8080 pnpm --filter @workspace/api-server run dev
```

Start the frontend in a second terminal:

```bash
PORT=5173 BASE_PATH=/ LOCAL_API_URL=http://127.0.0.1:8080 pnpm --filter @workspace/agewell run dev
```

Open **http://localhost:5173**. The local Vite proxy forwards `/api` to the backend. Keep both terminals running. These commands set non-secret runtime configuration; never commit API keys.

### Contributing and verification

```bash
pnpm --filter @workspace/agewell run typecheck
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/api-server test
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/agewell run build
pnpm --filter @workspace/api-server run build
```

- Frontend/screens: `artifacts/agewell/src/pages/`
- Demo state, safety rules, and assessments: `artifacts/api-server/src/lib/`
- API routes: `artifacts/api-server/src/routes/`
- Synthetic fixtures: `artifacts/api-server/server/data/`
- API contract: `lib/api-spec/openapi.yaml`
- Generated hooks and validation: `lib/api-client-react/` and `lib/api-zod/`

After changing the API contract, run `pnpm --filter @workspace/api-spec run codegen`; commit regenerated files together with the contract. Do not manually edit generated files.

Create a feature branch, keep changes focused, run the checks above, and describe the user-visible change and verification in your PR. Never add real patient data, credentials, dependency folders, or build output.

### Investor walkthrough

1. Start at the Command Center: 100 synthetic patients, with 72 green / 19 yellow / 7 orange / 2 red.
2. Use **New Intake**, load the sample, extract and review the care plan, then confirm monitoring.
3. Use **Load Margaret** for the seeded seven-day story. It resets the shared demo, including newly added intakes.
4. Advance through days 1–4 (green), day 5 (yellow), and days 6–7 (orange).
5. Switch between Clinician, Elder, and Family; selection follows the same patient.
6. Inspect day-7 medication mismatch evidence and the pharmacist-routed case. Acknowledge and act; acknowledgement alone does not resolve it.
7. Document the expected state using the clinician control, inspect the retained resolution timeline, and open the printable report.
8. **Reset demo** restores the opening cohort.

### Demo boundaries

State is in memory and shared across visitors. Restarting the API or using Load/Reset removes intake records and progress. There are no user accounts, real notifications, connected medical devices, or production clinical workflows. A RED screen offers a human-pressed emergency telephone link; the app never calls automatically. Cached mode supports the provided intake sample, not arbitrary discharge documents. Use synthetic data only.

In Replit, use the managed workflows/artifacts:

- **API Server** — `artifacts/api-server`
- **AgeWell** — `artifacts/agewell` (web app)

The API expects the workflow to provide `PORT`. The web workflow serves the Vite client; the API is mounted under `/api`.

## AI configuration and demo safety

AgeWell works without credentials. `ANTHROPIC_API_KEY` is optional: when it is absent, or a request fails, times out, or returns unusable data, the app uses its deterministic cached assessment results. No credentials are required to run the demo.

The AI is constrained to **flag, never advise**: it describes observations and identifies who should review them. It must not prescribe, diagnose, or tell anyone to start, stop, change, or adjust a medication. The app does not place emergency calls or send real outbound notifications. A red result instructs a human to call 911; it never claims to dial 911 itself.

There is no database. State is held in a shared server-side in-memory store. A server restart or demo reset clears changes and restores the seeded state. Because the state is server-side, teammates using the same running Replit app see the same state and can affect one another's demo.

## Demo journey

Use the persona switcher and demo controls to walk through the canonical Margaret Ellis scenario:

1. Open intake and load **Margaret's discharge summary**.
2. Confirm the extracted plan and start seven-day monitoring.
3. Advance to **day 5**: a contextual warning appears even though no single measurement is extreme.
4. Continue to **day 7**: a medication discrepancy routes the case to the pharmacist.
5. Advance the case to **ACTED**; the resolution check shows it as acted but unresolved.
6. Add/document the review and advance the case when the underlying signal or documented expectation supports resolution.
7. Open the **7-day recovery report**.

The app is intended to make the progression visible across Elder, Family, and Clinician views. All patients and readings are fictional.

## Repository map

The layout is intentionally approximate while the demo is being built:

```text
artifacts/
  api-server/
    src/
      index.ts             # HTTP entry point and PORT handling
      app.ts               # Express app and /api mount
      routes/              # API routes
      lib/                 # server utilities and logging
  agewell/
    src/
      App.tsx              # web application/router entry
      components/          # shared UI and error boundary
      pages/               # routed pages
      hooks/               # client hooks
      lib/                 # client utilities
    public/                # static web assets
  mockup-sandbox/          # design/mockup artifact
attached_assets/            # source brief and other supplied assets
package.json                # root scripts and workspace metadata
pnpm-workspace.yaml         # workspace configuration
```

The API's runtime data is deliberately in memory; there is no database setup or migration step. Keep synthetic seed/fallback data and any future engine modules close to the API artifact as those pieces are added.

## Scope

AgeWell is a stageable product demonstration of contextual monitoring and closed-loop case handling. It does not connect to real medical devices, patients, emergency services, pharmacies, clinicians, or notification providers. Do not add real credentials or real patient information to this repository.