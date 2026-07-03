const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');
const Session = require('../models/Session');
const logger = require('../utils/logger');

// 1. Get Dashboard Analytics Metrics
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeSubs = await Subscription.countDocuments({ status: 'ACTIVE', expiryDate: { $gt: new Date() } });
    const expiredSubs = await Subscription.countDocuments({ status: 'EXPIRED' });
    const pendingPayments = await Payment.countDocuments({ status: 'PENDING' });
    const failedPayments = await Payment.countDocuments({ status: 'FAILED' });

    // Aggregate Revenues (Today, Month, Year, Total)
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const revenueStats = await Payment.aggregate([
      { $match: { status: 'SUCCESS' } },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          today: {
            $sum: {
              $cond: [{ $gte: ['$createdAt', startOfToday] }, '$amount', 0]
            }
          },
          month: {
            $sum: {
              $cond: [{ $gte: ['$createdAt', startOfMonth] }, '$amount', 0]
            }
          },
          year: {
            $sum: {
              $cond: [{ $gte: ['$createdAt', startOfYear] }, '$amount', 0]
            }
          }
        }
      }
    ]);

    const revenue = revenueStats[0] || { total: 0, today: 0, month: 0, year: 0 };

    // Most purchased plan
    const planPopularity = await Payment.aggregate([
      { $match: { status: 'SUCCESS' } },
      { $group: { _id: '$plan', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);

    const topPlan = planPopularity[0] ? planPopularity[0]._id : 'NONE';

    res.status(200).json({
      metrics: {
        totalUsers,
        activeSubscriptions: activeSubs,
        expiredSubscriptions: expiredSubs,
        pendingPayments,
        failedPayments,
        topPlan
      },
      revenue
    });
  } catch (error) {
    logger.error('Admin stats computation failed: %O', error);
    res.status(500).json({ error: 'Failed to compute admin statistics.' });
  }
};

// 2. Search & Manage Users
exports.getUsers = async (req, res) => {
  const { query } = req.query;

  try {
    let userIds = [];
    let isSearchPerformed = false;

    if (query) {
      isSearchPerformed = true;
      const lowerQuery = query.toLowerCase().trim();

      // a. Check if query is a valid MongoDB ObjectId (search by User ID or Subscription ID)
      if (lowerQuery.match(/^[0-9a-fA-F]{24}$/)) {
        // Search user directly
        const directUser = await User.findById(lowerQuery);
        if (directUser) {
          userIds.push(directUser._id);
        } else {
          // Search subscription ID
          const sub = await Subscription.findById(lowerQuery);
          if (sub) userIds.push(sub.userId);
        }
      }

      // b. Search by name or email matches
      const matchedUsers = await User.find({
        $or: [
          { name: new RegExp(lowerQuery, 'i') },
          { email: new RegExp(lowerQuery, 'i') }
        ]
      }).select('_id');
      matchedUsers.forEach(u => userIds.push(u._id));

      // c. Search by Payment / Order / Transaction ID
      const matchedPayments = await Payment.find({
        $or: [
          { razorpayOrderId: lowerQuery },
          { razorpayPaymentId: lowerQuery }
        ]
      }).select('userId');
      matchedPayments.forEach(p => userIds.push(p.userId));

      // d. Search by Subscription Plan Name
      if (['free', 'trial', 'monthly', 'yearly'].includes(lowerQuery)) {
        const matchedSubs = await Subscription.find({ plan: lowerQuery.toUpperCase() }).select('userId');
        matchedSubs.forEach(s => userIds.push(s.userId));
      }
    }

    // Load users matching list
    const filter = isSearchPerformed ? { _id: { $in: userIds } } : {};
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });

    // Populate subscriptions for each loaded user
    const usersWithSubscriptions = await Promise.all(
      users.map(async (u) => {
        const sub = await Subscription.findOne({ userId: u._id });
        const payments = await Payment.find({ userId: u._id }).sort({ createdAt: -1 });
        return {
          user: u,
          subscription: sub ? {
            plan: sub.plan,
            status: sub.status,
            expiryDate: sub.expiryDate,
            startDate: sub.startDate
          } : { plan: 'FREE', status: 'NONE' },
          payments
        };
      })
    );

    res.status(200).json(usersWithSubscriptions);
  } catch (error) {
    logger.error('Search users failed: %O', error);
    res.status(500).json({ error: 'Failed to search user database.' });
  }
};

// 3. Cancel Subscription Manually
exports.cancelSubscription = async (req, res) => {
  const { userId } = req.body;
  try {
    const sub = await Subscription.findOne({ userId });
    if (!sub) {
      return res.status(404).json({ error: 'Subscription not found for this user.' });
    }

    sub.status = 'CANCELLED';
    sub.plan = 'FREE';
    sub.expiryDate = new Date(); // expire immediately
    await sub.save();

    logger.info(`Subscription manually terminated for User ID: ${userId} by Admin`);
    res.status(200).json({ message: 'Subscription successfully cancelled.' });
  } catch (error) {
    logger.error('Admin cancel subscription error: %O', error);
    res.status(500).json({ error: 'Failed to cancel subscription.' });
  }
};

// 4. Force Delete User
exports.deleteUser = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Delete associated data
    await User.deleteOne({ _id: userId });
    await Subscription.deleteOne({ userId });
    await Payment.deleteMany({ userId });
    await Session.deleteMany({ userId });

    logger.info(`User ${user.email} and all database records deleted by Admin.`);
    res.status(200).json({ message: 'User and all related records deleted successfully.' });
  } catch (error) {
    logger.error('Admin delete user error: %O', error);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
};
