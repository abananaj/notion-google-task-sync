import cron from 'node-cron';
import { bidirectionalSync } from './sync.js';

// Run sync every 15 minutes (production)
// cron.schedule('*/15 * * * *', () => {
//   console.log('Running scheduled sync...');
//   bidirectionalSync().catch(console.error);
// });

// Run sync every 30 seconds (testing)
cron.schedule('*/30 * * * * *', () => {
  console.log('Running scheduled sync...');
  bidirectionalSync().catch(console.error);
});

console.log('Scheduler started. Sync will run every 30 seconds (TESTING MODE).');
