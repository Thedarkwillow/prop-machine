# Quick Start: Deploy to Railway

This is a condensed guide to get your Prop Machine app running on Railway in under 15 minutes.

## Prerequisites
- GitHub account
- Google Cloud Console account (for OAuth)

---

## Step 1: Get Google OAuth Credentials (5 minutes)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Choose **Web application**
6. Add authorized redirect URIs:
   ```
   http://localhost:5000/api/auth/callback
   https://your-app.up.railway.app/api/auth/callback
   ```
   (You'll update the Railway URL after deployment)
7. Copy **Client ID** and **Client Secret**

---

## Step 2: Push to GitHub (3 minutes)

### Using Replit UI (Easiest):
1. Open **Version Control** tab in Replit sidebar
2. Click "Initialize a Git repository" (if not already done)
3. Click "Connect to GitHub"
4. Create new repository: `prop-machine`
5. Push all changes

### Using Command Line:
```bash
git init
git add .
git commit -m "Prepare for Railway deployment"
git remote add origin https://github.com/YOUR_USERNAME/prop-machine.git
git branch -M main
git push -u origin main
```

---

## Step 3: Deploy to Railway (5 minutes)

1. Go to [railway.app](https://railway.app)
2. Sign in with **GitHub**
3. Click **New Project**
4. Select **Deploy from GitHub repo**
5. Choose `prop-machine` repository
6. Click **Add variables** (before deploying)

### Add Environment Variables:

```bash
NODE_ENV=production
SESSION_SECRET=<run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<your-google-oauth-client-secret>
OAUTH_CALLBACK_URL=https://your-app.up.railway.app/api/auth/callback
ODDS_API_KEY=<your-odds-api-key-if-you-have-one>
```

**Generate SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

7. Click **Deploy Now**

---

## Step 4: Add PostgreSQL Database (2 minutes)

1. In your Railway project, click **New**
2. Select **Database** → **PostgreSQL**
3. Railway auto-injects `DATABASE_URL` environment variable
4. Wait for database to provision

---

## Step 5: Generate Public Domain (1 minute)

1. Click on your service (Node.js app) → **Settings** tab
2. Scroll to **Networking** section
3. Click **Generate Domain**
4. You'll get: `https://prop-machine-production.up.railway.app`

---

## Step 6: Update OAuth Callback URL (2 minutes)

1. **Update Google Cloud Console:**
   - Go back to your OAuth 2.0 Client ID
   - Add your Railway domain to authorized redirect URIs:
     ```
     https://prop-machine-production.up.railway.app/api/auth/callback
     ```

2. **Update Railway Environment Variable:**
   - In Railway Variables, update `OAUTH_CALLBACK_URL`:
     ```
     https://prop-machine-production.up.railway.app/api/auth/callback
     ```

3. Railway auto-redeploys on variable changes

---

## Step 7: Run Database Migrations (1 minute)

The app automatically runs `seedDatabase()` on startup, which:
- Creates all tables via Drizzle schema
- Seeds initial data (admin user, sample props)

**Verify in deployment logs:**
```
🔐 Using Google OAuth
Database already seeded
```

---

## Step 8: Test Your App (2 minutes)

1. Navigate to your Railway domain
2. Click **Login** button
3. Sign in with Google
4. Verify:
   - ✅ Props loading
   - ✅ Player comparison works
   - ✅ Bet placement functions
   - ✅ Admin panel (if admin user)

---

## Troubleshooting

### Build Fails
- Check Railway deployment logs
- Verify `package.json` has `build` and `start` scripts

### Auth Not Working
- Verify Google OAuth callback URLs match Railway domain exactly
- Check `OAUTH_CALLBACK_URL` environment variable is correct
- Ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set

### Database Connection Fails
- Verify PostgreSQL service is running in Railway
- Check `DATABASE_URL` is injected by Railway (auto-generated)

### App Won't Start
- Review deployment logs for specific errors
- Ensure all required environment variables are set
- Check that `PORT` is not manually set (Railway provides this)

---

## Next Steps

### Continuous Deployment (Automatic)
Railway auto-redeploys when you push to GitHub:
```bash
git add .
git commit -m "Update feature"
git push
```

### Custom Domain (Optional)
1. Purchase domain from registrar
2. In Railway **Settings** → **Networking** → Add custom domain
3. Update DNS records as instructed
4. Update Google OAuth redirect URIs with new domain

### Monitor Application
- Check Railway metrics dashboard
- Review deployment logs regularly
- Set up error tracking (optional: Sentry)

---

## Cost Estimate

**Railway Hobby Plan**: $5/month
- 512 MB RAM, 1 GB disk
- Includes $5 usage credit
- Good for testing and small apps

**Railway Pro Plan**: $20/month
- 8 GB RAM, 100 GB disk
- Includes $20 usage credit
- Better for production

**Database**: ~$1-5/month depending on usage

---

## Support

For detailed step-by-step guide, see [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md)

For issues:
- Check Railway deployment logs
- Review [Railway Docs](https://docs.railway.com)
- Open GitHub issue

---

**That's it! Your Prop Machine is now live on Railway! 🚀**
