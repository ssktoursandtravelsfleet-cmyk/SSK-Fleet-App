/* Firebase Messaging Service Worker for SSK Fleet Driver App */

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Firebase Configuration from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyClXqC2MpxswnyVJn70Qp8C4t1Wn-Zvp2A",
  authDomain: "gen-lang-client-0852847868.firebaseapp.com",
  projectId: "gen-lang-client-0852847868",
  storageBucket: "gen-lang-client-0852847868.firebasestorage.app",
  messagingSenderId: "757999916741",
  appId: "1:757999916741:web:9d86b0667fcc80441082ac"
};

try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // Background message handler
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);

    const title = payload.notification?.title || payload.data?.title || 'SSK Fleet Alert 🔔';
    const body = payload.notification?.body || payload.data?.message || payload.data?.body || 'New alert from fleet management.';
    const notifId = payload.data?.notificationId || payload.data?.id || ('fcm_' + Date.now());
    const driverId = payload.data?.driverId || payload.data?.etmId || '';

    const options = {
      body: body,
      icon: '/ssk_master_logo.png',
      badge: '/ssk_master_logo.png',
      vibrate: [200, 100, 200],
      tag: notifId, // Unique tag prevents duplicate notifications
      renotify: false,
      data: {
        notificationId: notifId,
        driverId: driverId,
        url: '/'
      }
    };

    self.registration.showNotification(title, options);
  });
} catch (err) {
  console.warn('[firebase-messaging-sw.js] Initialization error:', err);
}

// Native Push Event listener fallback
self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw.js] Received native push event');
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.notification?.title || data.data?.title || 'SSK Fleet Alert 🔔';
    const body = data.notification?.body || data.data?.message || data.data?.body || 'New alert from fleet management.';
    const notifId = data.data?.notificationId || data.data?.id || ('push_' + Date.now());

    const options = {
      body: body,
      icon: '/ssk_master_logo.png',
      badge: '/ssk_master_logo.png',
      vibrate: [200, 100, 200],
      tag: notifId,
      renotify: false,
      data: {
        notificationId: notifId,
        url: '/'
      }
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('[firebase-messaging-sw.js] Push parse error:', err);
  }
});

// Handle notification click -> Focus or Open Driver App PWA
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event.notification.tag);
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
