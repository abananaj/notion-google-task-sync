add deployment instructions and troubleshooting section# Copilot Instructions: Notion-Google Tasks Integration

## Project Overview
This is a **bidirectional sync** system between Google Tasks and Notion databases. **Current implementation** is one-way (Google→Notion) with scheduled sync every 15 minutes. The spec defines the full bidirectional architecture (see `spec.md`).

## Architecture & Data Flow

### Current Implementation (One-Way)
The codebase uses a clean separation of concerns across 6 main modules:

1. **`sync.js`** - Orchestration layer that coordinates the sync workflow
2. **`googleTasksService.js`** - Google Tasks API wrapper (fetches all tasks across all task lists)
3. **`notionService.js`** - Notion API wrapper (CRUD operations on database pages)
4. **`googleAuth.js`** - OAuth2 authentication with token persistence to `token.json`
5. **`scheduler.js`** - Cron job runner (runs sync every 15 minutes)
6. **`server.js`** - Express server for OAuth callback flow (port 3000)

### Target Architecture (from spec.md)
The specification defines a full bidirectional system with:
- **Sync Engine** - Bidirectional sync logic with conflict resolution
- **State Manager** - SQLite database tracking sync state (`sync_state.db`)
- **Conflict Resolution Module** - Handles simultaneous updates on both platforms
- **Webhook Server** - Real-time notifications (where available)
- **Polling Scheduler** - Fallback for platforms without webhooks

### Critical Data Flow
```
Google Tasks API → googleTasksService.getAllTasks() 
                ↓
            sync.js (maps Google tasks to Notion format)
                ↓
            notionService (creates/updates Notion pages)
                ↓
            Notion Database (identified by NOTION_DATABASE_ID)
```

**Key Sync Logic**: Uses `Google Task ID` property in Notion as the linking key. Tasks are created if missing, updated if existing. The spec defines hash-based change detection for bidirectional sync.

## Required Notion Database Schema

The Notion database **must** have these exact property names (per spec.md):

### Current Implementation
- `Title` (title type) - Task name
- `Status` (select type) - Options: "To Do", "Done"
- `Due Date` (date type) - Optional due date
- `Google Task ID` (rich_text type) - **Critical** for sync deduplication

### Full Spec (spec.md § 4.3)
The complete bidirectional system requires additional properties:
- `Description` (rich_text type) - Task description
- `Notes` (rich_text type) - Additional notes
- `Task List` (select type) - Source Google task list name
- `Last Synced` (date type) - Timestamp of last sync
- `Status` options: "To Do", "In Progress", "Done"

**Important**: Property names are case-sensitive in the Notion API calls (`notionService.js` lines 16-30).

## Environment Setup

### Required Environment Variables

**Current Implementation**:
```bash
# Notion credentials
NOTION_API_KEY=secret_...
NOTION_DATABASE_ID=...

# Google OAuth (for server.js web flow)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
OAUTH_REDIRECT_URI=http://localhost:3000/oauth2callback
SESSION_SECRET=... # Used for cookie-session
```

**Full Spec** (spec.md § 3.2) adds:
```bash
# Application settings
PORT=3000
SYNC_INTERVAL_MINUTES=5
LOG_LEVEL=info
STATE_DB_PATH=./sync_state.db
```

### How to Obtain Credentials

#### Google Cloud Console Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google Tasks API** in "APIs & Services" → "Library"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure OAuth consent screen (add email and app name)
6. Select "Desktop app" as application type
7. Download JSON and save as `credentials.json` in project root
8. Note: The `credentials.json` has this structure:
   ```json
   {
     "installed": {
       "client_id": "...",
       "client_secret": "...",
       "redirect_uris": ["http://localhost"]
     }
   }
   ```

#### Notion Integration Setup
1. Go to [Notion Developers](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Name it and select your workspace
4. Copy the "Internal Integration Token" → Use as `NOTION_API_KEY`
5. Create a database in Notion with required properties (see schema above)
6. Click "..." on database → "Add connections" → Select your integration
7. Get database ID from URL: `https://notion.so/workspace/{DATABASE_ID}?v=...`

### Authentication Flow

**Two auth methods coexist in codebase**:
1. **`googleAuth.js`** (ACTIVE): Uses `@google-cloud/local-auth` with `credentials.json` → generates `token.json`
2. **`server.js`** (LEGACY): Manual OAuth2 flow with Express/cookie-session

The active sync uses `googleAuth.js`. Run the sync once to trigger OAuth consent flow, which saves credentials to `token.json`.

**Note**: `server.js` appears to be an alternative/legacy approach. Consider removing or documenting its specific use case.

## Developer Workflows

### First-time Setup
```bash
npm install
# Add credentials.json from Google Cloud Console
# Add .env with required variables
node sync.js  # Triggers OAuth flow, generates token.json
```

### Running the Sync
```bash
# One-time sync
node sync.js

# Scheduled sync (every 15 min)
node scheduler.js

# OAuth web server (alternative auth method)
node server.js
```

### Testing
**Current State**: No formal test suite exists. Use `sync.js` directly for manual testing.

**Watch for**:
- OAuth token expiration (refresh flow is automatic via googleapis)
- Notion rate limits (no retry logic implemented - see Production Hardening below)
- Missing required properties in Notion database
- Network failures during sync

**Recommended Testing Approach**:
```bash
# Test one-time sync
node sync.js

# Check logs for errors
# Verify tasks appear in Notion
# Modify a Google Task and re-run to test updates
```

## Production Hardening Recommendations

### Error Handling Gaps
The current implementation has minimal error handling. For production use, add:

1. **Retry Logic with Exponential Backoff**
   ```javascript
   // Example pattern to add in service files
   async function retryOperation(fn, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fn();
       } catch (error) {
         if (i === maxRetries - 1) throw error;
         await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
       }
     }
   }
   ```

2. **Rate Limit Handling**
   - Notion API: 3 requests/second limit
   - Google Tasks API: Has quota limits
   - Add delay between batch operations: `await new Promise(r => setTimeout(r, 350))`

3. **Logging Framework** (per spec.md)
   - Add `winston` for structured logging
   - Log levels: error, warn, info, debug
   - Example: `logger.error('Sync failed', { error, taskId })`

4. **State Management**
   - Implement `sync_state.db` (spec.md § 4.2) to track:
     - Last successful sync timestamp
     - Sync hashes to detect actual changes (avoid unnecessary API calls)
     - Failed sync attempts for retry logic

5. **Graceful Degradation**
   ```javascript
   // Continue processing even if individual task sync fails
   for (const googleTask of googleTasks) {
     try {
       await syncTask(googleTask);
     } catch (error) {
       logger.error('Failed to sync task', { taskId: googleTask.id, error });
       // Continue with next task instead of crashing
     }
   }
   ```

6. **Environment Validation**
   ```javascript
   // Add at startup in sync.js
   const requiredEnvVars = ['NOTION_API_KEY', 'NOTION_DATABASE_ID'];
   requiredEnvVars.forEach(varName => {
     if (!process.env[varName]) {
       throw new Error(`Missing required environment variable: ${varName}`);
     }
   });
   ```

## Code Conventions

### Error Handling Pattern
**Current**: All service functions use async/await with minimal error handling. Errors bubble up to `sync.js` which catches and logs them. **No retry logic** for API failures.

**Pattern in Use**:
```javascript
// sync.js
async function syncGoogleTasksToNotion() {
  try {
    // ... sync logic
  } catch (error) {
    console.error('Sync failed:', error);
    throw error; // Propagates to scheduler
  }
}
```

**Spec Pattern** (spec.md § 5): Defines structured error handling with:
- Custom error classes (e.g., `GoogleTasksAPIError`, `NotionAPIError`)
- Retry decorators for transient failures
- Validation at service boundaries

### API Client Initialization
- **Notion**: Client instantiated globally in `notionService.js` (singleton pattern)
- **Google Tasks**: Client created per-request via `getTasksClient()` (ensures fresh auth)

### Status Mapping
Google Tasks has `completed`/`needsAction`. This maps to Notion's `Done`/`To Do` select values. See `sync.js` line 29.

**Spec Mapping** (spec.md § 4.3):
- Google `needsAction` → Notion "To Do"
- Google `completed` → Notion "Done"
- Future: Notion "In Progress" (not yet in Google Tasks)

## Common Pitfalls

1. **Notion property names must match exactly** - No validation exists; API will fail silently
2. **Token persistence**: `token.json` is gitignored but required for automation
3. **Database ID vs Page ID**: `NOTION_DATABASE_ID` is a database, not a page
4. **Task Lists**: Google Tasks are grouped in task lists; sync fetches from ALL lists
5. **One-way sync only**: Changes in Notion don't propagate back to Google Tasks

## External Dependencies

- `@notionhq/client` v5.3.0 - Official Notion SDK
- `googleapis` v165.0.0 - Google APIs client
- `@google-cloud/local-auth` v3.0.1 - OAuth2 flow helper
- `node-cron` v4.2.1 - Scheduler
- `express` v5.1.0 + `cookie-session` v2.1.1 - OAuth callback server

**Spec Dependencies** (spec.md § 3.1) adds for bidirectional sync:
- `sqlite3` v5.1.7 - State management database
- `winston` v3.11.0 - Structured logging
- `axios` v1.6.2 - HTTP client for webhooks

## Extending the System

To add **Notion → Google Tasks** sync:
1. Add webhook handler or polling in `notionService.js`
2. Detect changes via Notion's `last_edited_time` property
3. Add reverse mapping logic in `sync.js`
4. Handle conflict resolution (both sides modified)
5. Implement `sync_state.db` schema (spec.md § 4.2) for tracking:
   ```sql
   CREATE TABLE IF NOT EXISTS sync_state (
     google_task_id TEXT UNIQUE,
     notion_page_id TEXT UNIQUE,
     last_synced_at DATETIME,
     sync_hash TEXT,
     ...
   );
   ```

To change **sync frequency**: Edit cron expression in `scheduler.js` (currently `*/15 * * * *`)

### Spec-Defined Architecture Enhancements
Per spec.md § 2.1, the full system should include:
- **Conflict Resolution Module**: Handles simultaneous updates using last-modified timestamps
- **Webhook Server**: Express endpoint to receive Notion change notifications
- **State Manager**: SQLite-based tracking to prevent duplicate syncs and detect changes via hash comparison

## Deployment

### Running as a Background Service

#### Option 1: PM2 (Recommended for Production)
```bash
# Install PM2 globally
npm install -g pm2

# Start the scheduler
pm2 start scheduler.js --name "notion-sync"

# Save the process list
pm2 save

# Setup auto-restart on system reboot
pm2 startup

# Monitor logs
pm2 logs notion-sync

# Other useful commands
pm2 status              # Check status
pm2 restart notion-sync # Restart service
pm2 stop notion-sync    # Stop service
pm2 delete notion-sync  # Remove from PM2
```

#### Option 2: systemd (Linux)
Create `/etc/systemd/system/notion-sync.service`:
```ini
[Unit]
Description=Notion Google Tasks Sync
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/notion-google-tasks-integration
ExecStart=/usr/bin/node /path/to/notion-google-tasks-integration/scheduler.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable notion-sync
sudo systemctl start notion-sync
sudo systemctl status notion-sync
sudo journalctl -u notion-sync -f  # View logs
```

#### Option 3: Docker
Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application files
COPY . .

# Volume for persistent token storage
VOLUME ["/app/token.json"]

CMD ["node", "scheduler.js"]
```

Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  notion-sync:
    build: .
    restart: unless-stopped
    env_file: .env
    volumes:
      - ./token.json:/app/token.json
      - ./credentials.json:/app/credentials.json
    environment:
      - NODE_ENV=production
```

Run:
```bash
docker-compose up -d
docker-compose logs -f  # View logs
```

### Environment-Specific Configurations

**Development**: Run directly with `node scheduler.js`

**Production Checklist**:
- [ ] Set `NODE_ENV=production` in environment
- [ ] Use non-root user for service execution
- [ ] Implement log rotation (PM2 handles this automatically)
- [ ] Set up monitoring/alerting for sync failures
- [ ] Backup `token.json` and `.env` files securely
- [ ] Configure firewall rules if using `server.js` OAuth flow

## Troubleshooting

### Common Errors and Solutions

#### 1. "Error: ENOENT: no such file or directory, open 'credentials.json'"
**Cause**: Missing Google OAuth credentials file  
**Solution**: 
- Download credentials from Google Cloud Console
- Save as `credentials.json` in project root
- Ensure file is not in `.gitignore` (it is by default)

#### 2. "Error: No refresh token is set"
**Cause**: OAuth token expired or `token.json` corrupted  
**Solution**:
```bash
# Delete existing token
rm token.json

# Re-run sync to trigger OAuth flow
node sync.js
# Follow browser authentication prompts
```

#### 3. "Error: Notion API Error: Could not find database"
**Cause**: Database ID is incorrect or integration lacks access  
**Solution**:
- Verify `NOTION_DATABASE_ID` in `.env`
- In Notion, go to database → "..." → "Add connections" → Select your integration
- Database ID is in URL: `https://notion.so/workspace/{DATABASE_ID}?v=...`

#### 4. "Error: property not found: Status"
**Cause**: Notion database missing required properties  
**Solution**:
- Add missing properties with exact names (case-sensitive):
  - `Title` (title type)
  - `Status` (select with "To Do" and "Done" options)
  - `Due Date` (date type)
  - `Google Task ID` (rich_text type)

#### 5. Rate Limit Errors (429 Too Many Requests)
**Cause**: Exceeding Notion's 3 requests/second limit  
**Solution**:
- Reduce sync frequency in `scheduler.js`
- Add delays between batch operations (see Production Hardening § 2)
- Current implementation has no rate limiting - needs to be added

#### 6. "Error: The caller does not have permission"
**Cause**: Google Tasks API not enabled or OAuth scopes incorrect  
**Solution**:
- Go to Google Cloud Console → "APIs & Services" → "Library"
- Search for "Google Tasks API" and enable it
- Delete `token.json` and re-authenticate

#### 7. Tasks Not Syncing / Sync Appears Stuck
**Diagnostics**:
```bash
# Check if scheduler is running
ps aux | grep node

# For PM2
pm2 status

# For systemd
sudo systemctl status notion-sync

# Test one-time sync manually
node sync.js
```

**Common Causes**:
- Scheduler crashed (check logs)
- Network connectivity issues
- API credentials expired
- Notion database was deleted/moved

#### 8. Duplicate Tasks Created
**Cause**: `Google Task ID` property not properly set or tasks synced before property existed  
**Solution**:
- Verify `Google Task ID` property exists in Notion database
- Delete duplicate tasks manually
- Re-run sync - it will use existing tasks with matching IDs

#### 9. Environment Variables Not Loading
**Cause**: `.env` file not in project root or `dotenv` not configured  
**Solution**:
```bash
# Check .env file location
ls -la .env

# Verify it's being loaded
node -e "require('dotenv').config(); console.log(process.env.NOTION_API_KEY)"
# Should print your API key, not undefined
```

### Debug Mode

Enable verbose logging:
```javascript
// Add to top of sync.js
console.log('Environment check:', {
  notionKey: process.env.NOTION_API_KEY ? 'Set' : 'Missing',
  notionDb: process.env.NOTION_DATABASE_ID ? 'Set' : 'Missing',
  credentialsFile: require('fs').existsSync('./credentials.json') ? 'Found' : 'Missing',
  tokenFile: require('fs').existsSync('./token.json') ? 'Found' : 'Missing'
});
```

### Getting Help

When reporting issues, include:
- Node.js version (`node --version`)
- Operating system
- Error message and full stack trace
- Contents of environment check (without sensitive values)
- Whether it's first-time setup or previously working system
