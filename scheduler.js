const cron = require('node-cron');
const { syncGoogleTasksToNotion } = require('./sync');

// Run sync every 15 minutes
cron.schedule('*/15 * * * *', () => {
  console.log('Running scheduled sync...');
  syncGoogleTasksToNotion().catch(console.error);
});

console.log('Scheduler started. Sync will run every 15 minutes.');