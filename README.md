# Prop Machine - AI Sports Betting Intelligence Platform

An AI-powered sports betting intelligence platform that helps users make informed betting decisions through ML-driven prop analysis, confidence scoring, and Kelly criterion-based bankroll management.

## Features

### Core Functionality
- **ML Prop Analysis**: Real statistical analysis using BallDontLie, ESPN, and sports data APIs
- **Multi-Sport Support**: NHL, NBA, NFL, MLB prop betting
- **Confidence Scoring**: 0-100 confidence scores with detailed reasoning
- **Expected Value Calculation**: EV% and model probability for each prop
- **Kelly Criterion Bankroll Management**: Optimal bet sizing based on edge and risk tolerance

### Betting Features
- **Multi-Platform Props**: Integration with PrizePicks, Underdog Fantasy, The Odds API
- **Automated Slip Generation**: Conservative, balanced, and aggressive parlay recommendations
- **Bet Tracking**: Complete bet history with single props and multi-leg parlays
- **Closing Line Value (CLV) Analysis**: Validate model edge over time
- **Live Scoreboards**: Real-time game scores and updates

### Analytics & Insights
- **Performance Dashboards**: Win rate, ROI, total bets, bankroll trends
- **Line Movement Tracking**: Monitor odds changes across platforms
- **Cross-Platform Comparison**: Compare props from multiple sportsbooks
- **Player Comparison Tool**: Side-by-side stats for NHL, NBA, NFL players

### Admin Features (RBAC Protected)
- Manual bet settlement triggers
- Prop rescoring across active props
- Multi-platform prop refresh
- Integration API testing
- System statistics dashboard

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling and HMR
- **TanStack Query** (React Query) for server state
- **Wouter** for client-side routing
- **shadcn/ui** + Radix UI for component library
- **Tailwind CSS** for styling
- **Recharts** for data visualization

### Backend
- **Express.js** with TypeScript on Node.js
- **PostgreSQL** database (Neon serverless)
- **Drizzle ORM** for type-safe database queries
- **Passport.js** for authentication (Replit OAuth / Google OAuth)
- **Session-based auth** with express-session

### External APIs
- **PrizePicks API**: Player prop projections
- **Underdog Fantasy API**: Alternative prop source
- **The Odds API**: Sports betting odds (free tier: standard markets only)
- **BallDontLie API**: NBA player statistics
- **ESPN API**: NFL/NHL player data and stats
- **Discord Webhooks**: Notifications for high-value props

## Prerequisites

- Node.js 20.x or higher
- PostgreSQL database (Neon, Railway, or local)
- API Keys:
  - Google OAuth credentials (for Railway deployment)
  - The Odds API key (optional, for standard markets)

## Local Development

### 1. Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/prop-machine.git
cd prop-machine
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/prop_machine
NODE_ENV=development
SESSION_SECRET=your-secure-random-secret
```

For Google OAuth (Railway deployment):
```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
OAUTH_CALLBACK_URL=http://localhost:5000/api/auth/callback
```

For The Odds API (optional):
```env
ODDS_API_KEY=your-odds-api-key
```

### 4. Set Up Database

```bash
# Push Drizzle schema to database
npm run db:push
```

The application automatically seeds initial data on first run:
- Default admin user (seed-user-1)
- 28 sample props across all sports
- 3 sample slips (conservative, balanced, aggressive)
- 4 sample bets for testing

### 5. Start Development Server

```bash
npm run dev
```

Application runs on: http://localhost:5000

## Production Deployment

### Deploy to Railway

See [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md) for complete step-by-step guide.

**Quick Steps:**
1. Push code to GitHub
2. Create Railway project from GitHub repo
3. Add PostgreSQL database service
4. Configure environment variables
5. Deploy and generate public domain
6. Update OAuth callback URLs

### Deploy to Other Platforms

The application is compatible with any Node.js hosting platform:
- **Vercel**: Requires edge runtime configuration
- **Render**: Works out of the box
- **Fly.io**: Requires Dockerfile
- **Heroku**: Use buildpack for Node.js

**Requirements:**
- Node.js 20.x runtime
- PostgreSQL database
- Environment variables configured
- OAuth provider configured (Google, GitHub, etc.)

## Project Structure

```
prop-machine/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # React components (shadcn/ui)
│   │   ├── pages/          # Route pages
│   │   ├── lib/            # Utilities, query client
│   │   └── App.tsx         # Main app component
├── server/                 # Backend Express application
│   ├── auth/               # Authentication (Replit/Google OAuth)
│   ├── integrations/       # External API clients
│   ├── services/           # Business logic services
│   ├── routes.ts           # API route definitions
│   ├── storage.ts          # Database abstraction layer
│   ├── index.ts            # Express server entry point
│   └── seed.ts             # Database seeding
├── shared/                 # Shared types and schemas
│   └── schema.ts           # Drizzle database schema
├── migrations/             # Database migrations (auto-generated)
├── .env.example            # Environment variable template
├── RAILWAY_DEPLOYMENT.md   # Railway deployment guide
└── package.json            # Dependencies and scripts
```

## Available Scripts

```bash
# Development
npm run dev              # Start dev server (frontend + backend)
npm run check            # TypeScript type checking

# Production
npm run build            # Build for production
npm start                # Start production server

# Database
npm run db:push          # Push schema changes to database
npm run db:push -- --force  # Force push (data loss warning)
```

## Database Schema

### Users Table
- Tracks bankroll (current and initial)
- Kelly sizing multiplier and risk tolerance
- Admin role flag for RBAC

### Props Table
- ML-analyzed betting propositions
- Sport, player, team, opponent, stat type
- Confidence, EV%, model probability
- Platform tracking and active state

### Slips Table
- Pre-generated betting slips by risk type
- JSONB picks field with complete prop details
- Suggested bet amounts and potential returns

### Bets Table
- Individual bet records (single or parlay)
- Links to props OR slips (dual tracking)
- CLV tracking for model validation
- Status lifecycle: pending → won/lost/pushed

### Performance Snapshots Table
- Time-series metrics: win rate, ROI, CLV%
- Historical performance analysis

## Authentication

### Replit Platform (Default)
- Uses Replit OAuth automatically
- No configuration needed on Replit

### Railway/Other Platforms
- Requires Google OAuth setup
- Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OAUTH_CALLBACK_URL`
- Automatically switches when Google credentials detected

### Admin Access
- Seed user (seed-user-1) has admin privileges
- New users default to non-admin role
- Admin routes protected by RBAC middleware

## API Integration Status

### Working Integrations
✅ **PrizePicks**: Fetches player props across all sports  
✅ **Underdog Fantasy**: Alternative prop source  
✅ **BallDontLie**: NBA player statistics  
✅ **ESPN**: NFL/NHL player data (v3 search works, v2 stats may 404 on free tier)  
✅ **Discord Webhooks**: Notifications for high-confidence props  

### Limited/Paid
⚠️ **The Odds API**: Free tier supports standard markets only (h2h, spreads, totals). Player props require paid subscription ($50-100/month). Code ready to activate when upgraded.

## Known Limitations

### ESPN API
- Player search (v3) works reliably (5000 NFL, 2000 NHL players)
- Stats endpoints (v2) may return 404 for some players (free tier limitation)
- Application handles 404s gracefully with zero stats fallback

### The Odds API
- Free tier does NOT include player props
- Standard markets (spreads, totals, moneylines) work
- Player prop fetching code implemented but commented out

### Session Storage
- Currently uses in-memory sessions (lost on restart)
- Can be upgraded to PostgreSQL session store for persistence

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Open a GitHub issue
- Check [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md) for deployment help
- Review inline code documentation

## Roadmap

- [ ] Persistent session store (PostgreSQL-backed)
- [ ] Email/password authentication option
- [ ] Custom domain support documentation
- [ ] Enhanced Discord notifications with bet slip embeds
- [ ] Weather integration for NFL betting
- [ ] Advanced analytics: Sharp/public money tracking
- [ ] Mobile-responsive improvements
- [ ] Real-time prop updates via WebSocket
- [ ] Bet export to CSV/PDF
- [ ] Multi-user competition leaderboards

---

**Built with ❤️ for smarter sports betting**
