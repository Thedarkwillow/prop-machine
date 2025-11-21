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

The platform utilizes a PostgreSQL database with Drizzle ORM and the Neon serverless driver. The schema includes tables for Users (tracking bankroll, Kelly sizing, risk tolerance, isAdmin status), Props (ML-analyzed betting propositions with confidence scores, EV%, model probability, platform origin, and quarter/period specificity), Slips (pre-generated betting slips), Bets (individual bets with CLV tracking), and Performance Snapshots (time-series metrics). A robust seeding strategy is in place for initial data population. The system ensures session persistence across deployments and configures secure cookies for production environments. PrizePicks integration has been abandoned due to bot protection and the superior alternative offered by The Odds API.

## External Dependencies

-   **The Odds API**: Primary and sole data source for player props across 8 bookmakers (DraftKings, FanDuel, Caesars, BetMGM, Fanatics, Bovada, BetOnline, BetRivers), providing extensive coverage for NFL, NBA, and NHL.
-   **BallDontLie API**: Integrated for NBA player search and statistics.
-   **ESPN API**: Used for player search (NHL, NFL), statistics (v2 and v3), and live scoreboard data across major sports (NBA, NHL, NFL, MLB).
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