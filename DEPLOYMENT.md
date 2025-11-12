# Production Deployment Summary

## Changes Made for cPanel Production

### 1. **Updated `package.json`**

- Added proper description and author
- Updated scripts to use `app.js` instead of `scheduler.js`:
  - `npm run sync` - One-time sync
  - `npm run schedule` - Scheduled sync (every 15 min)
  - `npm start` - One-time sync
- Added keywords for better documentation

### 2. **Enhanced `app.js`**

- Added environment variable support:
  - `PORT` (default: 3000)
  - `NODE_ENV` (default: development)
  - `SYNC_INTERVAL_MINUTES` (default: 15)
- Improved logging with ISO timestamps
- Added sync duration tracking
- Added graceful shutdown handlers (SIGTERM, SIGINT)
- Configurable sync interval via environment variable

### 3. **Created `.htaccess`**

- Configured Apache/Passenger for Node.js hosting
- Set application root and startup file
- Production environment configuration
- **Note**: Update `USERNAME` placeholder with your actual cPanel username

### 4. **Created `.env.example`**

- Template for environment variables
- Includes all required configuration
- Safe to commit (no sensitive data)

### 5. **Updated `SETUP.md`**

- Added complete cPanel deployment guide
- Step-by-step instructions for:
  - File upload (SSH & File Manager)
  - Dependencies installation
  - OAuth setup
  - Application registration
  - Cron job configuration
- Production troubleshooting section
- Security best practices
- Update procedures

## Usage

### Local Development

```bash
# One-time sync
node app.js

# Scheduled sync (every 15 min)
node app.js --schedule
```

### Production (cPanel)

```bash
# Via cron job (recommended)
*/15 * * * * cd /home/USERNAME/notion-google-task-sync && node app.js

# Via built-in scheduler
nohup node app.js --schedule > sync.log 2>&1 &
```

## Environment Variables

Required in `.env` or cPanel Application Manager:

- `NOTION_API_KEY` - Notion integration token
- `NOTION_DATABASE_ID` - Target database ID
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth secret
- `NODE_ENV` - Set to `production` on server
- `SYNC_INTERVAL_MINUTES` - Sync frequency (default: 15)

## Next Steps

1. Update `.htaccess` with your cPanel username
2. Copy `.env.example` to `.env` and fill in credentials
3. Test locally: `node app.js`
4. Follow deployment steps in SETUP.md
5. Configure cron job or start scheduler
6. Monitor logs for successful syncs

## Files to Deploy

Upload these files to cPanel:

- `app.js` ✓
- `googleAuth.js`
- `googleTasksService.js`
- `notionService.js`
- `package.json` ✓
- `.htaccess` ✓ (update USERNAME)
- `.env` (create from .env.example)
- `credentials.json` (from Google Cloud Console)
- `token.json` (generated after first OAuth)

**Do NOT upload**:

- `node_modules/` (install via `npm install --production`)
- `.git/`
- `scheduler.js` (deprecated, functionality in app.js)

## Verified Working

✅ One-time sync tested successfully
✅ Environment variables loading correctly
✅ Timestamp logging working
✅ Duration tracking functional
✅ Graceful shutdown handlers added

