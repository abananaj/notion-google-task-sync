# Google Tasks ↔️ Notion Sync

**Bidirectional sync** between Google Tasks and Notion. Runs every 15 minutes.

## How It Works

- Compares timestamps (`googleTask.updated` vs `notionTask.last_edited_time`)
- **Most recent change wins** - syncs in the appropriate direction
- Changes on either platform are reflected on the other

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
   npm run sync      # One-time bidirectional sync
   npm run schedule  # Auto-sync every 15 min
   ```

## Sync Behavior

- **Google task updated** → Changes pushed to Notion
- **Notion task updated** → Changes pushed to Google Tasks
- **Both updated** → Most recent timestamp wins
- **Already synced** → Skipped (no unnecessary API calls)

Supported changes:
- Task title
- Status (Not started ↔ needsAction, Done ↔ completed)
- Due date

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

