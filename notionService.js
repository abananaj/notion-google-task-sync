import { Client } from '@notionhq/client';
import 'dotenv/config';

if (!process.env.NOTION_API_KEY || !process.env.NOTION_DATABASE_ID) {
  throw new Error('Missing NOTION_API_KEY or NOTION_DATABASE_ID in .env');
}

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID;

async function getAllNotionTasks() {
  const response = await notion.databases.query({
    database_id: databaseId,
  });
  return response.results;
}

async function createNotionTask(task) {
  return await notion.pages.create({
    parent: { database_id: databaseId },
    properties: {
      'Title': {
        title: [{ text: { content: task.title || 'Untitled' } }],
      },
      'Status': {
        status: { name: task.status || 'Not started' },
      },
      'Due Date': task.due ? { date: { start: task.due } } : undefined,
      'Google Task ID': {
        rich_text: [{ text: { content: task.googleTaskId || '' } }],
      },
    },
  });
}

async function updateNotionTask(pageId, task) {
  const properties = {};

  if (task.title) {
    properties['Title'] = {
      title: [{ text: { content: task.title } }],
    };
  }

  if (task.status) {
    properties['Status'] = {
      status: { name: task.status },
    };
  }

  // Only update due date if provided and not undefined
  if (task.due) {
    properties['Due Date'] = { date: { start: task.due } };
  }

  if (task.googleTaskId) {
    properties['Google Task ID'] = {
      rich_text: [{ text: { content: task.googleTaskId } }],
    };
  }

  return await notion.pages.update({ page_id: pageId, properties });
}

async function deleteNotionTask(pageId) {
  return await notion.pages.update({
    page_id: pageId,
    archived: true,
  });
}

export { getAllNotionTasks, createNotionTask, updateNotionTask, deleteNotionTask };
