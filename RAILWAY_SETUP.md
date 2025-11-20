# Railway Production Deployment Setup

## Required Environment Variables

### Session & Security (REQUIRED)
```
# Session secret for cookie signing (generate a strong random string)
SESSION_SECRET=<generate-a-long-random-string-at-least-32-chars>

# Node environment
NODE_ENV=production
```

**Generate SESSION_SECRET:**
```bash
# Use one of these methods to generate a secure random string:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# or
openssl rand -hex 32
```

### Authentication (Google OAuth)
```
GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<your-google-oauth-client-secret>
GOOGLE_REDIRECT_URI=https://your-railway-domain.railway.app/api/auth/google/callback
```

**Important:** The app uses dual authentication:
- **Railway (Production)**: Requires Google OAuth (all three variables above)
- **Replit (Development)**: Uses built-in Replit Auth (no Google OAuth needed)

### Database (Neon PostgreSQL)
```
DATABASE_URL=postgresql://user:password@your-neon-host.neon.tech/database?sslmode=require
```

### External API Keys
```
# Required - The Odds API (Paid Tier) ✅ WORKING
ODDS_API_KEY=<your-odds-api-key>

# Required - BallDontLie API for NBA player search ✅ WORKING
BALLDONTLIE_API_KEY=<your-balldontlie-api-key>

# Optional - PrizePicks API ❌ CURRENTLY BLOCKED (returns 403)
# Note: PrizePicks blocks automated access - may need alternative approach

# Optional - Underdog Fantasy API ❌ CURRENTLY BLOCKED (returns 404)
# Note: Underdog endpoint unavailable - may need alternative approach
```

### Feature Flags
```
# Set to "false" or remove to enable automatic prop refresh every 15 minutes
DISABLE_PROP_SCHEDULER=true
```

## Complete Environment Variable Checklist

Copy this template and fill in your values:

```bash
# ===== REQUIRED - Session & Security =====
SESSION_SECRET=<your-32-char-random-string>
NODE_ENV=production

# ===== REQUIRED - Google OAuth (Railway only) =====
GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<your-google-oauth-client-secret>
GOOGLE_REDIRECT_URI=https://your-railway-domain.railway.app/api/auth/google/callback

# ===== REQUIRED - Database =====
DATABASE_URL=postgresql://user:password@your-neon-host.neon.tech/database?sslmode=require

# ===== REQUIRED - API Keys =====
ODDS_API_KEY=<your-odds-api-key>
BALLDONTLIE_API_KEY=<your-balldontlie-api-key>

# ===== OPTIONAL - Feature Flags =====
DISABLE_PROP_SCHEDULER=true
```

## Current Status

### ✅ Working Features
- Google OAuth authentication (Passport.js)
- PostgreSQL database (shared Neon instance with Replit)
- The Odds API integration (15,000+ NBA props, 1,100+ NHL props)
- BallDontLie API for NBA player search
- Dashboard, Slips, Bets CRUD operations
- Analytics and performance tracking
- User management

### ⚠️ Partially Working
- Prop ingestion: Works with The Odds API only (scheduler currently disabled)
- Live Scoreboard: Requires testing (ESPN API)
- Player Comparison: Requires testing (ESPN + BallDontLie)

### ❌ Not Working
- PrizePicks integration (API returns 403 Forbidden)
- Underdog Fantasy integration (API returns 404 Not Found)

## Recommended Configuration for Production

1. **Enable Prop Scheduler**:
   - Remove `DISABLE_PROP_SCHEDULER` or set to `false`
   - This enables automatic prop refresh every 15 minutes using The Odds API
   - Conserves API credits when disabled

2. **UI Graceful Degradation**:
   - Platform filters show only available platforms (The Odds API)
   - PrizePicks/Underdog show "temporarily unavailable" if no data exists
   - App remains functional with single data source

3. **Cost Management**:
   - The Odds API has usage limits (check your tier)
   - Scheduler frequency: 15 minutes = 96 requests/day
   - Consider increasing interval if hitting limits

## Testing Checklist

After deploying to Railway, verify:

- [ ] Google OAuth login works
- [ ] Dashboard loads with user data
- [ ] Props display (enable scheduler first)
- [ ] Slips can be created and placed
- [ ] Bets are tracked correctly
- [ ] Analytics page shows performance data
- [ ] Live Scoreboard displays games
- [ ] Player Comparison search works
- [ ] Notifications can be configured

## Troubleshooting

### "Not authenticated" errors
- Clear browser cookies for Railway domain
- Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set
- Check Google OAuth console: callback URL must match GOOGLE_REDIRECT_URI

### No props appearing
- Verify ODDS_API_KEY is set and valid
- Enable scheduler: remove DISABLE_PROP_SCHEDULER
- Check Railway logs for API errors
- Manually trigger refresh: POST /api/props/refresh/multi (admin only)

### Database errors
- Verify DATABASE_URL points to Neon instance
- Ensure database schema is pushed: `npm run db:push`
- Check Neon dashboard for connection limits

### Session/Cookie issues
- Railway uses HTTPS: cookies require `secure: true`
- `trust proxy: 1` must be set in Express (already configured)
- Clear browser cookies if switching between Replit and Railway
