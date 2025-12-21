# Prop Ingestion Guide

This guide explains how to set up and run browser-based prop ingestion for Underdog and PrizePicks.

## Overview

The ingestion system uses Playwright to scrape props directly from the platforms' websites. Authentication state is stored in JSON files that persist sessions across runs.

## Local Setup

### 1. Generate Authentication State

First, you need to generate authentication state files by logging in manually:

#### Underdog
```bash
npx tsx scripts/auth-underdog.ts
```

This will:
- Open a headed browser window
- Navigate to Underdog Fantasy
- Wait for you to log in manually
- Save the authentication state to `.storage/underdog.storage.json`

#### PrizePicks
```bash
npx tsx scripts/auth-prizepicks.ts
```

This will:
- Open a headed browser window
- Navigate to PrizePicks
- Wait for you to log in manually
- Save the authentication state to `.storage/prizepicks.storage.json`

### 2. Verify Storage Files

After running the auth scripts, verify that the storage files were created:

```bash
ls -la .storage/
# Should show:
# - underdog.storage.json
# - prizepicks.storage.json
```

These files contain cookies and localStorage data needed to authenticate on subsequent runs.

## Production Setup (Railway)

### 1. Set Environment Variables

In Railway, configure the following environment variables:

```bash
# Browser mode (always headless in production)
SCRAPE_HEADLESS=true

# Storage directory (should point to mounted volume)
SCRAPE_STORAGE_DIR=/app/.storage

# Optional: Enable debug mode to capture HTML/screenshots on errors
SCRAPE_DEBUG=false

# Optional: Custom storage state file names
UNDERDOG_STORAGE_STATE=underdog.storage.json
PRIZEPICKS_STORAGE_STATE=prizepicks.storage.json

# Enable bootstrap ingestion on startup
ENABLE_PROP_BOOTSTRAP=true
```

### 2. Upload Storage State Files

Upload the authentication state files to Railway:

1. **Option A: Use Railway Volume**
   - Create a volume in Railway
   - Mount it to `/app/.storage`
   - Upload `underdog.storage.json` and `prizepicks.storage.json` to the volume

2. **Option B: Use Railway Secrets**
   - Copy contents of storage files
   - Create secrets for `UNDERDOG_STORAGE_STATE_CONTENT` and `PRIZEPICKS_STORAGE_STATE_CONTENT`
   - Write them to files on startup (requires custom startup script)

### 3. Verify Configuration

After deployment, check logs to ensure:
- Storage state files are loaded correctly
- Browser launches in headless mode
- Scrapers can authenticate

## Running Ingestion

### Manual Trigger (Recommended)

Use the admin endpoints to trigger ingestion manually:

#### Ingest All Platforms
```bash
curl -X POST http://your-domain/api/admin/ingest/props \
  -H "Cookie: your-session-cookie" \
  -H "Content-Type: application/json"
```

#### Ingest Underdog Only
```bash
curl -X POST http://your-domain/api/admin/ingest/underdog \
  -H "Cookie: your-session-cookie" \
  -H "Content-Type: application/json"
```

#### Ingest PrizePicks Only
```bash
curl -X POST http://your-domain/api/admin/ingest/prizepicks \
  -H "Cookie: your-session-cookie" \
  -H "Content-Type: application/json"
```

### Automatic Bootstrap

If `ENABLE_PROP_BOOTSTRAP=true`, ingestion will run automatically on startup if the props table is empty.

## Response Format

All endpoints return JSON in this format:

```json
{
  "ok": true,
  "platforms": {
    "Underdog": {
      "platform": "Underdog",
      "sportCounts": {
        "NBA": 50,
        "NFL": 30
      },
      "inserted": 80,
      "updated": 0,
      "totalNormalized": 80,
      "errors": []
    },
    "PrizePicks": {
      "platform": "PrizePicks",
      "sportCounts": {
        "NBA": 45,
        "NHL": 25
      },
      "inserted": 70,
      "updated": 0,
      "totalNormalized": 70,
      "errors": []
    }
  },
  "totals": {
    "inserted": 150,
    "updated": 0,
    "totalNormalized": 150
  }
}
```

## Debugging

### Enable Debug Mode

Set `SCRAPE_DEBUG=true` to enable debug artifact collection. When enabled, failed scrapes will save:

- `scrape_debug/<platform>/<timestamp>/page.html` - Full page HTML
- `scrape_debug/<platform>/<timestamp>/screenshot.png` - Full page screenshot
- `scrape_debug/<platform>/<timestamp>/console.log` - Console logs
- `scrape_debug/<platform>/<timestamp>/extracted-items.json` - Sample of extracted items

### Common Issues

#### No Props Scraped

**Symptoms:** `inserted: 0` in response

**Possible causes:**
1. Authentication state expired - re-run auth scripts
2. Selectors changed - check debug artifacts
3. Site structure changed - update selectors in scraper files

**Solution:**
- Enable `SCRAPE_DEBUG=true` and check debug artifacts
- Re-run auth scripts to refresh authentication
- Check scraper logs for selector errors

#### Authentication Failed

**Symptoms:** Errors about login or redirect to login page

**Solution:**
- Re-run auth scripts locally
- Upload fresh storage state files to Railway
- Check that storage state files are in the correct location

#### Selectors Not Found

**Symptoms:** Warnings about selectors not matching

**Solution:**
- Enable debug mode to capture HTML snapshot
- Inspect the page HTML to find correct selectors
- Update selectors in `server/scrapers/underdog.ts` or `server/scrapers/prizepicks.ts`

## Architecture

### Scrapers

- `server/scrapers/browser.ts` - Browser context management and storage state handling
- `server/scrapers/normalize.ts` - Prop normalization utilities
- `server/scrapers/underdog.ts` - Underdog scraper implementation
- `server/scrapers/prizepicks.ts` - PrizePicks scraper implementation
- `server/scrapers/index.ts` - Exports

### Jobs

- `server/jobs/ingestUnderdog.ts` - Underdog ingestion job
- `server/jobs/ingestPrizePicks.ts` - PrizePicks ingestion job
- `server/jobs/ingestAllProps.ts` - Orchestrates all ingestion jobs

### Endpoints

- `POST /api/admin/ingest/props` - Ingest all platforms
- `POST /api/admin/ingest/underdog` - Ingest Underdog only
- `POST /api/admin/ingest/prizepicks` - Ingest PrizePicks only

All endpoints require admin authentication.

## Database

Props are inserted into the `props` table with the following strategy:

1. **Delete existing props** for the platform before inserting new ones
2. **Deduplicate** using natural keys (platform + sport + player + stat + line + gameTime + team + opponent)
3. **Only use safe columns** - no references to `external_id` or `updated_at`

## Verification

After ingestion, verify props appear in the dashboard:

1. Check database: `SELECT COUNT(*) FROM props;`
2. Check by platform: `SELECT platform, COUNT(*) FROM props GROUP BY platform;`
3. Check by sport: `SELECT sport, COUNT(*) FROM props GROUP BY sport;`
4. Visit the dashboard - props should appear automatically

## Troubleshooting Checklist

- [ ] Storage state files exist in `.storage/` directory
- [ ] `SCRAPE_STORAGE_DIR` is set correctly
- [ ] `SCRAPE_HEADLESS=true` in production
- [ ] Browser binaries are installed (handled by postinstall script)
- [ ] Admin authentication is working
- [ ] Debug artifacts are being generated (if `SCRAPE_DEBUG=true`)
- [ ] Selectors are up-to-date with current site structure
- [ ] Storage state files are not expired (re-run auth scripts if needed)

