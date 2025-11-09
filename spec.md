# Google Tasks ↔️ Notion Bidirectional Sync - Technical Specification

## 1. Overview

This document specifies a bidirectional synchronization system between Google Tasks and Notion databases using their respective APIs. The system uses built-in timestamp comparison (Google Tasks `updated` field and Notion `last_edited_time` property) to determine which platform has the most recent changes, syncing in the appropriate direction.

## 2. System Architecture

### 2.1 Components

- **Sync Engine:** Core bidirectional synchronization logic using timestamp comparison
- **Google Tasks Service:** API client for Google Tasks operations
- **Notion Service:** API client for Notion database operations
- **Conflict Resolution:** Uses most recent timestamp to determine sync direction
- **Scheduler:** Polling mechanism (runs every 15 minutes by default)

### 2.2 Data Flow

```
Google Tasks <--> Sync Engine <--> Notion Database
                       |
              Timestamp Comparison
              (most recent wins)
```

### 2.3 Sync Logic

For each task pair (matched by Google Task ID):

1. Compare `googleTask.updated` vs `notionTask.last_edited_time`
2. If Google is newer → Update Notion
3. If Notion is newer → Update Google
4. If timestamps equal → Skip (already synced)

## 3. Technical Requirements

### 3.1 Dependencies

```json
{
  "dependencies": {
    "@notionhq/client": "^2.3.0",
    "googleapis": "^165.0.0",
    "dotenv": "^17.2.3",
    "node-cron": "^4.2.1",
    "open": "^8.4.2"
  }
}
```

### 3.2 Environment Variables

```bash
## Notion API
NOTION_API_KEY=your_notion_integration_token
NOTION_DATABASE_ID=your_database_id
```

Google OAuth credentials are stored in `credentials.json` and tokens in `token.json`.

## 4. Data Models

### 4.1 Task Object Structure

```javascript
// Normalized task representation
{
  id: string,              // Google Task ID
  title: string,
  status: string,          // 'needsAction' | 'completed'
  due: string | null,      // ISO date
  updated: string,         // ISO timestamp (Google)
  lastModified: string,    // ISO timestamp (Notion)
  googleTaskId: string,
  notionPageId: string | null,
  taskListId: string       // Google task list ID
}
```

    this.sourceSystem = sourceSystem;
    this.googleTaskId = googleTaskId;
    this.notionPageId = notionPageId;
    this.taskListId = taskListId;

}
}

````

### 4.2 Sync State Schema

```sql
CREATE TABLE IF NOT EXISTS sync_state (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  google_task_id TEXT UNIQUE,
  notion_page_id TEXT UNIQUE,
  task_list_id TEXT,
  last_synced_at DATETIME,
  google_last_modified DATETIME,
  notion_last_modified DATETIME,
  sync_hash TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
### 4.2 Notion Database Properties

Required properties in Notion database:

```javascript
{
  'Title': { type: 'title' },
  'Status': {
    type: 'select',
    options: ['Not started', 'Done']  // Maps to Google needsAction/completed
  },
  'Due Date': { type: 'date' },
  'Google Task ID': { type: 'rich_text' }  // Links to Google Tasks
}
````

Built-in Notion property used for sync:

- `last_edited_time` - Automatically updated by Notion when page is modified

## 5. Bidirectional Sync Implementation

### 5.1 Google Tasks Service

````jsx
## 5. Bidirectional Sync Implementation

### 5.1 Sync Algorithm

```javascript
async function bidirectionalSync() {
  const googleTasks = await getAllTasks();
  const notionTasks = await getAllNotionTasks();

  // Map Notion tasks by Google Task ID
  const notionMap = new Map();
  notionTasks.forEach(task => {
    const googleTaskId = task.properties['Google Task ID']?.rich_text[0]?.text?.content;
    if (googleTaskId) notionMap.set(googleTaskId, task);
  });

  for (const googleTask of googleTasks) {
    const notionTask = notionMap.get(googleTask.id);

    if (!notionTask) {
      // New Google task → Create in Notion
      await createNotionTask(googleTask);
    } else {
      // Compare timestamps
      const googleUpdated = new Date(googleTask.updated);
      const notionUpdated = new Date(notionTask.last_edited_time);

      if (googleUpdated > notionUpdated) {
        // Google is newer → Update Notion
        await updateNotionTask(notionTask.id, googleTask);
      } else if (notionUpdated > googleUpdated) {
        // Notion is newer → Update Google
        await updateGoogleTask(googleTask.taskListId, googleTask.id, notionTask);
      }
      // If equal, already synced - skip
    }
  }

  // Handle Notion tasks not in Google (create new Google tasks)
  for (const notionTask of notionTasks) {
    const googleTaskId = notionTask.properties['Google Task ID']?.rich_text[0]?.text?.content;
    if (!googleTaskId) {
      await createGoogleTask(notionTask);
    }
  }
}
````

### 5.2 Status Mapping

Google Tasks ↔ Notion:

- `needsAction` ↔ `Not started`
- `completed` ↔ `Done`

### 5.3 Rate Limiting

- Notion: 3 requests/second → 350ms delay between calls
- Google Tasks: Standard quotas apply

## 6. Error Handling

- API failures logged and task skipped (sync continues)
- OAuth token refresh handled automatically
- Network errors cause retry on next scheduled sync

## 7. Running the Sync

```bash
npm run sync      # One-time bidirectional sync
npm run schedule  # Run sync every 15 minutes
```

```

```
