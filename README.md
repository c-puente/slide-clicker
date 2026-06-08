# slide-clicker

**Real-time wireless presentation remote.** A full-stack application that enables presenters and audience members to interact during live presentations through a mobile app backed by a WebSocket API.

## Overview

**Slide Clicker** is a monorepo project built with TypeScript, Expo, and WebSockets. It provides a seamless experience for:

- **Presenters** — Create or join a session, monitor real-time audience votes to advance/go back, see live feedback notes, and manage the room
- **Audience members** — Join a session with a code, vote to request the next/previous slide, send anonymous feedback notes, and rate the session

The system is designed for low-latency, real-time communication over WebSocket connections with built-in rate limiting and safeguards for scalability.

---

## Quick Start

### Prerequisites

- **Node.js**: v24
- **Package manager**: pnpm (enforced via `preinstall` script)
- **TypeScript**: 5.9

### Installation & Development

```bash
# Install dependencies
pnpm install

# Type-check entire workspace
pnpm run typecheck

# Build all packages
pnpm run build

# Run API server locally (dev mode)
pnpm --filter @workspace/api-server run dev

# Regenerate API types/hooks from OpenAPI spec (if modified)
pnpm --filter @workspace/api-spec run codegen
```

---

## Project Structure

### Workspace Layout

This is a **pnpm monorepo** with workspaces defined in `pnpm-workspace.yaml`:

```
slide-clicker/
├── artifacts/
│   ├── api-server/         # Express + WebSocket server (Node.js)
│   ├── mobile/             # Expo + React Native app (iOS, Android, Web)
│   └── mockup-sandbox/     # (Legacy/experimental UI component sandbox)
├── lib/
│   ├── db/                 # Shared database layer (Drizzle ORM)
│   ├── api-zod/            # Shared Zod schemas for validation
│   ├── api-client-react/   # React hooks for API communication
│   └── api-spec/           # OpenAPI specification
├── scripts/
│   └── [build/utility scripts]
├── package.json            # Root workspace config
├── pnpm-workspace.yaml     # Monorepo & security settings
└── tsconfig.json           # TypeScript project references

```

### Key Packages

| Package | Purpose | Tech Stack |
|---------|---------|-----------|
| `@workspace/api-server` | WebSocket-based real-time API | Express 5, ws, Pino logger |
| `@workspace/mobile` | Cross-platform mobile & web app | Expo 54, React Native, TanStack Query |
| `@workspace/db` | Database models & migrations | PostgreSQL, Drizzle ORM, TypeScript |
| `@workspace/api-zod` | Shared validation schemas | Zod, drizzle-zod |
| `@workspace/api-client-react` | Auto-generated React hooks | Orval, TanStack Query |

---

## Architecture

### API Server (`artifacts/api-server/`)

**Technology**: Express 5 + WebSocket (ws)

**Entry Point**: `src/index.ts`

#### Structure
```
src/
├── index.ts              # Server initialization, PORT validation
├── app.ts                # Express app setup (middleware, routes)
├── routes/
│   ├── index.ts          # Route aggregation
│   ├── health.ts         # Health check endpoint
│   ├── sessions.ts       # WebSocket connection handler & session management
│   └── feedback.ts       # Feedback submission to GitHub Issues
└── lib/
    └── logger.ts         # Pino-based structured logging
```

#### Session Management (`sessions.ts`)

The heart of the real-time system:

- **Max Constraints**:
  - 500 sessions (presenters)
  - 100 audience members per session
  - 4-character alphanumeric session codes (generated, unique)
  - Member names limited to 50 characters, notes to 280 characters

- **Rate Limiting**:
  - Messages: 30 per 2 seconds
  - Notes: 10 per minute

- **WebSocket Endpoint**: `/api/ws`

- **Core Interfaces**:
  ```typescript
  interface Client {
    ws: WebSocket;
    name: string;
    role: "presenter" | "audience";
    sessionCode: string;
    memberId: string;
  }

  interface Session {
    code: string;
    clients: Map<string, Client>;
    slideNumber: number;
    voteCount: number;          // votes to advance
    voterIds: Set<string>;
    prevVoteCount: number;      // votes to go back
    prevVoterIds: Set<string>;
    locked: boolean;            // presenter can lock room
    notesDisabled: boolean;     // presenter can disable notes
  }
  ```

- **Message Types**: Handled on WebSocket `message` event with Zod validation

#### Build & Deployment

- **Build Tool**: esbuild
- **Output**: ESM bundle (`dist/index.mjs`)
- **Special Handling**:
  - CJS packages (e.g., Express) shimmed to work in ESM context via banner
  - Pino logging properly bundled with `esbuild-plugin-pino`
  - Source maps enabled for debugging

### Mobile App (`artifacts/mobile/`)

**Technology**: Expo 54, React Native, TypeScript, TanStack Query

**Navigation**: Expo Router (file-based routing)

#### Screens

1. **Home (`app/index.tsx`)**
   - Tab switcher: "Present" vs "Audience"
   - Presenter mode: Create session, enter name, get shareable code
   - Audience mode: Join session by code, enter name
   - Tab underline animation shows active mode

2. **Presenter (`app/presenter.tsx`)**
   - Display session code (lock button available)
   - Show live vote counts (advance/previous)
   - Flash visual feedback when audience votes
   - Audience member list with presence
   - Settings menu (lock room, disable notes, remove members)
   - Leave session button (shows feedback form first)
   - Share code via native share sheet

3. **Audience (`app/audience.tsx`)**
   - Session code display
   - Large "Next" and "Previous" vote buttons with haptic feedback
   - Vote counts and percentages
   - Presence list (all connected audience members)
   - Notes input field (character limit, rate-limited)
   - Feedback form on session exit (optional rating + comment)
   - Request reminder modal if voting for 10+ seconds

#### Context & State Management

**SessionContext** (`context/SessionContext.tsx`):
- Manages WebSocket connection lifecycle
- Holds session state: code, role, slide number, votes, presence
- Provides methods: `createSession`, `joinSession`, `voteNext`, `voteNext`, etc.
- Handles message encoding/decoding with Zod
- Auto-reconnects on disconnection

#### UI Patterns

- **Dark mode support** via `useColorScheme()`
- **Haptic feedback** on actions (via `expo-haptics`)
- **Animations** via React Native `Animated` API
- **Safe areas** handled with `react-native-safe-area-context`
- **Keyboard handling** with `react-native-keyboard-controller`
- **Fonts**: Plus Jakarta Sans (Google Fonts)

#### HTTP Client Setup

- **TanStack Query** for state caching & server sync
- **Auto-generated React hooks** from OpenAPI spec via Orval
- Environment variables for API endpoints (Replit-specific for dev)

### Shared Libraries

#### `lib/api-zod/`
Zod schemas for all message types, request/response validation. Generated from OpenAPI spec.

#### `lib/api-client-react/`
TanStack Query hooks auto-generated by Orval. Used by mobile app for REST API calls.

#### `lib/db/`
Drizzle ORM schema definitions, migrations, database utilities.

---

## Security & Rate Limiting

### pnpm Workspace Security

**Minimum Release Age**: 1440 minutes (1 day) — all npm packages must be 1+ day old before installation to mitigate supply-chain attacks.

- **Excluded** (trusted): `@replit/*`, `stripe-replit-sync`
- See `pnpm-workspace.yaml` for full config

### Server-Side Safeguards

- **Message rate limiting**: 30 msgs/2sec per client
- **Note rate limiting**: 10 notes/min per client
- **Payload size**: 8 KB max per message
- **Room locks**: Presenter can lock to prevent new joins
- **Name sanitization**: Input validation & length limits
- **Session codes**: Collision detection, alphanumeric only

---

## Development Workflow

### Adding Features

1. **Backend (API Server)**
   - Add message type to Zod schema (`lib/api-zod/`)
   - Handle in `sessions.ts` WebSocket message handler
   - Update broadcast/session logic as needed
   - Test with rate limiting constraints in mind

2. **Frontend (Mobile App)**
   - Add action to `SessionContext` that sends WebSocket message
   - Consume in component via `useSession()` hook
   - Add UI with state management via `useState`
   - Use haptic feedback where appropriate

3. **Code Generation**
   - If adding REST API endpoints, update OpenAPI spec
   - Run `pnpm --filter @workspace/api-spec run codegen`
   - Re-export types/hooks from `lib/api-client-react` in mobile app

### Testing Locally

**API Server**:
```bash
pnpm --filter @workspace/api-server run dev
# Listens on port (from PORT env var, defaults to 3000 in dev)
```

**Mobile App** (Replit):
```bash
pnpm --filter @workspace/mobile run dev
# Uses EXPO_PACKAGER_PROXY_URL for remote dev
```

---

## Deployment

### Environment Variables

**API Server** (`artifacts/api-server`):
- `PORT`: Server port (required)
- `NODE_ENV`: `"production"` for prod logging
- `LOG_LEVEL`: Default "info"
- `GITHUB_PERSONAL_ACCESS_TOKEN`: For feedback issue creation

**Mobile App** (`artifacts/mobile`):
- `EXPO_PUBLIC_DOMAIN`: API server domain
- `EXPO_PUBLIC_REPL_ID`: Replit container ID (dev only)

### Build & Push

```bash
# Type-check & build
pnpm run build

# Push to GitHub (skips generated/binary files)
pnpm --filter @workspace/scripts run push-github
```

---

## Key Files & Concepts

### Critical Path for Understanding

1. **Server startup**: `artifacts/api-server/src/index.ts`
2. **Session logic**: `artifacts/api-server/src/routes/sessions.ts` (~270 lines)
3. **Mobile context**: `artifacts/mobile/context/SessionContext.tsx`
4. **Home screen**: `artifacts/mobile/app/index.tsx` (auth flow)
5. **Presenter screen**: `artifacts/mobile/app/presenter.tsx` (main presenter UX)
6. **Audience screen**: `artifacts/mobile/app/audience.tsx` (main audience UX)

### Constants to Know

- **Session code length**: 4 chars
- **Max sessions**: 500
- **Max audience/session**: 100
- **Name max length**: 50 chars
- **Note max length**: 280 chars
- **Message rate**: 30 per 2000ms
- **Note rate**: 10 per 60000ms

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| **Port already in use** | Change `PORT` env var |
| **WebSocket connection fails** | Check `EXPO_PUBLIC_DOMAIN` env var matches API server |
| **Type errors after schema change** | Run `pnpm run typecheck` and `pnpm --filter @workspace/api-spec run codegen` |
| **Replit Expo fails** | Verify `REPLIT_DEV_DOMAIN`, `REPLIT_EXPO_DEV_DOMAIN`, `REPL_ID` env vars |
| **npm package older than 1 day** | Add to `minimumReleaseAgeExclude` in `pnpm-workspace.yaml` (trusted packages only) |

---

## Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | Node.js 24 | Server runtime |
| **API Framework** | Express 5 | HTTP server & routing |
| **Real-time** | WebSocket (ws) | Session broadcasting |
| **Mobile Framework** | Expo 54 + React Native | Cross-platform mobile |
| **Language** | TypeScript 5.9 | Type safety |
| **Package Manager** | pnpm | Monorepo management |
| **Database** | PostgreSQL + Drizzle | Data persistence |
| **Validation** | Zod | Runtime schema validation |
| **State Management** | TanStack Query (React) | Client-side caching |
| **Logging** | Pino | Structured logging |
| **Build** | esbuild | API bundling |
| **Codegen** | Orval | OpenAPI → React hooks |

---

## Contributing

When extending this project:

1. **Maintain monorepo structure** — keep packages isolated with clear boundaries
2. **Follow TypeScript strict mode** — `pnpm run typecheck` must pass
3. **Add rate limiting context** — session code generation, message routing, constraint checking
4. **Test message flows** — WebSocket messages go through Zod schema validation
5. **Document env vars** — especially for Replit-specific deployment
6. **Update this README** — keep it current as features change

---

## License

MIT

---

## Quick Reference: Running Everything

```bash
# Install
pnpm install

# Type-check
pnpm run typecheck

# Build
pnpm run build

# Develop (API)
pnpm --filter @workspace/api-server run dev

# Develop (Mobile/Replit)
pnpm --filter @workspace/mobile run dev

# Regenerate API types
pnpm --filter @workspace/api-spec run codegen
```

---

**Last Updated**: 2026-06-08  
**Project Age**: 37 days (since creation)  
**Repository**: [github.com/c-puente/slide-clicker](https://github.com/c-puente/slide-clicker)
