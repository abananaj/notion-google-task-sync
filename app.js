import { getAllTasks, updateTaskFromNotion, createTaskFromNotion } from './googleTasksService.js';
import { getAllNotionTasks, createNotionTask, updateNotionTask } from './notionService.js';
import cron from 'node-cron';
import 'dotenv/config';

// Environment configuration
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const SYNC_INTERVAL = process.env.SYNC_INTERVAL_MINUTES || 15;

async function bidirectionalSync() {
  const startTime = new Date();
  console.log(`[${startTime.toISOString()}] Starting bidirectional sync...`);

  const googleTasks = await getAllTasks();
  console.log(`Found ${googleTasks.length} Google Tasks`);

  const notionTasks = await getAllNotionTasks();
  console.log(`Found ${notionTasks.length} Notion tasks`);

  // Map existing Notion tasks by Google Task ID and detect duplicates
  const notionTasksMap = new Map();
  const notionTasksWithoutGoogleId = [];
  const duplicateTasks = [];

  notionTasks.forEach(task => {
    const googleTaskId = task.properties['Google Task ID']?.rich_text[0]?.text?.content;
    if (googleTaskId) {
      if (notionTasksMap.has(googleTaskId)) {
        // Duplicate found - keep the most recently edited one
        const existing = notionTasksMap.get(googleTaskId);
        const existingTime = new Date(existing.last_edited_time);
        const currentTime = new Date(task.last_edited_time);

        if (currentTime > existingTime) {
          duplicateTasks.push(existing);
          notionTasksMap.set(googleTaskId, task);
        } else {
          duplicateTasks.push(task);
        }
      } else {
        notionTasksMap.set(googleTaskId, task);
      }
    } else {
      notionTasksWithoutGoogleId.push(task);
    }
  });

  // Archive duplicate tasks
  if (duplicateTasks.length > 0) {
    console.log(`⚠️  Found ${duplicateTasks.length} duplicate task(s), archiving older versions...`);
    for (const duplicate of duplicateTasks) {
      const title = duplicate.properties.Title.title[0]?.plain_text || 'Untitled';
      const googleTaskId = duplicate.properties['Google Task ID']?.rich_text[0]?.text?.content;
      console.log(`  Archiving duplicate: ${title} (Google Task ID: ${googleTaskId})`);
      await updateNotionTask(duplicate.id, { archived: true });
    }
  }

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
  const endTime = new Date();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  console.log(`[${endTime.toISOString()}] Sync completed in ${duration}s`);
}

// Check if running with --schedule flag
const isScheduled = process.argv.includes('--schedule');

if (isScheduled) {
  // Production: sync at configured interval
  const cronPattern = `*/${SYNC_INTERVAL} * * * *`;
  cron.schedule(cronPattern, () => {
    console.log(`[${new Date().toISOString()}] Running scheduled sync...`);
    bidirectionalSync().catch(err => {
      console.error(`[${new Date().toISOString()}] ❌ Sync error:`, err.message);
    });
  });
  console.log(`[${new Date().toISOString()}] Scheduler started (${NODE_ENV} mode). Sync will run every ${SYNC_INTERVAL} minutes.`);

  // Keep process alive
  process.on('SIGTERM', () => {
    console.log(`[${new Date().toISOString()}] Received SIGTERM, shutting down gracefully...`);
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log(`[${new Date().toISOString()}] Received SIGINT, shutting down gracefully...`);
    process.exit(0);
  });

  // // ===== TESTING: every 30 seconds
  // cron.schedule('*/30 * * * * *', () => {
  //   console.log('Running scheduled sync...');
  //   bidirectionalSync().catch(console.error);
  // });
  // console.log('Scheduler started. Sync will run every 30 seconds.');
} else {
  // Run sync immediately if executed directly without --schedule flag
  bidirectionalSync().catch(err => {
    console.error(`[${new Date().toISOString()}] ❌`, err.message);
    process.exit(1);
  });
}

export { bidirectionalSync };
