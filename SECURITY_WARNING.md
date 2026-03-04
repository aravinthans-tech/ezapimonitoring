# ⚠️ IMPORTANT SECURITY NOTICE

## API Key Exposure in Git History

**Your API key was committed to Git history in the initial commit.**

Even though we've now:
- ✅ Added `config.js` to `.gitignore`
- ✅ Created a build script using environment variables
- ✅ Removed keys from current files

**The API key is still visible in your Git history** and can be accessed by anyone who has access to your repository.

## Immediate Actions Required

### 1. **ROTATE YOUR API KEY** (CRITICAL)
Since the key is in Git history, you MUST rotate it:

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your **Application Insights** resource
3. Go to **API Access** (under Configure section)
4. **Delete the old API key** that was exposed: `su40571zh7m25yt2exnri8tf6zzpu2rutoxbaasy`
5. **Create a new API key** with the same permissions
6. Update the new key in **Vercel Environment Variables**

### 2. Check Repository Visibility
- If your repository is **PUBLIC**: Make it **PRIVATE** immediately
- Go to: https://github.com/aravinthans-tech/ezapimonitoring/settings
- Scroll to "Danger Zone" → Change repository visibility to Private

### 3. Clean Git History (Optional but Recommended)
If you want to remove the key from Git history completely:

**Option A: Using git filter-repo (Recommended)**
```bash
# Install git-filter-repo first
pip install git-filter-repo

# Remove the key from all history
git filter-repo --replace-text <(echo "su40571zh7m25yt2exnri8tf6zzpu2rutoxbaasy==>REDACTED")
```

**Option B: Force push after cleaning (WARNING: Rewrites history)**
```bash
# This will rewrite history - coordinate with team first
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch config.js" \
  --prune-empty --tag-name-filter cat -- --all

git push origin --force --all
```

⚠️ **Warning**: Rewriting Git history will affect anyone who has cloned the repository.

### 4. Update Vercel Environment Variables
After rotating the key:
1. Go to Vercel → Your Project → Settings → Environment Variables
2. Update `TRIAL_APP_INSIGHTS_API_KEY` with the new key
3. Redeploy your application

## Current Security Status

- ✅ `config.js` is now in `.gitignore` (won't be committed)
- ✅ Build script uses environment variables
- ✅ Keys removed from documentation files
- ⚠️ **API key still in Git history** (needs rotation)
- ⚠️ **Repository visibility** (check if public/private)

## Best Practices Going Forward

1. **Never commit API keys** to version control
2. **Always use environment variables** for secrets
3. **Keep repositories private** if they contain any sensitive info
4. **Rotate keys immediately** if exposed
5. **Use `.gitignore`** for any files containing secrets

## Verification

After rotating the key, verify:
- [ ] Old API key deleted in Azure
- [ ] New API key created and added to Vercel
- [ ] Repository is private (if it was public)
- [ ] Application works with new key
- [ ] No keys visible in current codebase

---

**Remember**: Even if you clean Git history, if the repository was public, the key may have been indexed by search engines or cached. Always rotate exposed keys immediately.

