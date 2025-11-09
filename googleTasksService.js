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

export { getAllTasks, createTask, updateTask, deleteTask };
