const cron = require('node-cron');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const logger = require('./logger');

// Setup background scheduler running every night at midnight (00:00)
const initSubscriptionScheduler = () => {
  cron.schedule('0 0 * * *', async () => {
    logger.info('[SCHEDULER] Initiating midnight sweep for expired subscriptions and unverified users...');
    
    // 1. Prune unverified accounts older than 24 hours
    try {
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const pruneResult = await User.deleteMany({
        isEmailVerified: false,
        createdAt: { $lt: cutoffTime }
      });

      if (pruneResult.deletedCount > 0) {
        logger.info(`[SCHEDULER] Successfully pruned ${pruneResult.deletedCount} unverified accounts older than 24 hours.`);
      }
    } catch (error) {
      logger.error('[SCHEDULER] Background unverified user prune task crashed: %O', error);
    }

    // 2. Demote expired subscriptions
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
      logger.error('[SCHEDULER] Background subscription sweep task crashed: %O', error);
    }
  });

  logger.info('Subscription background cron scheduler registered successfully.');
};

module.exports = { initSubscriptionScheduler };
