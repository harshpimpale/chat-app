import webpush from 'web-push';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:[email protected]';

console.log('🔑 Checking VAPID configuration...');
console.log('  - Public key exists:', !!vapidPublicKey);
console.log('  - Public key length:', vapidPublicKey?.length);
console.log('  - Private key exists:', !!vapidPrivateKey);
console.log('  - Email:', vapidEmail);

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    vapidEmail,
    vapidPublicKey,
    vapidPrivateKey
  );
  console.log('✅ VAPID configured successfully');
} else {
  console.error('❌ VAPID keys not configured!');
  console.error('Generate with: node -e "const webpush = require(\'web-push\'); const keys = webpush.generateVAPIDKeys(); console.log(\'VAPID_PUBLIC_KEY=\' + keys.publicKey); console.log(\'VAPID_PRIVATE_KEY=\' + keys.privateKey);"');
}

export async function sendPushNotification(userId: string, payload: {
  title: string;
  body: string;
  data?: any;
}): Promise<boolean> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('⚠️ Push notification skipped: VAPID keys not configured');
    return false;
  }

  try {
    console.log(`📢 Sending push to user: ${userId}`);
    
    const user = await User.findById(userId);
    
    if (!user) {
      console.log(`⚠️ User ${userId} not found`);
      return false;
    }
    
    if (!user.pushSubscription) {
      console.log(`⚠️ User ${userId} has no push subscription`);
      return false;
    }

    // ✅ FIXED: Safely log endpoint
    const endpoint = user.pushSubscription.endpoint || 'unknown';
    console.log(`✅ User has subscription, endpoint: ${endpoint.substring(0, 50)}...`);

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: 'message-notification',
      requireInteraction: true,
      vibrate: [200, 100, 200],
      data: payload.data || {},
      timestamp: Date.now()
    });

    console.log(`📤 Sending notification:`, {
      title: payload.title,
      body: payload.body.substring(0, 50)
    });

    await webpush.sendNotification(
      user.pushSubscription, 
      notificationPayload, 
      {
        TTL: 86400, // 24 hours
        urgency: 'high'
      }
    );

    console.log(`✅✅✅ Push notification sent successfully to user ${userId}`);
    return true;
    
  } catch (error: any) {
    console.error('❌ Error sending push notification:', error.message);
    console.error('  - Status code:', error.statusCode);
    console.error('  - Body:', error.body);
    
    // If subscription expired (410 Gone), remove it
    if (error.statusCode === 410) {
      console.log(`🗑️ Removing expired subscription for user ${userId}`);
      await User.findByIdAndUpdate(userId, { $unset: { pushSubscription: 1 } });
    }
    
    return false;
  }
}
