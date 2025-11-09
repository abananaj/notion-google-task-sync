import cron from 'node-cron';
import { syncGoogleTasksToNotion } from './sync.js';

// Run sync every 15 minutes
cron.schedule('*/15 * * * *', () => {
  console.log('Running scheduled sync...');
  syncGoogleTasksToNotion().catch(console.error);
});

console.log('Scheduler started. Sync will run every 15 minutes.');