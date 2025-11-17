# Railway Deployment Guide for Prop Machine

This guide will walk you through deploying Prop Machine to Railway platform.

## Prerequisites

- GitHub account
- Railway account (sign up at [railway.app](https://railway.app))
- Google OAuth credentials (for authentication)

---

## Part 1: Prepare Your Code

### 1. Document Current State

Your current Replit environment uses:
- **Database**: PostgreSQL (Neon)
- **Auth**: Replit OAuth (needs replacement)
- **API Keys**: ODDS_API_KEY
- **Session Storage**: In-memory (will persist with Railway PostgreSQL)

---

## Part 2: Push to GitHub

### Option A: Using Replit UI (Recommended)

1. **Open Version Control Tab**
   - Click the Version Control icon in Replit sidebar
   - Click "Initialize a Git repository" if not already done

2. **Connect to GitHub**
   - Click "Connect to GitHub"
   - Create a new repository (e.g., `prop-machine`)
   - Authorize Replit to access your GitHub account

3. **Push Your Code**
   - Commit all changes with message: "Prepare for Railway deployment"
   - Click "Push to GitHub"

### Option B: Using Command Line

```bash
# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Prepare for Railway deployment"

# Create new repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/prop-machine.git
git branch -M main
git push -u origin main
```

---

## Part 3: Set Up Google OAuth

Before deploying, you need OAuth credentials for authentication.

### 1. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure OAuth consent screen (if first time)
6. Choose **Web application**
7. Add authorized redirect URIs:
   ```
   http://localhost:5000/api/auth/callback
   https://your-app.up.railway.app/api/auth/callback
   ```
   (You'll update the Railway URL after deployment)

8. Save your **Client ID** and **Client Secret**

---

## Part 4: Deploy to Railway

### 1. Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Click "Start a New Project" or "Login"
3. Sign in with your **GitHub account**
4. Authorize Railway to access your repositories

### 2. Create New Project

1. Click **New Project** in Railway dashboard
2. Select **Deploy from GitHub repo**
3. Choose your `prop-machine` repository
4. Railway will detect it as a Node.js project

### 3. Add PostgreSQL Database

1. In your Railway project, click **New**
2. Select **Database** → **PostgreSQL**
3. Railway will automatically create the database
4. The `DATABASE_URL` environment variable is auto-injected

### 4. Configure Environment Variables

1. Click on your service (Node.js app) in the project canvas
2. Go to **Variables** tab
3. Add the following variables:

```bash
NODE_ENV=production
SESSION_SECRET=<generate-random-secret-here>
GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<your-google-oauth-client-secret>
OAUTH_CALLBACK_URL=https://your-app.up.railway.app/api/auth/callback
ODDS_API_KEY=<your-odds-api-key>
```

**Generate SESSION_SECRET:**
```bash
# In terminal, run:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Deploy

1. Railway automatically starts building and deploying
2. Watch build logs in the **Deployments** tab
3. Build typically takes 2-5 minutes
4. Wait for "Success" status

### 6. Generate Public Domain

1. Click on your service → **Settings** tab
2. Scroll to **Networking** section
3. Click **Generate Domain**
4. You'll get a URL like: `https://prop-machine-production.up.railway.app`

### 7. Update OAuth Callback URL

1. **Update Google OAuth Console:**
   - Go back to Google Cloud Console → Credentials
   - Edit your OAuth 2.0 Client ID
   - Add your Railway domain to authorized redirect URIs:
     ```
     https://your-app.up.railway.app/api/auth/callback
     ```

2. **Update Railway Environment Variable:**
   - In Railway Variables, update `OAUTH_CALLBACK_URL` with your actual domain

3. **Redeploy** (if needed):
   - Railway auto-redeploys on variable changes

---

## Part 5: Run Database Migrations

### 1. Access Railway Shell

1. In Railway, click on your service
2. Go to **Deployments** tab
3. Click on latest deployment → **View Logs**
4. Or use Railway CLI (recommended)

### 2. Install Railway CLI (Optional but Recommended)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migrations
railway run npm run db:push
```

### 3. Alternative: Run via Deployment

The app automatically runs `seedDatabase()` on startup, which will:
- Create all tables via Drizzle schema
- Seed initial data (admin user, sample props)

**Verify in logs:**
```
Database already seeded
```

---

## Part 6: Test Your Deployment

### 1. Access Your App

Navigate to your Railway domain: `https://your-app.up.railway.app`

### 2. Test Authentication

1. Click **Login** button
2. Should redirect to Google OAuth
3. Authorize the application
4. Redirects back to dashboard

### 3. Test Core Features

- ✅ Props loading (NHL, NBA, NFL, MLB)
- ✅ Player comparison tool
- ✅ Bet placement and tracking
- ✅ Live scores
- ✅ Admin panel (if admin user)

---

## Part 7: Set Up Continuous Deployment

Railway automatically redeploys when you push to GitHub:

```bash
# Make changes locally
git add .
git commit -m "Update feature X"
git push

# Railway detects push and redeploys automatically
```

---

## Part 8: (Optional) Migrate Existing Data

If you want to keep your Replit database data:

### 1. Export from Neon (Replit Database)

```bash
# Get your Replit DATABASE_URL from environment
# In Replit shell:
pg_dump $DATABASE_URL > backup.sql
```

### 2. Import to Railway PostgreSQL

```bash
# Install Railway CLI
railway login
railway link

# Get Railway database URL
railway variables

# Import data
psql <RAILWAY_DATABASE_URL> < backup.sql
```

---

## Common Issues & Solutions

### Build Fails

**Problem:** Railway build fails
**Solution:** 
- Check build logs for specific errors
- Ensure `package.json` has correct scripts:
  ```json
  {
    "scripts": {
      "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
      "start": "NODE_ENV=production node dist/index.js"
    }
  }
  ```

### App Won't Start

**Problem:** App starts but shows errors
**Solution:**
- Verify all environment variables are set correctly
- Check that `DATABASE_URL` is properly configured
- Review deployment logs for specific error messages

### Auth Not Working

**Problem:** Login fails or redirects incorrectly
**Solution:**
- Double-check Google OAuth redirect URIs match your Railway domain
- Verify `OAUTH_CALLBACK_URL` environment variable is correct
- Ensure `SESSION_SECRET` is set

### Database Connection Fails

**Problem:** Can't connect to PostgreSQL
**Solution:**
- Verify Railway PostgreSQL service is running
- Check `DATABASE_URL` is injected by Railway
- Review connection logs in deployment tab

### 404 on Routes

**Problem:** API routes return 404
**Solution:**
- Ensure production build is serving static files correctly
- Check `server/index.ts` has proper static file serving for production

---

## Railway Configuration Files

### `.railwayignore` (Optional)

Create this file to exclude files from deployment:

```
node_modules
.git
.env
*.log
.replit
replit.nix
```

### `railway.toml` (Optional)

For custom build/start commands:

```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm start"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

---

## Cost Considerations

### Railway Pricing (as of 2025)

- **Hobby Plan**: $5/month
  - 512 MB RAM
  - 1 GB disk
  - $5 usage credit included
  - Good for testing and small apps

- **Pro Plan**: $20/month
  - 8 GB RAM
  - 100 GB disk  
  - $20 usage credit included
  - Better for production

**Database costs:**
- PostgreSQL: ~$1-5/month depending on usage
- Bandwidth: Metered after free tier

---

## Next Steps

After successful deployment:

1. **Monitor Application**
   - Check Railway metrics dashboard
   - Review deployment logs regularly
   - Set up error tracking (optional: Sentry integration)

2. **Custom Domain** (Optional)
   - Purchase domain from registrar
   - In Railway Settings → Networking → Add custom domain
   - Update DNS records as instructed

3. **Scaling** (When Needed)
   - Upgrade Railway plan for more resources
   - Add replicas for high availability
   - Optimize database queries for performance

4. **Backups**
   - Railway provides automatic PostgreSQL backups
   - Consider additional backup strategy for critical data

---

## Support & Resources

- **Railway Docs**: [docs.railway.com](https://docs.railway.com)
- **Railway Discord**: [Community support](https://discord.gg/railway)
- **Google OAuth Setup**: [Google Identity Platform](https://developers.google.com/identity)
- **Prop Machine Issues**: Create issue in GitHub repository

---

## Summary Checklist

- [ ] Code pushed to GitHub
- [ ] Railway account created and linked to GitHub
- [ ] PostgreSQL database added to Railway project
- [ ] Environment variables configured
- [ ] Google OAuth credentials created and configured
- [ ] App successfully deployed
- [ ] Public domain generated
- [ ] Database migrations completed
- [ ] Authentication tested and working
- [ ] Core features verified (props, betting, tracking)
- [ ] Continuous deployment working (push to GitHub triggers redeploy)

**Congratulations! Your Prop Machine is now live on Railway! 🚀**
