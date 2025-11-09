# Google Tasks → Notion Sync

One-way sync from Google Tasks to Notion. Runs every 15 minutes.

## Quick Start

1. **Get Google credentials**

   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create project → Enable "Google Tasks API"
   - Create OAuth credentials (Desktop app)
   - Download as `credentials.json`

2. **Get Notion credentials**

   - Go to [Notion Developers](https://www.notion.so/my-integrations)
   - Create integration → Copy token
   - Create database with: `Title`, `Status`, `Due Date`, `Google Task ID`
   - Share database with your integration

3. **Setup**

   ```bash
   npm install

   # Create .env file
   echo "NOTION_API_KEY=your_key_here" > .env
   echo "NOTION_DATABASE_ID=your_db_id_here" >> .env
   ```

4. **Run**
   ```bash
   npm run sync      # One-time sync (first run opens browser for auth)
   npm run schedule  # Auto-sync every 15 min
   ```

## That's it

- First sync opens browser for Google login
- Token saved to `token.json` (auto-refreshed)
- If auth fails: `rm token.json && npm run sync`

## Files

- `sync.js` - Main sync logic
- `googleAuth.js` - Google OAuth
- `googleTasksService.js` - Fetch Google tasks
- `notionService.js` - Update Notion
- `scheduler.js` - Runs sync every 15 min

See [SETUP.md](SETUP.md) for troubleshooting.

