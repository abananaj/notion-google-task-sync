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
  const properties = {
    'Title': {
      title: [{ text: { content: task.title || 'Untitled' } }],
    },
    'Status': {
      status: { name: task.status || 'Not started' },
    },
    'Google Task ID': {
      rich_text: [{ text: { content: task.googleTaskId || '' } }],
    },
  };

  if (task.due) {
    properties['Due Date'] = { date: { start: task.due } };
  }

  if (task.taskList) {
    properties['Task list'] = { select: { name: task.taskList } };
  }

  return await notion.pages.create({
    parent: { database_id: databaseId },
    properties,
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

  if (task.taskList) {
    properties['Task list'] = { select: { name: task.taskList } };
  }

  if (task.googleTaskId) {
    properties['Google Task ID'] = {
      rich_text: [{ text: { content: task.googleTaskId } }],
    };
  }

  const updateData = { page_id: pageId, properties };
  
  // Handle archiving separately (not a property)
  if (task.archived !== undefined) {
    updateData.archived = task.archived;
  }

  return await notion.pages.update(updateData);
}

async function deleteNotionTask(pageId) {
  return await notion.pages.update({
    page_id: pageId,
    archived: true,
  });
}

export { getAllNotionTasks, createNotionTask, updateNotionTask, deleteNotionTask };
