'use strict';

const path = require('path');
const egg = require('egg');

// Start the application
egg.startCluster({
  baseDir: path.join(__dirname, '.'),
  port: 7001,
  workers: 1,
}, () => {
  console.log('Server started on port 7001');
  
  // Test the membership service
  setTimeout(async () => {
    try {
      // Create a HTTP client
      const { app } = egg.Application;
      const ctx = app.createAnonymousContext();
      
      // Test membership service
      const membershipService = ctx.service.membership;
      
      // Get membership info
      const freeInfo = membershipService.getMembershipInfo('free');
      console.log('Free membership info:', freeInfo);
      
      const premiumInfo = membershipService.getMembershipInfo('premium');
      console.log('Premium membership info:', premiumInfo);
      
      console.log('Tests completed successfully!');
      process.exit(0);
    } catch (error) {
      console.error('Error testing membership service:', error);
      process.exit(1);
    }
  }, 3000);
});
