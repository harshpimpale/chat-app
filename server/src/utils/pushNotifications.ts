import webpush from 'web-push';
import User from '../models/User.js';
import dotenv from 'dotenv';

// IMPORTANT: Load .env FIRST before any other imports
dotenv.config();

// Configure VAPID only if keys are available
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:[email protected]';
// console.log('🔑 VAPID Public Key:', vapidPublicKey);
// console.log('🔑 VAPID Private Key:', vapidPrivateKey ? '****' : 'Not Set');

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    vapidEmail,
    vapidPublicKey,
    vapidPrivateKey
  );
  console.log('✅ VAPID configured successfully');
} else {
  console.log(process.env.PORT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY, process.env.MONGODB_URI);
  console.warn('⚠️  VAPID keys not configured. Push notifications will not work.');
  console.warn('Generate keys with: npx web-push generate-vapid-keys');
}

export async function sendPushNotification(userId: string, payload: {
  title: string;
  body: string;
  data?: any;
}) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('Push notification skipped: VAPID keys not configured');
    return false;
  }

  try {
    const user = await User.findById(userId);
    
    if (!user || !user.pushSubscription) {
      console.log(`User ${userId} has no push subscription`);
      return false;
    }
    
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      data: payload.data || {},
      timestamp: Date.now()
    });
    
    await webpush.sendNotification(user.pushSubscription, notificationPayload, {
      TTL: 86400,
      urgency: 'high'
    });
    
    console.log(`✅ Push notification sent to user ${userId}`);
    return true;
  } catch (error: any) {
    console.error('Error sending push notification:', error);
    
    // If subscription expired, remove it
    if (error.statusCode === 410) {
      await User.findByIdAndUpdate(userId, { $unset: { pushSubscription: 1 } });
    }
    
    return false;
  }
}
