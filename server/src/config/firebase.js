const admin = require('firebase-admin');
const { getAuth } = require('firebase-admin/auth');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';
const fullPath = path.resolve(serviceAccountPath);

let firebaseAdmin = null;

if (fs.existsSync(fullPath)) {
  try {
    const serviceAccount = require(fullPath);
    firebaseAdmin = admin.initializeApp({
      credential: admin.cert(serviceAccount)
    });
    logger.info('Firebase Admin SDK initialized successfully.');
  } catch (error) {
    logger.error('Failed to parse Firebase service account key: %O', error);
  }
} else {
  logger.warn(`Firebase service account file not found at ${serviceAccountPath}. Google Login will use a mock token decoder for local development.`);
}

// Fallback Google Login verifier for mock testing if firebase-admin is not initialized
const verifyGoogleToken = async (idToken) => {
  if (firebaseAdmin) {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    return {
      email: decodedToken.email,
      name: decodedToken.name || decodedToken.email.split('@')[0],
      picture: decodedToken.picture || 'avatar3.png',
      email_verified: decodedToken.email_verified
    };
  } else {
    // Local developer fallback: decode payload from JWT idToken directly without verification
    try {
      const base64Url = idToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        Buffer.from(base64, 'base64')
          .toString()
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const parsed = JSON.parse(jsonPayload);
      logger.info('Mock decoded Google Auth Token for: %s', parsed.email);
      return {
        email: parsed.email,
        name: parsed.name || parsed.email.split('@')[0],
        picture: parsed.picture || 'avatar3.png',
        email_verified: true
      };
    } catch (err) {
      throw new Error('Invalid Google login ID token structure (mock verification failed)');
    }
  }
};

module.exports = { verifyGoogleToken };
