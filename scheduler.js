import cron from 'node-cron';
import { bidirectionalSync } from './sync.js';

// ====== PRODUCTION: sync every 15 minutes
cron.schedule('*/15 * * * *', () => {
  console.log('Running scheduled sync...');
  bidirectionalSync().catch(console.error);
});
console.log('Scheduler started. Sync will run every 15 minutes.');

// // ===== TESTING: every 30 seconds
// cron.schedule('*/30 * * * * *', () => {
//   console.log('Running scheduled sync...');
//   bidirectionalSync().catch(console.error);
// });
// console.log('Scheduler started. Sync will run every 30 seconds.');