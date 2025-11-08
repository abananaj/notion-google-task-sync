const { getAllTasks } = require('./googleTasksService');
const { getAllNotionTasks, createNotionTask, updateNotionTask } = require('./notionService');

async function syncGoogleTasksToNotion() {
  try {
    console.log('Starting sync...');
    
    // Get all tasks from Google
    const googleTasks = await getAllTasks();
    console.log(`Found ${googleTasks.length} Google Tasks`);
    
    // Get all tasks from Notion
    const notionTasks = await getAllNotionTasks();
    console.log(`Found ${notionTasks.length} Notion tasks`);
    
    // Create a map of existing Notion tasks by Google Task ID
    const notionTasksMap = new Map();
    notionTasks.forEach(task => {
      const googleTaskId = task.properties['Google Task ID']?.rich_text[0]?.text?.content;
      if (googleTaskId) {
        notionTasksMap.set(googleTaskId, task);
      }
    });
    
    // Sync each Google task to Notion
    for (const googleTask of googleTasks) {
      const taskData = {
        title: googleTask.title,
        status: googleTask.status === 'completed' ? 'Done' : 'To Do',
        due: googleTask.due,
        googleTaskId: googleTask.id,
      };
      
      const existingNotionTask = notionTasksMap.get(googleTask.id);
      
      if (existingNotionTask) {
        // Update existing task
        await updateNotionTask(existingNotionTask.id, taskData);
        console.log(`Updated: ${googleTask.title}`);
      } else {
        // Create new task
        await createNotionTask(taskData);
        console.log(`Created: ${googleTask.title}`);
      }
    }
    
    console.log('Sync completed successfully!');
  } catch (error) {
    console.error('Sync failed:', error);
    throw error;
  }
}

module.exports = { syncGoogleTasksToNotion };