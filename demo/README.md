# LedgerIQ — Automated Financial Reconciliation Platform

Automated financial reconciliation platform for telecommunications operations teams. Built for revenue assurance analysts who need to match, exception-manage, and close reconciliation periods across bank statements, GL exports, AR subledgers, and intercompany accounts.

## Features

- **Analytics Dashboard** — Match rate trend, exception aging, SLA tracker, top exception sources
- **Reconciliations** — Three pre-loaded datasets (Bank/GL, AR Subledger, Intercompany) with real match rates
- **Reconciliation Workspace** — Split-panel side-by-side view with filter, bulk actions, and period lock
- **Exception Management Queue** — Sortable/filterable queue with drill-down, suggested matches, and 5 resolution actions
- **Data Import & Matching Engine** — Multi-step wizard with CSV drop zones, preview, configurable match rules, and progress simulation

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS (custom dark enterprise theme)
- React Router v6
- Recharts
- Lucide React
- Sonner (toasts)

## Setup

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build
npm run preview    # preview production build
```

## Routes

| Path | Page |
|------|------|
| `/dashboard` | Analytics dashboard |
| `/reconciliations` | Reconciliation list |
| `/reconciliations/:id` | Workspace (split-panel) |
| `/exceptions` | Exception management queue |
| `/import` | Data import wizard |

## Seed Data

- **REC-001** — Bank Statement vs General Ledger: 143 items, 95.8% matched, 6 open exceptions
- **REC-002** — AR Subledger vs Trial Balance: 89 items, 91% matched, 2 open exceptions
- **REC-003** — Intercompany: 56 items, 100% matched, closed (locked by Libin Joseph)
- **8 pending exceptions** across both active datasets (all types: amount_diff, timing, missing_source_a, missing_source_b)

## Persistence

User actions (exception resolutions, period locks) persist in `localStorage` under key `ledgeriq_state_v2`. Use the **Reset Demo Data** link in the sidebar to restore defaults.

## Limitations & Assumptions

- Authentication is not implemented (single-user demo context)
- File parsing is simulated — drop zone loads predefined sample data
- The Import Engine matching results are computed from the sample Nov 2026 dataset, not persisted to the reconciliation list
- Charts use seed data values directly (no backend)

## Deployment

Deploy to Vercel. The `vercel.json` rewrites all paths to `/index.html` for client-side routing.

```bash
vercel deploy --prod
```

Project name: `ledger-iq`
