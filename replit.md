# AI Sports Betting Intelligence Platform

## Overview

Prop Machine is an AI-powered sports betting intelligence platform designed to assist users in making informed sports betting decisions. It leverages machine learning for prop analysis, confidence scoring, and integrates the Kelly criterion for bankroll management. The platform primarily focuses on NHL props but also supports NBA, NFL, and MLB. Key capabilities include automated slip generation, performance tracking, and closing line value (CLV) analysis to validate the model's effectiveness. The platform aims to provide a robust tool for users to gain an edge in sports betting by offering comprehensive prop coverage, multi-bookmaker line shopping, and features like a DFS Props view.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions

The frontend is built with React 18, TypeScript, and Vite. It uses Wouter for routing, TanStack Query for server state management, and shadcn/ui (based on Radix UI) for components, styled with Tailwind CSS. The design emphasizes productivity, financial clarity, progressive disclosure, and data hierarchy, using Inter for UI text and JetBrains Mono for numerical data. Form handling is managed by react-hook-form with Zod validation. A dedicated DFS Props page provides a clean UI for comparing DraftKings and FanDuel lines, displaying confidence scores, and offering smart filtering options.

### Technical Implementations

The backend uses Express.js and TypeScript on Node.js, featuring a RESTful API with Zod-based validation and comprehensive error handling. Routes are organized by resource (users, props, slips, bets, performance snapshots). A data access layer uses an `IStorage` interface, primarily implemented by `DbStorage` for PostgreSQL. Authentication is handled via Replit Auth or Google OAuth (for Railway deployments), with role-based access control. Prop coverage is optimized with configurable event limits and sport-specific market parameters, significantly increasing the number of available props. Decimal normalization is applied at the storage layer to ensure consistent data types.

### System Design Choices

The platform utilizes a PostgreSQL database with Drizzle ORM and the Neon serverless driver. The schema includes tables for Users (tracking bankroll, Kelly sizing, risk tolerance, isAdmin status), Props (ML-analyzed betting propositions with confidence scores, EV%, model probability, platform origin, and quarter/period specificity), Slips (pre-generated betting slips), Bets (individual bets with CLV tracking), and Performance Snapshots (time-series metrics). A robust seeding strategy is in place for initial data population. The system ensures session persistence across deployments and configures secure cookies for production environments.

**Real-Time Streaming Architecture**: The platform integrates OpticOdds API with production-ready SSE streaming for live odds updates and automated bet settlement. The `OpticOddsStreamService` handles real-time odds streaming with fixture caching for team name resolution, while `OpticOddsResultsStreamService` processes live game results and automatically grades bets with bankroll updates. The streaming system features: (1) **Fixture-Scoped Props** - props now store fixture_id and marketId from OpticOdds for accurate fixture-specific tracking; upsertProp matches by sport+platform+player+stat+line+direction+fixtureId to prevent cross-fixture conflicts; database index on fixture_id ensures efficient lookups; (2) **Fixture-Specific Bet Grading** - bet grading filters by fixture_id to prevent misgrading against props from different games; props without fixture_id are skipped with warning logs; (3) **Fixture Caching** - fetches and caches team names from active fixtures at stream start, eliminating "TBD" placeholders; (4) **Automatic Reconnection** - resumes from last_entry_id after disconnections with exponential backoff (max 5 attempts); (5) **Admin-Only Access** - all streaming control endpoints protected by requireAdmin middleware; (6) **Atomic Bet Settlement** - settleBetWithBankrollUpdate atomically updates bet status and user bankroll in transactions when games complete; (7) **Parallel Stream Management** - supports multiple concurrent streams for different sports/sportsbooks with independent lifecycle management. All API integrations feature parallel data fetching, proper sportsbook attribution, and robust error handling with batch-level retry logic.

**Critical Bug Fix (Nov 22, 2025)**: Fixed massive prop duplication issue in The Odds API refresh service. The service was using `createProp()` instead of `upsertProp()`, creating new props on every refresh instead of updating existing ones. This caused 275,277 NBA props to accumulate (253,947 from The Odds API alone), when only 3,474 unique props existed. Cleaned up 268,837 duplicate props. Current active prop counts: NFL ~15K, NHL ~9K, NBA ~7K. Dashboard and DFS Props limits increased to 20K and 10K per sport respectively to ensure complete coverage. Future refreshes will properly update existing props instead of creating duplicates.

## External Dependencies

-   **The Odds API**: Primary data source for player props across 8 traditional sportsbooks (DraftKings, FanDuel, Caesars, BetMGM, Fanatics, Bovada, BetOnline, BetRivers), providing extensive coverage for NFL, NBA, NHL, and MLB.
-   **OpticOdds API**: Integrated for Underdog Fantasy player props via SSE streaming, providing DFS-specific data with sportsbook-level attribution, parallel fetching, and comprehensive error handling. SSE-only access (REST API disabled).
-   **PrizePicks API**: Direct integration with PrizePicks projections API for NBA, NFL, and NHL player props. Provides comprehensive stat coverage including combo props (PRA, Points+Rebounds, etc.), quarter-specific props (1st 3 minutes), and specialty stats (dunks, faceoffs won, etc.). **Cache-Resilient Architecture**: Features persistent `prizepicks_snapshots` table caching successful API responses with 24hr TTL. On rate-limit (HTTP 429), system falls back to cached data or preserves existing active props, preventing data loss. Automatic cache population on successful fetches ensures continuous prop availability despite aggressive Cloudflare throttling. League IDs: NBA=7, NFL=2, NHL=8.
-   **ESPN API**: Primary source for player statistics and search across NBA, NHL, and NFL. NBA stats utilize v2 endpoint (`/v2/sports/basketball/leagues/nba/athletes/{playerId}/statistics`) with stats distributed across three categories: "offensive" (points, assists, 3PM), "general" (total rebounds), and "defensive" (steals, blocks). System searches all categories to ensure complete stat extraction. Also provides v3 statistics and live scoreboard data.
-   **Google OAuth**: Used for authentication in Railway production deployments.
-   **Replit Auth**: Default authentication provider in the Replit environment.
-   **PostgreSQL (Neon serverless driver)**: Database solution for data persistence.
-   **Drizzle ORM**: Type-safe ORM for database interactions.
-   **Radix UI**: For accessible, headless UI components.
-   **Recharts**: For data visualization.
-   **Zod**: For runtime schema validation and API contract enforcement.
-   **date-fns**: For date manipulation and formatting.
-   **Lucide React**: For icons.
-   **Passport.js**: For Google OAuth authentication.
-   **connect-pg-simple**: For PostgreSQL-backed session storage.