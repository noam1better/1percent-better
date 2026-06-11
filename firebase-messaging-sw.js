// Firebase Messaging Service Worker
// Must be at root scope so FCM can deliver background messages.
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "AIzaSyDKXFsfZnd_vOXDCQI2Uhd_3Mb9WSAELu4",
  authDomain:        "better-de9aa.firebaseapp.com",
  projectId:         "better-de9aa",
  storageBucket:     "better-de9aa.firebasestorage.app",
  messagingSenderId: "258398205758",
  appId:             "1:258398205758:web:1036871563b0119fc11e6f",
  measurementId:     "G-MJTZP4CKGM",
});

const messaging = firebase.messaging();

// Background message handler — app is closed or in background
messaging.onBackgroundMessage(payload => {
  const title   = payload.notification?.title || '1% Better 🔥';
  const options = {
    body:    payload.notification?.body  || 'הרצף שלך מחכה לך — בוא תוכיח את זה',
    icon:    payload.notification?.icon  || '/icon-192.png',
    badge:   '/icon-192.png',
    tag:     payload.data?.tag           || 'daily-reminder',
    data:    { url: payload.data?.url    || '/' },
    vibrate: [100, 50, 100],
    requireInteraction: false,
  };
  return self.registration.showNotification(title, options);
});
