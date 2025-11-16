# AI Sports Betting Intelligence Platform

## Overview

Prop Machine is an AI-powered sports betting intelligence platform that helps users make informed betting decisions through ML-driven prop analysis, confidence scoring, and Kelly criterion-based bankroll management. The platform focuses on NHL props (with support for NBA, NFL, MLB) and provides automated slip generation, performance tracking, and closing line value (CLV) analysis to validate the model's edge over time.

## Recent Changes

**November 16, 2025 - Admin Role-Based Access Control (RBAC) Implementation**
- **Security Fix:** Implemented complete admin role-based access control
  - Added `isAdmin` boolean field to users table schema (defaults to false)
  - Created `requireAdmin` middleware for backend admin route protection (checks auth + isAdmin flag)
  - Added AdminRoute guard component for frontend route protection (redirects non-admins)
  - Admin navigation link only visible to users with isAdmin: true
  - Seed user (seed-user-1) marked as admin in seed data for testing
- **Storage Switch:** Migrated to in-memory MemStorage due to disabled Neon database endpoint
  - Session store uses in-memory storage (sessions persist until restart)
  - All user data, props, slips, bets stored in memory
  - Graceful error handling for database unavailability during auth
- **Testing:** Verified complete RBAC system with end-to-end Playwright tests
  - Admin users can access /admin and see admin navigation
  - Non-admin users redirected from /admin and cannot see admin nav link

**November 15, 2025 - Complete Multi-Leg Parlay Tracking Implementation**
- Implemented slip-based bet placement workflow for parlay tracking
- Fixed critical /api/bets endpoint crash (inArray usage for Drizzle queries)
- Fixed apiRequest parameter order bug in queryClient
- Added sport field to slip picks array for proper filtering
- Updated bet history to display both single-prop bets and multi-leg parlays
- Enhanced backend storage to fetch both props and slips for comprehensive bet history
- Added atomic bankroll updates via placeBetWithBankrollCheck transaction
- Verified complete end-to-end functionality through comprehensive testing

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18 with TypeScript using Vite as the build tool
- Client-side routing via Wouter (lightweight alternative to React Router)
- TanStack Query (React Query) for server state management with aggressive caching strategy (staleTime: Infinity)

**UI Component System**
- shadcn/ui component library built on Radix UI primitives
- Tailwind CSS for styling with custom design tokens defined in CSS variables
- Design philosophy: Hybrid approach combining Linear's productivity aesthetic with Robinhood's financial clarity
- Typography: Inter for UI, JetBrains Mono for numerical data (odds, stats, confidence scores)
- Custom hover and elevation utilities for interactive feedback

**State Management**
- Server state managed via TanStack Query with custom query client
- No global client state management (relies on React hooks and query cache)
- Form state handled by react-hook-form with Zod validation via @hookform/resolvers

**Key Design Patterns**
- Progressive disclosure: Surface critical metrics (confidence, EV) at a glance, details on demand
- Data hierarchy: Information density without clutter, using typography scale and color coding
- Trust through transparency: Clear presentation of model probabilities, confidence scores, and performance metrics

### Backend Architecture

**Server Framework**
- Express.js with TypeScript running on Node.js
- Custom middleware for request logging and JSON body parsing with raw body capture
- Vite integration for development with HMR (Hot Module Replacement)

**API Design**
- RESTful API structure with route registration in `/server/routes.ts`
- Zod-based validation for all route parameters, query strings, and request bodies (defined in `/server/validation.ts`)
- Comprehensive error handling with ZodError catching for validation failures
- Routes organized by resource: users, props, slips, bets, performance snapshots

**Data Access Layer**
- Abstraction through `IStorage` interface defined in `/server/storage.ts`
- **Currently using in-memory storage (`MemStorage`)** due to disabled Neon database endpoint
  - All data persists in memory until server restart
  - No data persistence across restarts
- Designed for easy migration to database-backed storage (Drizzle ORM configured for PostgreSQL)
- Switch to `DbStorage` when database endpoint is re-enabled

**Seeding Strategy**
- Database seeding via `/server/seed.ts` creates default admin user and sample props
- Default seed user (seed-user-1) has admin privileges (isAdmin: true)
- Creates 28 sample props across NHL, NBA, NFL, MLB
- Creates 3 sample slips (conservative, balanced, aggressive)
- Creates 4 sample bets for performance tracking
- Idempotent seeding (checks for existing data before insertion)

### Data Storage Solutions

**Database Configuration**
- Drizzle ORM configured for PostgreSQL via Neon serverless driver
- Schema defined in `/shared/schema.ts` using Drizzle's pgTable API
- WebSocket-based connection pooling for serverless environments

**Schema Design**

*Users Table*
- Tracks bankroll (current and initial), Kelly sizing multiplier, and risk tolerance
- Decimal precision for financial values (10,2 for bankroll, 3,2 for Kelly multiplier)
- **isAdmin field:** Boolean flag for admin role-based access control (defaults to false)

*Props Table*
- Stores ML-analyzed betting propositions with sport, player, team, opponent, stat type
- Key metrics: confidence (0-100 integer), expected value (EV%), model probability (4 decimal places)
- Platform tracking (PrizePicks, Underdog, etc.) and active/inactive state management

*Slips Table*
- Pre-generated betting slips categorized by risk type (conservative, balanced, aggressive)
- JSONB `picks` field stores complete array of prop details for multi-leg parlays:
  - Each pick includes: propId, player, team, sport, stat, line, direction, confidence
  - Enables full tracking of parlay legs without JOIN queries
  - Sport field supports cross-sport filtering in bet history
- Tracks suggested bet amount (Kelly-calculated), potential return, status, and timestamps

*Bets Table*
- Individual bet records with dual tracking: single props OR multi-leg parlays
- Single bets: link to props via `propId`, `slipId` is null
- Parlay bets: link to slips via `slipId`, `propId` is null
- Slip reference provides access to complete picks array for parlay tracking
- Captures closing line value (CLV) for model validation
- Status lifecycle: pending → won/lost/pushed
- Atomic bankroll updates via transaction in `placeBetWithBankrollCheck`

*Performance Snapshots Table*
- Time-series tracking of key metrics: win rate, ROI, CLV%, total bets
- Enables historical performance analysis and charting

**Migration Strategy**
- Drizzle Kit configured for schema migrations (output to `/migrations`)
- `db:push` npm script for schema synchronization

### Authentication and Authorization

**Replit Auth Integration**
- Multi-user authentication via Replit OAuth (openid-client with Passport.js)
- Session-based authentication with in-memory session store (memorystore)
  - Sessions persist until server restart
  - Falls back from PostgreSQL session store when database unavailable
- User data synced on login via `/server/replitAuth.ts`
- String-based user IDs (varchar) to support OAuth sub claims

**Role-Based Access Control (RBAC)**
- **Admin Role System:**
  - `isAdmin` boolean field on users table (defaults to false)
  - Backend: `requireAdmin` middleware protects all `/api/admin/*` routes
    - Checks authentication AND user.isAdmin flag
    - Returns 403 Forbidden if user is not admin
  - Frontend: `AdminRoute` guard component prevents non-admin access
    - Redirects non-admins from /admin to dashboard
    - Admin navigation link only visible to admins (user?.isAdmin === true)
- **Seed Admin User:** seed-user-1 (seed@example.com) has admin privileges for testing
- **New Users:** Default to non-admin role (isAdmin: false)

**Admin Capabilities**
- Manual settlement triggers for pending bets
- Integration API testing (NBA, Odds, Scoreboard APIs)
- Prop rescoring across all active props
- System statistics dashboard
- All admin actions logged and protected by RBAC

### External Dependencies

**Third-Party UI Libraries**
- Radix UI primitives (@radix-ui/*) for accessible, headless components
- Recharts for data visualization (bankroll charts, performance trends)
- date-fns for date manipulation and formatting
- Lucide React for icon system

**Development Tools**
- @replit/vite-plugin-runtime-error-modal for error overlays
- @replit/vite-plugin-cartographer and dev-banner for Replit integration
- tsx for TypeScript execution in development

**Validation & Type Safety**
- Zod for runtime validation (schema validation, API contracts)
- drizzle-zod for automatic Zod schema generation from Drizzle tables
- TypeScript strict mode enabled across entire codebase

**Database & ORM**
- @neondatabase/serverless for PostgreSQL connectivity
- drizzle-orm for type-safe database queries
- ws (WebSocket) for Neon serverless connection protocol

**Code Quality**
- Path aliases configured for clean imports (@/, @shared/, @assets/)
- Shared types between frontend/backend via `/shared` directory
- ESLint-style naming conventions (components PascalCase, utilities camelCase)