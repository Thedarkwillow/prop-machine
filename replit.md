# AI Sports Betting Intelligence Platform

## Overview

Prop Machine is an AI-powered sports betting intelligence platform designed to assist users in making informed sports betting decisions. It leverages machine learning for prop analysis, confidence scoring, and integrates the Kelly criterion for bankroll management. The platform primarily focuses on NHL props but also supports NBA, NFL, and MLB. Key capabilities include automated slip generation, performance tracking, and closing line value (CLV) analysis to validate the model's effectiveness. The platform aims to provide a robust tool for users to gain an edge in sports betting.

## Recent Changes

### Google OAuth Authentication Refactor (November 20, 2025)
- **Switched to Passport.js**: Migrated from `openid-client` to Passport's `GoogleStrategy` for cleaner, more maintainable OAuth implementation
- **PostgreSQL-Backed Sessions**: Implemented `connect-pg-simple` for session persistence across Railway containers
  - Sessions stored in PostgreSQL table (auto-created) instead of in-memory
  - Fixes "Invalid state parameter" error by sharing session state across multiple Railway instances
  - Shared session middleware in `server/index.ts` used by both Replit Auth and Google OAuth
- **Trust Proxy Configuration**: Added `app.set("trust proxy", 1)` for production to support secure cookies behind Railway's HTTPS proxy
- **Conditional Session Security**: Session cookies use `secure: true` in production, `secure: false` in development
- **Automatic State Management**: Passport's GoogleStrategy handles OAuth state parameter automatically with `state: true` configuration
- **Proper Session Handling**: Fixed `deserializeUser` to properly convert session IDs from string to number with NaN validation
- **Type Safety**: Enhanced type checking in user serialization/deserialization to prevent runtime errors
- **Route Configuration**: All routes remain at `/api/auth/google/*` to match Google OAuth console configuration
- **Callback URL Logic**: Smart callback URL that respects `GOOGLE_REDIRECT_URI` env var with dev/prod fallbacks
- **Enhanced Error Handling**: Comprehensive logging with emoji markers for debugging OAuth flow
  - ✅ Authentication success
  - ❌ Error conditions
  - 🔄 Processing steps
- **User Creation**: Safely handles optional Google profile fields (firstName, lastName, profileImageUrl) by converting undefined to null

### Railway Production Deployment (November 19, 2025)
- **Database Architecture**: Replit uses built-in PostgreSQL, Railway uses separate Neon database (both share same schema)
- **Shared Database Strategy**: Both Replit and Railway now connect to Railway's Neon database for data consistency
- **Decimal Normalization Fix**: Implemented `normalizeDecimals()` helper in `server/storage.ts` to convert PostgreSQL DECIMAL columns (returned as strings by Drizzle) to numbers at the storage layer
  - Applied to `getActiveProps()`, `getAllActiveProps()`, and `getUser()` methods
  - Fixes `.toFixed() is not a function` errors across the entire frontend
  - Eliminates need for individual component-level parseFloat() patches
- **Prop Scheduler Control**: Added `DISABLE_PROP_SCHEDULER` environment variable support to disable scheduler on Railway
- **Production Configuration**: Railway uses Google OAuth, Neon HTTP fetch, serves static files from `dist/public/`
- **Deployment Status**: Railway successfully deployed and running (scheduler disabled to conserve API credits)

### API Integration Status
- **The Odds API**: Working perfectly with paid tier (15,000+ NBA props, 1,100+ NHL props, NFL props)
- **PrizePicks API**: Returns HTTP 403 Forbidden (access restricted)
- **Underdog Fantasy API**: Returns HTTP 404 Not Found (endpoint unavailable)

### NBA Player Search Integration
- **BallDontLie API**: Integrated BallDontLie API for NBA player search with authenticated requests
- **Multi-Sport Search**: `/api/players/search` now supports NBA (BallDontLie), NHL/NFL (ESPN)
- **Rate Limiting**: Configured proper free tier limits (5 req/min) with caching layer
- **Player Search UI**: PlayerSearchDropdown works across all sports on PlayerComparison and PropComparison pages
- **End-to-End Tested**: Verified NBA player search with LeBron James, Stephen Curry, Kevin Durant

### Live Scoreboard Integration
- **ESPN API Integration**: Integrated ESPN API for live game scores across all four major sports (NBA, NHL, NFL, MLB)
- **Real-time Game Data**: Live Scoreboard now displays scheduled, in-progress, and completed games
- **Database Persistence**: Games are stored in `gameEvents` table for tracking and settlement
- **Service Architecture**: Uses `liveScoreboardService` with caching to respect API rate limits

### Authentication & Security
- **Session Bridging**: Added middleware to bridge `req.session.user` to `req.user` for compatibility
- **Secure Endpoints**: All notification preference endpoints now require authentication
- **Zod Validation**: PATCH requests validate using `updateNotificationPreferencesSchema`
- **Database Fix**: Fixed `upsertUser()` to handle email uniqueness conflicts during OIDC login

### Navigation Fixes
- **Sidebar Updates**: Fixed navigation links to point to existing routes
- **Props Feed**: Changed `/props` to `/` (Dashboard with Live Props)
- **Live Scores**: Properly linked to `/live-scoreboard` page

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with React 18 and TypeScript, using Vite as the build tool and Wouter for client-side routing. TanStack Query manages server state with aggressive caching. UI components are built with shadcn/ui, based on Radix UI primitives, and styled with Tailwind CSS. The design philosophy combines productivity aesthetics with financial clarity, using Inter for UI typography and JetBrains Mono for numerical data. Form state is handled by react-hook-form with Zod validation. The design emphasizes progressive disclosure, data hierarchy, and transparency in presenting model probabilities and performance metrics.

### Backend Architecture

The backend is developed with Express.js and TypeScript on Node.js. It features a RESTful API with Zod-based validation for all requests and comprehensive error handling. Routes are organized by resource, including users, props, slips, bets, and performance snapshots. A data access layer uses an `IStorage` interface, with the primary implementation being `DbStorage` for PostgreSQL via Neon serverless driver and Drizzle ORM for type-safe queries. A `MemStorage` fallback is available for development. The system includes a robust seeding strategy for initial data population and a comprehensive authentication and authorization system using Replit Auth (or Google OAuth for Railway deployment) and role-based access control (RBAC) with an `isAdmin` flag for administrative privileges.

### Data Storage Solutions

The platform utilizes a PostgreSQL database, configured with Drizzle ORM and Neon serverless driver. The schema, defined in `/shared/schema.ts`, includes:
- **Users Table**: Tracks bankroll, Kelly sizing, risk tolerance, and an `isAdmin` boolean for RBAC.
- **Props Table**: Stores ML-analyzed betting propositions, including sport, player, team, stat type, confidence scores, expected value (EV%), model probability, and platform origin (e.g., PrizePicks, Underdog). It supports quarter/period specific props.
- **Slips Table**: Stores pre-generated betting slips with `picks` (JSONB array of prop details), suggested bet amount, potential return, and status.
- **Bets Table**: Records individual bets, linking to either `propId` (single bets) or `slipId` (parlays), captures closing line value (CLV), and tracks status. Atomic bankroll updates are handled via transactions.
- **Performance Snapshots Table**: Tracks time-series metrics like win rate, ROI, and total bets for historical analysis.
Drizzle Kit is used for schema migrations.

## External Dependencies

### Third-Party UI Libraries
- **Radix UI**: For accessible, headless UI components.
- **Recharts**: For data visualization (charts).
- **date-fns**: For date manipulation and formatting.
- **Lucide React**: For icons.

### Development Tools
- **@replit/vite-plugin-runtime-error-modal**: For error overlays in development.
- **@replit/vite-plugin-cartographer**: For Replit integration.
- **tsx**: For TypeScript execution in development.

### Validation & Type Safety
- **Zod**: For runtime schema validation and API contract enforcement.
- **drizzle-zod**: For automatic Zod schema generation from Drizzle tables.

### Database & ORM
- **@neondatabase/serverless**: For PostgreSQL connectivity.
- **drizzle-orm**: For type-safe database queries and ORM functionalities.
- **ws (WebSocket)**: For Neon serverless connection protocol.

### External APIs/Services
- **PrizePicks API**: For fetching sports propositions.
- **Underdog Fantasy API**: For fetching sports propositions.
- **BallDontLie API**: Provides player statistics for ML model integration.
- **ESPN API**: For player search and statistics (v2 and v3 versions).
- **The Odds API**: Integrated for odds data (player props require paid tier).
- **Google OAuth**: For authentication in Railway deployments.
- **Replit Auth**: Default authentication provider.