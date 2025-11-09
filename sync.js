import { getAllTasks, updateTaskFromNotion, createTaskFromNotion } from './googleTasksService.js';
import { getAllNotionTasks, createNotionTask, updateNotionTask } from './notionService.js';
import 'dotenv/config';

async function bidirectionalSync() {
  console.log('Starting bidirectional sync...');

  const googleTasks = await getAllTasks();
  console.log(`Found ${googleTasks.length} Google Tasks`);

  const notionTasks = await getAllNotionTasks();
  console.log(`Found ${notionTasks.length} Notion tasks`);

  // Map existing Notion tasks by Google Task ID
  const notionTasksMap = new Map();
  const notionTasksWithoutGoogleId = [];

  notionTasks.forEach(task => {
    const googleTaskId = task.properties['Google Task ID']?.rich_text[0]?.text?.content;
    if (googleTaskId) {
      notionTasksMap.set(googleTaskId, task);
    } else {
      notionTasksWithoutGoogleId.push(task);
    }
  });

  // Sync each Google task
  for (const googleTask of googleTasks) {
    const existingNotionTask = notionTasksMap.get(googleTask.id);

    if (!existingNotionTask) {
      // New Google task → Create in Notion
      const taskData = {
        title: googleTask.title,
        status: googleTask.status === 'completed' ? 'Done' : 'Not started',
        due: googleTask.due,
        taskList: googleTask.taskListName,
        googleTaskId: googleTask.id,
      };
      await createNotionTask(taskData);
      console.log(`+ Created in Notion: ${googleTask.title}`);
    } else {
      // Compare timestamps to determine sync direction
      const googleUpdated = new Date(googleTask.updated);
      const notionUpdated = new Date(existingNotionTask.last_edited_time);

      if (googleUpdated > notionUpdated) {
        // Google is newer → Update Notion
        // Map Google status to Notion, preserving "In progress" when Google is needsAction
        const currentNotionStatus = existingNotionTask.properties.Status?.status?.name;
        let newNotionStatus;
        if (googleTask.status === 'completed') {
          newNotionStatus = 'Done';
        } else {
          // Google needsAction: preserve "In progress" if already set, otherwise use "Not started"
          newNotionStatus = currentNotionStatus === 'In progress' ? 'In progress' : 'Not started';
        }

        const taskData = {
          title: googleTask.title,
          status: newNotionStatus,
          due: googleTask.due,
          taskList: googleTask.taskListName,
          due: googleTask.due,
          googleTaskId: googleTask.id,
        };
        await updateNotionTask(existingNotionTask.id, taskData);
        console.log(`→ Google → Notion: ${googleTask.title}`);
      } else if (notionUpdated > googleUpdated) {
        // Notion is newer → Update Google
        await updateTaskFromNotion(googleTask.taskListId, googleTask.id, existingNotionTask);
        console.log(`← Notion → Google: ${googleTask.title}`);
      } else {
        // Same timestamp - already synced
        console.log(`= ${googleTask.title}`);
      }
    }

    await new Promise(r => setTimeout(r, 350)); // Rate limiting
  }

  // Handle Notion tasks without Google Task ID (create in Google, then update Notion)
  for (const notionTask of notionTasksWithoutGoogleId) {
    try {
      const title = notionTask.properties.Title.title[0]?.plain_text || 'Untitled';
      console.log(`+ Creating in Google: ${title}`);

      const newGoogleTask = await createTaskFromNotion(notionTask);

      // Update Notion task with the new Google Task ID
      await updateNotionTask(notionTask.id, {
        googleTaskId: newGoogleTask.id,
      });

      console.log(`  ✓ Linked: ${title} → Google Task ID: ${newGoogleTask.id}`);
    } catch (error) {
      const title = notionTask.properties.Title.title[0]?.plain_text || 'Untitled';
      console.error(`  ✗ Failed to create: ${title} - ${error.message}`);
    }
    await new Promise(r => setTimeout(r, 350)); // Rate limiting
  }

  console.log('✅ Sync complete');
}

// Run sync if executed directly
bidirectionalSync().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});

export { bidirectionalSync };
