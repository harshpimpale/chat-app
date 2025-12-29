import { notificationAPI } from './api';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const subscribeToPushNotifications = async () => {
  try {
    console.log('🔔 Starting push notification subscription...');

    // Check if service worker is supported
    if (!('serviceWorker' in navigator)) {
      console.warn('⚠️ Service workers are not supported');
      return;
    }

    if (!('PushManager' in window)) {
      console.warn('⚠️ Push notifications are not supported');
      return;
    }

    // Wait for service worker to be ready
    console.log('⏳ Waiting for service worker...');
    const registration = await navigator.serviceWorker.ready;
    console.log('✅ Service Worker ready:', registration.scope);

    // Check notification permission
    let permission = Notification.permission;
    console.log('🔔 Current notification permission:', permission);

    if (permission === 'default') {
      console.log('📢 Requesting notification permission...');
      permission = await Notification.requestPermission();
      console.log('📢 Permission result:', permission);
    }

    if (permission !== 'granted') {
      console.warn('⚠️ Notification permission denied');
      return;
    }

    // Get VAPID public key from server
    console.log('🔑 Fetching VAPID public key...');
    const response = await fetch(
      `${(import.meta as any).env.VITE_API_URL || 'http://localhost:5000'}/api/notifications/vapid-public-key`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get VAPID key: ${response.status}`);
    }

    const { publicKey } = await response.json();
    console.log('✅ VAPID public key received:', publicKey.substring(0, 20) + '...');

    // Check existing subscription
    let subscription = await registration.pushManager.getSubscription();
    console.log('🔍 Existing subscription:', subscription ? 'Found' : 'None');

    if (subscription) {
      console.log('✅ Already subscribed, sending to server...');
    } else {
      // Subscribe to push notifications
      console.log('📝 Creating new push subscription...');
      
      const applicationServerKey = urlBase64ToUint8Array(publicKey);
      
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource
      });
      
      console.log('✅ Push subscription created');
    }

    // Send subscription to server
    console.log('📤 Sending subscription to server...');
    const subscribeResponse = await fetch(
      `${(import.meta as any).env.VITE_API_URL || 'http://localhost:5000'}/api/notifications/subscribe`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ subscription })
      }
    );

    if (!subscribeResponse.ok) {
      throw new Error(`Failed to save subscription: ${subscribeResponse.status}`);
    }

    console.log('✅✅✅ Push notifications fully set up!');
  } catch (error) {
    console.error('❌ Error subscribing to push notifications:', error);
    throw error;
  }
};

export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      await notificationAPI.unsubscribe();
      console.log('✅ Unsubscribed from push notifications');
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return false;
  }
}
