const cron = require('node-cron');
const Subscription = require('../models/Subscription');
const logger = require('./logger');

// Setup background scheduler running every night at midnight (00:00)
const initSubscriptionScheduler = () => {
  cron.schedule('0 0 * * *', async () => {
    logger.info('[SCHEDULER] Initiating midnight sweep for expired active subscriptions...');
    
    try {
      const expiredCount = await Subscription.updateMany(
        { 
          status: 'ACTIVE', 
          expiryDate: { $lte: new Date() } 
        },
        { 
          $set: { 
            status: 'EXPIRED', 
            plan: 'FREE' 
          } 
        }
      );
      
      if (expiredCount.modifiedCount > 0) {
        logger.info(`[SCHEDULER] Successfully demoted ${expiredCount.modifiedCount} expired accounts back to FREE tier.`);
      } else {
        logger.info('[SCHEDULER] Expiry check complete. No active subscription plans were found expired today.');
      }
    } catch (error) {
      logger.error('[SCHEDULER] Background sweep task crashed: %O', error);
    }
  });

  logger.info('Subscription background cron scheduler registered successfully.');
};

module.exports = { initSubscriptionScheduler };
