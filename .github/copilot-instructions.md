# Copilot Instructions

Simple one-way sync: Google Tasks → Notion

## Key Files

- `sync.js` - Core sync logic
- `googleAuth.js` - OAuth flow
- `googleTasksService.js` - Google Tasks API wrapper
- `notionService.js` - Notion API wrapper
- `scheduler.js` - Cron runner (15 min)

## How It Works

1. Fetch all Google Tasks via API
2. Fetch all Notion pages in database
3. Match by "Google Task ID" property
4. Create new or update existing Notion pages
5. Map: Google `completed` → Notion "Done", Google `needsAction` → Notion "Not started"

## Environment

Required in `.env`:

- `NOTION_API_KEY` - Integration token
- `NOTION_DATABASE_ID` - Target database

OAuth via `credentials.json` (Desktop app) → saves `token.json`

## Notion Database Schema

Must have these exact properties:

- `Title` (title)
- `Status` (select: "Not started", "Done")
- `Due Date` (date)
- `Google Task ID` (rich_text)

## Common Issues

- Auth fail → `rm token.json && npm run sync`
- Missing credentials → Download from Google Cloud Console
- Notion errors → Check database is shared with integration

See [../SETUP.md](../SETUP.md) for full docs.

