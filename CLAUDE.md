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

### Authentication

- NextAuth v5 (beta) with Credentials provider (email/password)
- JWT-based sessions (no database sessions)
- `src/lib/auth.ts` — NextAuth config, bcrypt password hashing (cost 12)
- `src/lib/auth.config.ts` — JWT/session callbacks (adds `id` and `onboarded` to token/session)
- `src/middleware.ts` — Route protection via NextAuth middleware
- Session type extended in `src/types/next-auth.d.ts`

### Database

- Prisma 7 with `@prisma/adapter-pg` (PostgreSQL driver adapter)
- `src/lib/prisma.ts` — Singleton client with connection pooling
- Key models: User, UserSettings, Income, IncomeSource, Expense, ExpenseCategory, FixedExpenseTemplate, Budget, Goal, GoalContribution, MonthSnapshot

### State Management

- **Server-side**: Most data is fetched in async server components or server actions
- **Zustand stores** (`src/stores/`): `onboarding-store.ts` (multi-step form state), `ui-store.ts` (UI preferences)
- Minimal client-side state by design

### UI Stack

- Tailwind CSS 4 + shadcn/ui components (`src/components/ui/`)
- Feature components organized by domain (`src/components/dashboard/`, `transactions/`, `analytics/`, etc.)
- Shared components in `src/components/shared/` and layout in `src/components/layout/`
- shadcn/ui config in `components.json` — uses "new-york" style, CSS variables, and `@/` import alias
- Framer Motion for animations, Recharts for charts, Lucide for icons
- Dark/light mode via next-themes

### Key Libraries

- `src/lib/constants.ts` — JAR_TYPES definitions (6 jars with default percentages), expense categories, months
- `src/lib/format.ts` — BRL currency formatting
- `src/lib/automation-engine.ts` — Budget alerts (80% threshold), due date reminders, goal milestone notifications
- `src/lib/validations.ts` — Zod schemas for form validation
- `src/lib/currencies.ts` — Multi-currency support definitions

### PWA

Progressive Web App via `@ducanh2912/next-pwa`. Disabled in development, enabled in production. Offline page at `/offline`. Icons in `public/icons/`.

## Jar System

The core budgeting concept — income is allocated across 6 jars with default percentages: Necessities (55%), Education (10%), Savings (10%), Play (10%), Investment (10%), Giving (5%). Percentages are customizable per user via UserSettings.jarRules (JSON field).
