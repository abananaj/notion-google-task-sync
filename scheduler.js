import cron from 'node-cron';
import { bidirectionalSync } from './sync.js';

// Run sync every 15 minutes
cron.schedule('*/15 * * * *', () => {
  console.log('Running scheduled sync...');
  bidirectionalSync().catch(console.error);
});

console.log('Scheduler started. Sync will run every 15 minutes.');
