# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FinPulse — a full-stack personal finance management app built with Next.js 16, React 19, TypeScript, Prisma 7, and PostgreSQL. The UI is entirely in Portuguese (pt-BR). It uses jar-based budgeting (Harv Eker's 6-jar system), goals tracking, analytics, and report exporting.

## Common Commands

```bash
npm run dev              # Start dev server (Turbopack enabled)
npm run build            # Production build
npm run lint             # ESLint
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema changes to DB (no migration files)
npm run db:studio        # Open Prisma Studio GUI
npm run db:seed          # Seed admin user (admin@finpulse.com / admin123)
```

No test runner is configured. Prisma client is auto-generated on `npm install` via postinstall hook.

## Environment Variables

Required in `.env` (see `.env.example`):
- `DATABASE_URL` — PostgreSQL connection string
- `DIRECT_URL` — Direct PostgreSQL URL (used for Prisma migrations)
- `NEXTAUTH_SECRET` — Secret for NextAuth JWT signing
- `NEXTAUTH_URL` — Base URL (e.g., `http://localhost:3000`)

## Architecture

### Routing (Next.js App Router with Route Groups)

- `src/app/(app)/` — Protected authenticated routes (dashboard, transactions, analytics, goals, jars, reports, settings, fixed-expenses)
- `src/app/(auth)/` — Public auth routes (login)
- `src/app/(onboarding)/` — Onboarding flow (6-step wizard)
- `src/app/api/auth/[...nextauth]/` — NextAuth handlers
- `src/app/api/export/` — Report export endpoint (CSV, XLSX, PDF, JSON)

### Server Actions (`src/actions/`)

All data mutations and queries go through server actions (not API routes). Each action file authenticates via `auth()` from NextAuth and queries the database directly with Prisma. Pattern:

```typescript
"use server";
const session = await auth();
if (!session?.user) throw new Error("Not authenticated");
// ... prisma queries using session.user.id for row-level auth
```

Key action files by domain:
- `dashboard-actions.ts` — Aggregated dashboard data (balances, jars, cashflow history, daily pulse)
- `transaction-actions.ts` — CRUD for income/expenses with pagination and filters
- `jar-actions.ts` — Jar balances, allocation, transfers, rule updates (validates sum = 100%)
- `goal-actions.ts` — Goal CRUD and contribution tracking
- `analytics-actions.ts` — Monthly/annual analytics, anomaly detection, projections, what-if scenarios
- `fixed-expense-actions.ts` — Recurring expense templates and auto-registration
- `import-actions.ts` — Bulk import with auto-creation of missing categories/sources/templates
- `settings-actions.ts` — Profile, preferences, category/source management
- `report-actions.ts` — Export-ready report data generation
- `advisor-actions.ts` — Rule-based financial tips (9 tip generators)
- `benchmark-actions.ts` — Financial health scoring (9 metrics, weighted 0-100 score)
- `achievement-actions.ts` — Gamification system (10 achievements)
- `onboarding-actions.ts` — First-time setup wizard (creates all initial user data)

### Authentication

- NextAuth v5 (beta) with Credentials provider (email/password)
- JWT-based sessions (no database sessions)
- `src/lib/auth.ts` — NextAuth config, bcrypt password hashing (cost 12)
- `src/lib/auth.config.ts` — JWT/session callbacks (adds `id` and `onboarded` to token/session); re-checks `onboarded` from DB on each JWT refresh while false
- `src/middleware.ts` — Route protection via NextAuth middleware; redirects logged-in users from `/login` to `/dashboard`
- Session type extended in `src/types/next-auth.d.ts`

### Database

- Prisma 7 with `@prisma/adapter-pg` (PostgreSQL driver adapter)
- `src/lib/prisma.ts` — Singleton client with global caching (prevents hot-reload connection spam)
- All monetary fields use `Decimal(12,2)` — amounts must be rounded to 2 decimal places before writes
- Key models: User, UserSettings, Income, IncomeSource, Expense, ExpenseCategory, FixedExpenseTemplate, Budget, Goal, GoalContribution, MonthSnapshot
- **Soft deletes** (isActive flag): ExpenseCategory, IncomeSource
- **Hard deletes**: Expense, Income, Goal, GoalContribution, FixedExpenseTemplate

### State Management

- **Server-side**: Most data is fetched in async server components or server actions
- **Zustand stores** (`src/stores/`): `onboarding-store.ts` (multi-step form state), `ui-store.ts` (UI preferences)
- Minimal client-side state by design

### UI Stack

- Tailwind CSS 4 + shadcn/ui components (`src/components/ui/`) — "new-york" style, CSS variables, `@/` import alias
- Feature components organized by domain (`src/components/dashboard/`, `transactions/`, `analytics/`, etc.)
- Shared components in `src/components/shared/` and layout in `src/components/layout/`
- Framer Motion for animations, Recharts for charts, Lucide for icons
- Dark/light mode via next-themes (default: dark, enableSystem: true)
- Fonts: DM Sans (body) + DM Mono (monospace)
- Sonner for toast notifications (top-right, richColors)

### Build Configuration

- React Compiler enabled (`reactCompiler: true` in next.config.ts)
- Turbopack enabled for dev server
- `bcryptjs` in `serverExternalPackages` (server-only, not bundled)
- PWA via `@ducanh2912/next-pwa` — disabled in dev, enabled in production
- Path alias: `@/*` → `./src/*`

### Key Libraries

- `src/lib/constants.ts` — JAR_TYPES definitions (6 jars with default percentages), default expense categories, income sources, months in pt-BR
- `src/lib/format.ts` — `formatBRL()` for "R$ X.XXX,XX", `parseBRLInput()` for "1.234,56" → 1234.56, `formatPercent()`, `formatCompact()`
- `src/lib/currencies.ts` — 9 currencies (BRL, USD, EUR, GBP, ARS, JPY, CAD, AUD, CHF) with `formatCurrency()` using Intl.NumberFormat
- `src/lib/automation-engine.ts` — Budget alerts (≥80% threshold), due date reminders (within 3 days), goal milestone notifications (25/50/75/100%)
- `src/lib/validations.ts` — Zod schemas for all forms (login, expense, income, goal, profile, etc.)

### Spreadsheet Import

`src/components/settings/import-data.tsx` handles CSV/XLSX import with two parser modes:
- **Smart dashboard parser**: Auto-detects "Mente Milionária" financial dashboard layout (sections: RECEITAS, DESPESAS FIXAS, DESPESAS VARIÁVEIS)
- **Fallback tabular parser**: Expects columns: tipo, valor, descricao, data, categoria/fonte
- Handles BR currency format ("R$ 1.234,56"), diacritics normalization, multiple date formats
- Import action auto-creates missing categories, sources, and fixed expense templates

## Jar System

The core budgeting concept — income is allocated across 6 jars with default percentages: Necessities (55%), Education (10%), Savings (10%), Play (10%), Investment (10%), Giving (5%). Percentages are customizable per user via `UserSettings.jarRulesJson` (JSON field). Jar rules must always sum to 100%.
