# Environment Variables Setup Guide

## For Vercel Deployment

Add these environment variables in your Vercel project settings:

1. Go to your Vercel project: https://vercel.com/dashboard
2. Select your project: `ezapimonitoring`
3. Go to **Settings** → **Environment Variables**
4. Add each variable below:

### Required Environment Variables

| Variable Name | Value | Environments |
|--------------|-------|--------------|
| `TRIAL_APP_INSIGHTS_APP_ID` | `7c0154d5-8cec-4d11-b94d-bb10295b9436` | Production, Preview, Development |
| `TRIAL_APP_INSIGHTS_API_KEY` | `YOUR_TRIAL_API_KEY` | Production, Preview, Development |
| `LIVE_APP_INSIGHTS_APP_ID` | `YOUR_LIVE_APPLICATION_ID` | Production, Preview, Development |
| `LIVE_APP_INSIGHTS_API_KEY` | `YOUR_LIVE_API_KEY` | Production, Preview, Development |
| `APP_INSIGHTS_ENVIRONMENT` | `trial` | Production, Preview, Development |
| `REFRESH_INTERVAL` | `300000` | Production, Preview, Development |
| `ELASTICSEARCH_URL` | `http://localhost:9200` | Production, Preview, Development |
| `ELASTICSEARCH_INDEX` | `api-monitoring` | Production, Preview, Development |

**Important:** Select all three environments (Production, Preview, Development) for each variable.

## For Local Development

Create a `.env.local` file in your project root (this file is already in `.gitignore`):

```bash
# Application Insights - Trial Environment
TRIAL_APP_INSIGHTS_APP_ID=7c0154d5-8cec-4d11-b94d-bb10295b9436
TRIAL_APP_INSIGHTS_API_KEY=YOUR_TRIAL_API_KEY

# Application Insights - Live Environment
LIVE_APP_INSIGHTS_APP_ID=YOUR_LIVE_APPLICATION_ID
LIVE_APP_INSIGHTS_API_KEY=YOUR_LIVE_API_KEY

# Application Insights Environment (trial or live)
APP_INSIGHTS_ENVIRONMENT=trial

# Refresh interval in milliseconds (300000 = 5 minutes)
REFRESH_INTERVAL=300000

# Elasticsearch Configuration (for On-Premise mode)
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_INDEX=api-monitoring
```

Then run:
```bash
npm run build
```

This will generate `config.js` from your environment variables.

## Security Notes

✅ **API keys are now secure:**
- Not committed to Git (config.js is in .gitignore)
- Stored securely in Vercel Environment Variables
- Generated at build time from environment variables
- Can be rotated without code changes

## After Setting Up Environment Variables

1. Commit and push your changes:
   ```bash
   git add .
   git commit -m "Move config to environment variables"
   git push
   ```

2. Vercel will automatically:
   - Detect the push
   - Run `npm run build` (which generates config.js)
   - Deploy with your secure environment variables

3. Your dashboard will be live with secure configuration! 🚀

