const { Client } = require('@notionhq/client');
require('dotenv').config();

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
        select: { name: task.status || 'To Do' },
      },
      'Due Date': task.due ? {
        date: { start: task.due },
      } : undefined,
      'Google Task ID': {
        rich_text: [{ text: { content: task.googleTaskId || '' } }],
      },
    },
  });
}

async function updateNotionTask(pageId, task) {
  const properties = {
    'Title': {
      title: [{ text: { content: task.title || 'Untitled' } }],
    },
  };

  if (task.status) {
    properties['Status'] = { select: { name: task.status } };
  }

  if (task.due) {
    properties['Due Date'] = { date: { start: task.due } };
  }

  return await notion.pages.update({
    page_id: pageId,
    properties,
  });
}

async function deleteNotionTask(pageId) {
  return await notion.pages.update({
    page_id: pageId,
    archived: true,
  });
}

module.exports = {
  getAllNotionTasks,
  createNotionTask,
  updateNotionTask,
  deleteNotionTask,
};