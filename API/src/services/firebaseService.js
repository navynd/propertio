const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const { logger } = require('../utils/logger');

const initFirebaseAdmin = () => {
  if (admin.apps.length) {
    return admin;
  }

  let serviceAccountJson = null;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    serviceAccountJson = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    if (serviceAccountJson.private_key) {
      serviceAccountJson.private_key = serviceAccountJson.private_key.replace(/\\n/g, '\n');
    }
  }

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const googleApplicationCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (serviceAccountJson) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountJson),
    });
    logger.info('Firebase initialized from JSON blob');
    return admin;
  }

  if (serviceAccountPath) {
    const resolvedPath = path.isAbsolute(serviceAccountPath)
      ? serviceAccountPath
      : path.resolve(process.cwd(), serviceAccountPath);
    const raw = fs.readFileSync(resolvedPath, 'utf-8');
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(raw)),
    });
    logger.info('Firebase initialized from service account file');
    return admin;
  }

  if (googleApplicationCredentials) {
    admin.initializeApp();
    logger.info('Firebase initialized using GOOGLE_APPLICATION_CREDENTIALS');
    return admin;
  }

  throw new Error('Firebase service account credentials are not configured');
};

const verifyFirebaseIdToken = async (idToken) => {
  if (!idToken) {
    throw new Error('Firebase ID token is required');
  }

  const fbAdmin = initFirebaseAdmin();
  return fbAdmin.auth().verifyIdToken(idToken);
};

const sendPushNotificationToToken = async ({
  token,
  title = 'Estatehub Test',
  body = 'Test push notification from API',
  data = {},
  webpush = {},
}) => {
  if (!token) {
    throw new Error('FCM token is required');
  }

  const fbAdmin = initFirebaseAdmin();

  const message = {
    token,
    notification: { title, body },
    data: Object.entries(data || {}).reduce((acc, [key, value]) => {
      if (value === null || value === undefined) return acc;
      acc[String(key)] = String(value);
      return acc;
    }, {}),
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
          contentAvailable: true,
        },
      },
    },
    webpush: {
      notification: {
        icon: '/favicon.ico',
        ...((webpush && webpush.notification) || {}),
      },
      fcmOptions: (webpush && webpush.fcmOptions) || undefined,
    },
  };

  return fbAdmin.messaging().send(message);
};

module.exports = {
  verifyFirebaseIdToken,
  sendPushNotificationToToken,
};

