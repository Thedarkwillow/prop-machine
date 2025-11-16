# AI Sports Betting Intelligence Platform

## Overview

Prop Machine is an AI-powered sports betting intelligence platform that helps users make informed betting decisions through ML-driven prop analysis, confidence scoring, and Kelly criterion-based bankroll management. The platform focuses on NHL props (with support for NBA, NFL, MLB) and provides automated slip generation, performance tracking, and closing line value (CLV) analysis to validate the model's edge over time.

## Recent Changes

**November 16, 2025 - Multi-Platform Prop Integration & Data-Safety System**
- **Multi-Platform Prop Fetching:** Integrated PrizePicks and Underdog Fantasy APIs
  - Created `prizepicksClient` for fetching props from PrizePicks API (`api.prizepicks.com/projections`)
  - Created `underdogClient` for fetching props from Underdog API (`api.underdogfantasy.com/v1/appearances`)
  - Built unified `propRefreshService` coordinating fetches across multiple platforms
  - Admin endpoint `/api/admin/props/refresh` for multi-platform prop refresh with RBAC protection
  - Supports NBA, NFL, NHL, MLB across both platforms
  - Automatic ML analysis and confidence scoring for all fetched props
- **Production-Grade Data Safety System:** Guarantees active props remain available during refreshes
  - **Strategy:** Capture old prop IDs BEFORE inserting, then deactivate ONLY those specific IDs
  - Added `getActivePropIdsBySportAndPlatform()` to query existing props before changes
  - Added `deactivateSpecificProps(propIds)` to target only pre-existing props
  - **Guarantees:** API failures, zero props fetched, all validation failures, and all insertion failures preserve existing active props
  - Newly inserted props are never deactivated (not in captured oldPropIds array)
  - Architect-verified production-ready implementation
- **Quarter/Period Prop Support:** Extended schema for quarter and half-specific props
  - Added `period` field to props table: `full_game`, `1Q`, `1H`, `2H`, `4Q`
  - PrizePicks supports quarter-specific props (e.g., "Points 1Q", "Rebounds 2H")
  - Underdog primarily full-game props
  - Schema migration completed via `npm run db:push`
- **Expanded Stat Type Support:** Comprehensive stat mapping for all platforms
  - Combo stats: PTS+AST, PTS+REB, PTS+REB+AST, REB+AST, Rush+Rec Yards
  - Platform-specific stat normalization across PrizePicks, Underdog, The Odds API
  - Fantasy points, anytime touchdowns, pitcher strikeouts, and more
- **Slip Confidence Score Display:** Enhanced slip builder UI
  - Overall confidence badge showing average of all selected props
  - Dynamically updates as props are added/removed
  - Displays "{slipConfidence}% Confidence" next to slip title
  - Provides at-a-glance quality assessment of parlay construction
- **The Odds API Status:** Free tier limitation documented
  - Player props require paid subscription ($50-100/month)
  - Standard markets (h2h, spreads, totals) supported on free tier
  - Code ready to activate when upgraded (uncomment in propFetcherService.ts)

**November 16, 2025 - Real ML Model Integration & Database Migration**
- **Database Migration:** Created fresh PostgreSQL database and migrated to persistent DbStorage
  - Successfully created new Neon PostgreSQL database after old endpoint disabled
  - Ran `npm run db:push` to sync Drizzle schema to new database
  - All data now persists across server restarts (users, props, slips, bets)
  - Seed data successfully populated in new database
- **Real ML Model Integration:** Built statistical prop analysis using BallDontLie API
  - Created `propAnalysisService` that replaces mock random scoring with real player statistics
  - Integrates player season averages, recent performance, matchup analysis, line movement
  - Uses `modelScorer` to generate confidence scores (0-100) with detailed reasoning arrays
  - Calculates expected value (EV%) and model probability (decimal) for each prop
  - Fully functional for manual prop analysis via admin interface
- **Admin Role-Based Access Control:** Complete RBAC implementation
  - Backend: `requireAdmin` middleware protects all `/api/admin/*` routes
  - Frontend: AdminRoute guard component prevents non-admin access
  - Seed user (seed-user-1) has admin privileges for testing

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
- **Currently using PostgreSQL database (`DbStorage`)** with Neon serverless driver
  - All data persists in PostgreSQL database across server restarts
  - Drizzle ORM provides type-safe queries and automatic schema generation
  - Database connection configured via DATABASE_URL environment variable
- `MemStorage` implementation available as fallback for development without database

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