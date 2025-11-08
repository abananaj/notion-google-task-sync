const { google } = require('googleapis');
const { authorize } = require('./googleAuth');

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
  return await tasksClient.tasks.update({
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

module.exports = {
  getAllTasks,
  createTask,
  updateTask,
  deleteTask,
};