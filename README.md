# ORCA — Marine Intelligence demo (frontend + mock backend)

Mobile-first React + Tailwind mockup of ORCA's three workspaces plus a small Express mock
backend, driven by the exact shared JSON response contract from `ORCA_Frontend_Onboarding.md`.

## Repository layout

```
.
├── backend/   — Node + Express mock analysis API (self-contained)
│   ├── controller/analysis.js      — persona validation, then asks the model
│   ├── middleware/requestLogger.js — method, path, status, response time
│   ├── model/analysis.js           — the only layer that touches the mock files
│   ├── route/analysis.js           — path → controller wiring only
│   ├── mocks/                      — frozen sample responses, read from disk
│   ├── server.test.js              — API contract tests (node --test)
│   ├── package.json
│   └── index.js                    — app assembly: CORS, logger, /health, listen
└── frontend/  — Vite + React + Tailwind app (self-contained)
    ├── src/                        — pages, shared components, lib, types, data
    ├── index.html
    ├── package.json
    └── vite.config.ts
```

Each half is self-contained: install and run it from its own folder.

## Quickstart (two terminals)

```bash
cd backend && npm install && npm start     # mock analysis API on :3001
cd frontend && npm install && npm run dev  # app on :5173 — second terminal
```

Checks:

```bash
cd backend && npm test          # API contract tests (node --test)
cd frontend && npm run build    # typecheck (tsc) + production build
cd frontend && npm run lint     # oxlint
```

## Workspaces

- `/` — landing: persona picker, language select, location source
- `/fisherman` — one-location conditions assessment (Kochi coast sample)
- `/authority` — regional risk overview with ranked coastal areas (Ernakulam–Alappuzha sample)
- `/maritime` — route assessment split into segments (Kochi–Lakshadweep sample)

## Rules baked into the UI

- **Vocabulary:** assessments only ever read `favourable`, `caution`, `unfavourable`, or
  `unavailable` (green / amber / red / gray). Data statuses use `live` / `cached` /
  `fallback` / `unavailable`. The forbidden assessment terms never appear in UI copy or code.
- **Unavailable is a first-class state:** every value with `status: "unavailable"` renders a
  clearly marked gray card with the backend's `reason` — nothing is hidden or skipped.
- **Advisory banner:** a persistent, non-dismissible banner appears on every screen:
  "Follow current official INCOIS, IMD, and port-authority advisories before departure."
- **"Show reasoning"** collapsible panel on every workspace, driven by `explainability.findings`.
- **Placeholder chart:** `MarineMap` renders `map.layers`, their features, viewport, and legend
  schematically — no geographic rendering yet (a deliberate scope cut).

## Shared components

`MarineMap`, `SourcesPanel`, `ReasoningPanel`, `HazardList`, `AssessmentDetail`, `VerdictHero`,
`OfficialAdvisoryBanner`, and the status badges in `frontend/src/components/shared/` are used by
all three workspaces — workspace pages only add their persona-specific cards.

## Data source

`frontend/src/data/*.json` are byte-identical copies of the three frozen example responses; they
are the contract. The fisherman and authority workspaces fetch their analysis from the mock
backend — `GET /api/analysis?persona=fisherman|authority`, served by `backend/index.js`
(Express, port 3001) via `frontend/src/lib/useAnalysis.ts` (`API_BASE` is the one constant to
change when the real backend lands). The maritime workspace still imports its sample directly:
the `maritime_operator` persona is deliberately not implemented yet, and the backend answers 501
for it.

The backend reads `backend/mocks/*.json` fresh from disk on every request — swap those files and
nothing else changes.

- `frontend/src/types/orca.ts` — TypeScript mirror of the envelope
- `frontend/src/lib/statusStyles.ts` — the single place token → colour mapping lives
- `frontend/src/lib/humanize.ts`, `frontend/src/lib/format.ts` — display helpers (Asia/Kolkata)

## Status tokens seen in the samples

| Token | Meaning in UI |
| --- | --- |
| favourable / caution / unfavourable / unavailable | assessment verdicts (emerald / amber / red / gray) |
| live / cached / fallback / unavailable | data freshness |
| available / unavailable | per-value data presence |
| watch / caution / warning | hazard severities |
| high / medium / low | authority area priority |
