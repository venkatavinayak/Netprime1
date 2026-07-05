const { createClerkClient, verifyToken } = require('@clerk/backend');
const logger = require('../utils/logger');

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY
});

const verifyClerkSession = async (sessionToken) => {
  if (!sessionToken) {
    throw new Error('Missing Clerk session token');
  }

  const payload = await verifyToken(sessionToken, {
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY
  });

  const clerkUser = await clerkClient.users.getUser(payload.sub);

  const primaryEmail = clerkUser.emailAddresses?.find(
    email => email.id === clerkUser.primaryEmailAddressId
  ) || clerkUser.emailAddresses?.[0];

  if (!primaryEmail?.emailAddress) {
    throw new Error('Clerk user does not have an email address.');
  }

  return {
    clerkUserId: clerkUser.id,
    email: primaryEmail.emailAddress.toLowerCase(),
    name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ')
      || clerkUser.username
      || primaryEmail.emailAddress.split('@')[0],
    avatar: clerkUser.imageUrl || 'avatar1.png'
  };
};

module.exports = { verifyClerkSession };