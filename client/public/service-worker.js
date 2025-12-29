/* eslint-disable no-restricted-globals */
/* global self */

console.log('🔧 Service Worker loaded');

self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activated');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('📨 Push notification received!', event);

  let notificationData = {
    title: 'New Message',
    body: 'You have a new message',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: { url: '/' }
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('📦 Payload:', payload);
      notificationData = {
        title: payload.title || notificationData.title,
        body: payload.body || notificationData.body,
        icon: payload.icon || notificationData.icon,
        badge: payload.badge || notificationData.badge,
        data: payload.data || notificationData.data,
        tag: 'message-notification',
        requireInteraction: true,
        vibrate: [200, 100, 200]
      };
    } catch (error) {
      console.error('❌ Error parsing payload:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      data: notificationData.data,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      vibrate: notificationData.vibrate
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ Notification clicked');
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});
