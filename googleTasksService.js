import { google } from 'googleapis';
import { authorize } from './googleAuth.js';

async function getTasksClient() {
  const auth = await authorize();
  return google.tasks({ version: 'v1', auth });
}

async function getAllTasks() {
  const tasksClient = await getTasksClient();
  const taskLists = await tasksClient.tasklists.list();

  const allTasks = [];
  for (const taskList of taskLists.data.items) {
    const tasks = await tasksClient.tasks.list({
      tasklist: taskList.id,
      showCompleted: true,
      showHidden: true,
    });
    if (tasks.data.items) {
      allTasks.push(...tasks.data.items.map(task => ({
        ...task,
        taskListId: taskList.id,
      })));
    }
  }
  return allTasks;
}

async function createTask(taskListId, task) {
  const tasksClient = await getTasksClient();
  return await tasksClient.tasks.insert({
    tasklist: taskListId,
    requestBody: task,
  });
}

async function createTaskFromNotion(notionTask) {
  const tasksClient = await getTasksClient();

  // Get the first task list (default list)
  const taskLists = await tasksClient.tasklists.list();
  const defaultListId = taskLists.data.items[0].id;

  // Map Notion status to Google status
  const statusValue = notionTask.properties.Status?.select?.name;
  const status = statusValue === 'Done' ? 'completed' : 'needsAction';

  const taskData = {
    title: notionTask.properties.Title.title[0]?.plain_text || 'Untitled',
    status: status,
  };

  // Add due date if present
  const dueDate = notionTask.properties['Due Date']?.date?.start;
  if (dueDate) {
    taskData.due = dueDate;
  }

  const result = await tasksClient.tasks.insert({
    tasklist: defaultListId,
    requestBody: taskData,
  });

  return {
    ...result.data,
    taskListId: defaultListId
  };
}

async function updateTask(taskListId, taskId, task) {
  const tasksClient = await getTasksClient();
  // Use patch to update partial fields (update can require full resource)
  return await tasksClient.tasks.patch({
    tasklist: taskListId,
    task: taskId,
    requestBody: task,
  });
}

async function deleteTask(taskListId, taskId) {
  const tasksClient = await getTasksClient();
  return await tasksClient.tasks.delete({
    tasklist: taskListId,
    task: taskId,
  });
}

async function updateTaskFromNotion(taskListId, taskId, notionTask) {
  const tasksClient = await getTasksClient();

  // Map Notion status to Google status
  const statusValue = notionTask.properties.Status?.select?.name;
  const status = statusValue === 'Done' ? 'completed' : 'needsAction';

  const updateData = {
    title: notionTask.properties.Title.title[0]?.plain_text || 'Untitled',
    status: status,
  };

  // Add due date if present
  const dueDate = notionTask.properties['Due Date']?.date?.start;
  if (dueDate) {
    updateData.due = dueDate;
  }

  return await tasksClient.tasks.patch({
    tasklist: taskListId,
    task: taskId,
    requestBody: updateData,
  });
}

export { getAllTasks, createTask, createTaskFromNotion, updateTask, deleteTask, updateTaskFromNotion };
