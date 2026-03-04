# Quick Deployment Guide for ezapimonitoring

## Repository Setup Complete ✅

Your local repository is initialized and ready. Follow these steps:

## Step 1: Push to GitHub

**Important:** Make sure you've created the repository `aravinthans-tech/ezapimonitoring` on GitHub first!

Then run:
```bash
git push -u origin main
```

If the repository already exists and has content, you might need to pull first:
```bash
git pull origin main --allow-unrelated-histories
git push -u origin main
```

## Step 2: Deploy to Vercel

### Option A: Via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New Project"**
3. Click **"Import Git Repository"**
4. Select **`aravinthans-tech/ezapimonitoring`**
5. Vercel will auto-detect:
   - Framework: **Other** (Static Site)
   - Build Command: Leave empty
   - Output Directory: Leave empty
6. Click **"Deploy"**
7. Wait 1-2 minutes for deployment
8. Your site will be live at: `https://ezapimonitoring.vercel.app` (or similar)

### Option B: Via Vercel CLI

```bash
npm install -g vercel
vercel login
vercel
```

When prompted:
- Set up and deploy? **Yes**
- Which scope? Select your account
- Link to existing project? **No** (first time)
- Project name? **ezapimonitoring** (or press Enter)
- Directory? Press Enter (use `./`)
- Override settings? **No**

For production:
```bash
vercel --prod
```

## Step 3: Configure Custom Domain (Optional)

1. Go to your project in Vercel dashboard
2. Navigate to **Settings** → **Domains**
3. Add your custom domain
4. Follow DNS configuration instructions

## Security Note ⚠️

Your `config.js` file contains API keys. If you want to keep them private:

1. Add `config.js` to `.gitignore`
2. Use Vercel Environment Variables:
   - Go to Project Settings → Environment Variables
   - Add variables like `APP_INSIGHTS_API_KEY`
   - Update `config.js` to read from environment variables (requires build step)

For now, since this is a static site, keeping `config.js` in the repo is fine if the repository is private.

## Automatic Deployments

- Every push to `main` branch = automatic production deployment
- Pull requests = preview deployments

## Troubleshooting

**Can't push to GitHub?**
- Make sure the repository exists on GitHub
- Check your GitHub credentials
- Verify the repository name: `aravinthans-tech/ezapimonitoring`

**404 Error on Vercel?**
- Check that `dashboard.html` is in the root
- Verify `vercel.json` exists

**Assets not loading?**
- Ensure all files are committed to git
- Check file paths in HTML (should be relative)

## Next Steps

1. ✅ Git initialized
2. ✅ Files committed
3. ✅ Remote added
4. ⏭️ Push to GitHub: `git push -u origin main`
5. ⏭️ Deploy to Vercel (follow Step 2 above)

Your project is ready! 🚀

