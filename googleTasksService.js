import { google } from 'googleapis';
import { authorize } from './googleAuth.js';

async function getTasksClient() {
  const auth = await authorize();
  return google.tasks({ version: 'v1', auth });
}

async function getAllTaskLists() {
  const tasksClient = await getTasksClient();
  const response = await tasksClient.tasklists.list();
  return response.data.items || [];
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
        taskListName: taskList.title, // Add task list name
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

  // Get task list from Notion or use default
  const taskLists = await tasksClient.tasklists.list();
  const notionTaskListName = notionTask.properties['Task list']?.select?.name;

  let targetListId;
  if (notionTaskListName) {
    // Find matching task list by name
    const matchingList = taskLists.data.items.find(list => list.title === notionTaskListName);
    targetListId = matchingList ? matchingList.id : taskLists.data.items[0].id;
  } else {
    // Use default (first) list
    targetListId = taskLists.data.items[0].id;
  }

  // Map Notion status to Google status
  const statusValue = notionTask.properties.Status?.status?.name;
  const status = statusValue === 'Done' ? 'completed' : 'needsAction';

  const taskData = {
    title: notionTask.properties.Title.title[0]?.plain_text || 'Untitled',
    status: status,
  };

  // Add due date if present
  const dueDate = notionTask.properties['Due Date']?.date?.start;
  if (dueDate) {
    taskData.due = dueDate.includes('T') ? dueDate : `${dueDate}T00:00:00.000Z`;
  }

  const result = await tasksClient.tasks.insert({
    tasklist: targetListId,
    requestBody: taskData,
  });

  return {
    ...result.data,
    taskListId: targetListId
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

async function updateTaskFromNotion(currentTaskListId, taskId, notionTask) {
  const tasksClient = await getTasksClient();

  // Map Notion status to Google status
  // Notion: "Done" → Google: "completed"
  // Notion: "Not started" or "In progress" → Google: "needsAction"
  const statusValue = notionTask.properties.Status?.status?.name;
  const status = statusValue === 'Done' ? 'completed' : 'needsAction';

  const updateData = {
    title: notionTask.properties.Title.title[0]?.plain_text || 'Untitled',
    status: status,
  };

  // Handle due date - only include if present in Notion
  const dueDate = notionTask.properties['Due Date']?.date?.start;
  if (dueDate) {
    // Google Tasks expects RFC 3339 timestamp, but if we get just a date (YYYY-MM-DD),
    // convert it to RFC 3339 format
    updateData.due = dueDate.includes('T') ? dueDate : `${dueDate}T00:00:00.000Z`;
  }
  // Note: Google Tasks API - omit 'due' field to leave unchanged, can't explicitly clear

  // Check if task list changed - if so, need to delete and recreate in new list
  const notionTaskListName = notionTask.properties['Task list']?.select?.name;

  if (notionTaskListName) {
    const taskLists = await tasksClient.tasklists.list();
    const matchingList = taskLists.data.items.find(list => list.title === notionTaskListName);

    if (matchingList && matchingList.id !== currentTaskListId) {
      // Moving to different list: delete from old list and create in new list
      await tasksClient.tasks.delete({
        tasklist: currentTaskListId,
        task: taskId,
      });

      const newTask = await tasksClient.tasks.insert({
        tasklist: matchingList.id,
        requestBody: updateData,
      });

      return newTask;
    }
  }

  // Update in current list
  return await tasksClient.tasks.patch({
    tasklist: currentTaskListId,
    task: taskId,
    requestBody: updateData,
  });
}

export { getAllTasks, getAllTaskLists, createTask, createTaskFromNotion, updateTask, deleteTask, updateTaskFromNotion };
