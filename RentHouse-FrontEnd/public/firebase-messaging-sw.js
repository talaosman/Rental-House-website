// eslint-disable-next-line no-undef
importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js");
// eslint-disable-next-line no-undef
importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js");

// Same config as firebase.js
// eslint-disable-next-line no-undef
firebase.initializeApp({
  apiKey: "AIzaSyBS9-reeuqAokXmqrK9HzxltCZ9ZD5Wky0",
  authDomain: "renthub-notifications.firebaseapp.com",
  projectId: "renthub-notifications",
  storageBucket: "renthub-notifications.firebasestorage.app",
  messagingSenderId: "456493577783",
  appId: "1:456493577783:web:d26b32a0d847f9fa7bf1b2",
  measurementId: "G-3FS56D1SQC"
});

// eslint-disable-next-line no-undef
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log("📨 Background message received:", payload);

  const { title, body } = payload.notification;
  const houseId = payload.data?.houseId;

  // eslint-disable-next-line no-restricted-globals
  self.registration.showNotification(title, {
    body: body,
    icon: "/logo192.png",
    badge: "/logo192.png",
    data: { houseId },
    actions: [
      { action: "view", title: "View Property" },
      { action: "dismiss", title: "Dismiss" }
    ]
  });
});

// Handle notification click
// eslint-disable-next-line no-restricted-globals
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "view" || !event.action) {
    const houseId = event.notification.data?.houseId;
    const url = houseId
      ? `http://localhost:3000/property/${houseId}`
      : "http://localhost:3000";

    // eslint-disable-next-line no-undef
    event.waitUntil(clients.openWindow(url));
  }
});