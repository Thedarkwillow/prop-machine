# AI Sports Betting Intelligence Platform

## Overview

PickFinder is an AI-powered sports betting intelligence platform that helps users make informed betting decisions through ML-driven prop analysis, confidence scoring, and Kelly criterion-based bankroll management. The platform focuses on NHL props (with support for NBA, NFL, MLB) and provides automated slip generation, performance tracking, and closing line value (CLV) analysis to validate the model's edge over time.

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
- Currently implements in-memory storage (`MemStorage` class) for development
- Designed for easy migration to database-backed storage (Drizzle ORM configured for PostgreSQL)

**Seeding Strategy**
- Database seeding via `/server/seed.ts` creates default user and sample NHL props
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

*Props Table*
- Stores ML-analyzed betting propositions with sport, player, team, opponent, stat type
- Key metrics: confidence (0-100 integer), expected value (EV%), model probability (4 decimal places)
- Platform tracking (PrizePicks, Underdog, etc.) and active/inactive state management

*Slips Table*
- Pre-generated betting slips categorized by risk type (conservative, balanced, aggressive)
- JSONB field stores array of prop IDs with details for flexibility
- Tracks suggested bet amount (Kelly-calculated), status, and timestamps

*Bets Table*
- Individual bet records linking to props with outcome tracking
- Captures closing line value (CLV) for model validation
- Status lifecycle: pending → won/lost/pushed

*Performance Snapshots Table*
- Time-series tracking of key metrics: win rate, ROI, CLV%, total bets
- Enables historical performance analysis and charting

**Migration Strategy**
- Drizzle Kit configured for schema migrations (output to `/migrations`)
- `db:push` npm script for schema synchronization

### Authentication and Authorization

**Current Implementation**
- No authentication system implemented
- Single default user (userId: 1) hardcoded in frontend
- All API routes assume authenticated user context

**Future Considerations**
- Session-based authentication likely given express-session dependencies
- connect-pg-simple for PostgreSQL-backed session storage
- User isolation will require userId-based query filtering

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