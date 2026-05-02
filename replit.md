# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## GitHub Repository

- **Repo**: https://github.com/c-puente/slide-clicker
- **Token secret**: `GITHUB_PERSONAL_ACCESS_TOKEN` (stored in Replit Secrets)
- **Push script**: `pnpm --filter @workspace/scripts run push-github`
  - Uploads hand-written source only (skips generated files, binaries, lock files)

## App: SlideClicker

Real-time wireless presentation remote.

- **Presenter screen** — joins/creates a session, sees live vote count + flash when audience wants to advance
- **Audience screen** — taps to request the presenter advance the slide
- **WebSocket server** — `artifacts/api-server/src/routes/sessions.ts` manages rooms and broadcasts
- **Mobile app** — `artifacts/mobile/` (Expo + React Native)
- **Session context** — `artifacts/mobile/context/SessionContext.tsx`
