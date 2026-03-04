# Deploying to Vercel - Step by Step Guide

## Prerequisites
- A GitHub account (recommended) or GitLab/Bitbucket
- A Vercel account (free tier is sufficient)

## Method 1: Deploy via Vercel Dashboard (Recommended for Beginners)

### Step 1: Prepare Your Code
1. Make sure all your files are ready:
   - `dashboard.html`
   - `dashboard.js`
   - `dashboard.css`
   - `config.js`
   - `logo.png`
   - `package.json` (already created)
   - `vercel.json` (already created)

### Step 2: Push to GitHub
1. Create a new repository on GitHub
2. Initialize git in your project folder (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit - API Monitoring Tool"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

### Step 3: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Vercel will auto-detect the settings:
   - **Framework Preset**: Other (Static Site)
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: Leave empty or use `echo 'No build needed'`
   - **Output Directory**: Leave empty (Vercel will serve from root)
5. Click **"Deploy"**
6. Wait for deployment to complete (usually 1-2 minutes)
7. Your site will be live at: `https://your-project-name.vercel.app`

### Step 4: Configure Environment Variables (Optional)
If you want to keep your API keys secure:
1. Go to your project settings in Vercel
2. Navigate to **Environment Variables**
3. Add variables if needed (though for this static site, config.js is fine)

## Method 2: Deploy via Vercel CLI (For Developers)

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```

### Step 3: Deploy
Navigate to your project directory and run:
```bash
vercel
```

Follow the prompts:
- Set up and deploy? **Yes**
- Which scope? (Select your account)
- Link to existing project? **No** (for first deployment)
- Project name? (Press Enter for default or type a name)
- Directory? (Press Enter for `./`)
- Override settings? **No**

### Step 4: Production Deployment
After the preview deployment works, deploy to production:
```bash
vercel --prod
```

## Important Notes

### ⚠️ Security Warning
Your `config.js` file contains API keys. Consider:
- Using environment variables for sensitive data
- Adding `config.js` to `.gitignore` if you don't want to commit credentials
- Using Vercel Environment Variables for production

### 🔧 Configuration
- The `vercel.json` file is already configured to:
  - Serve `dashboard.html` as the main page
  - Handle all static assets correctly
  - Add security headers

### 📝 Custom Domain (Optional)
1. Go to your project settings in Vercel
2. Navigate to **Domains**
3. Add your custom domain
4. Follow DNS configuration instructions

### 🔄 Automatic Deployments
- Every push to your main branch will trigger a new deployment
- Vercel provides preview deployments for pull requests

### 🐛 Troubleshooting

**Issue: 404 Error**
- Make sure `dashboard.html` is in the root directory
- Check that `vercel.json` is correctly configured

**Issue: Assets not loading**
- Ensure all files (CSS, JS, images) are in the repository
- Check file paths in HTML (should be relative paths)

**Issue: CORS errors**
- Vercel handles CORS automatically for static sites
- If you see CORS errors, check your Application Insights API configuration

## Post-Deployment Checklist

- [ ] Test the dashboard loads correctly
- [ ] Verify all assets (CSS, JS, images) load
- [ ] Test API connections work
- [ ] Check mobile responsiveness
- [ ] Verify auto-refresh functionality
- [ ] Test all navigation links

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check browser console for errors
3. Verify all files are committed to git
4. Ensure `vercel.json` is in the root directory


