import { getAllTasks } from './googleTasksService.js';
import { getAllNotionTasks, createNotionTask, updateNotionTask } from './notionService.js';
import 'dotenv/config';

async function syncGoogleTasksToNotion() {
  console.log('Starting sync...');

  const googleTasks = await getAllTasks();
  console.log(`Found ${googleTasks.length} Google Tasks`);

  const notionTasks = await getAllNotionTasks();
  console.log(`Found ${notionTasks.length} Notion tasks`);

  // Map existing Notion tasks by Google Task ID
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
      status: googleTask.status === 'completed' ? 'Done' : 'Not started',
      due: googleTask.due,
      googleTaskId: googleTask.id,
    };

    const existingNotionTask = notionTasksMap.get(googleTask.id);

    if (existingNotionTask) {
      await updateNotionTask(existingNotionTask.id, taskData);
      console.log(`✓ ${googleTask.title}`);
    } else {
      await createNotionTask(taskData);
      console.log(`+ ${googleTask.title}`);
    }

    await new Promise(r => setTimeout(r, 350)); // Rate limiting
  }

  console.log('✅ Sync complete');
}

// Run sync if executed directly
syncGoogleTasksToNotion().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});

export { syncGoogleTasksToNotion };
