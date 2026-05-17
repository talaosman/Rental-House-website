import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// Replace with YOUR Firebase project config
// Found at: Firebase Console → Project Settings → General → Your apps
const firebaseConfig = {
  apiKey: "AIzaSyBS9-reeuqAokXmqrK9HzxltCZ9ZD5Wky0",
  authDomain: "renthub-notifications.firebaseapp.com",
  projectId: "renthub-notifications",
  storageBucket: "renthub-notifications.firebasestorage.app",
  messagingSenderId: "456493577783",
  appId: "1:456493577783:web:d26b32a0d847f9fa7bf1b2",
  measurementId: "G-3FS56D1SQC"
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

// Your VAPID key — found at:
// Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
const VAPID_KEY = "BNwLn1efR6532alEK5Lojz6PUWZxIIXNCZY5GIii3bOQ_lTa0szlRQaIB5Jr7zj9UHWB-_1c7uo5kdvE9TiSygM";

/**
 * Request notification permission and get FCM token.
 * Returns the token string or null if denied.
 */
export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.log("🔕 Notification permission denied");
      return null;
    }

    const registration = await navigator.serviceWorker.ready;

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (token) {
      console.log("✅ FCM Token:", token);
      return token;
    } else {
      console.log("⚠️ No FCM token available");
      return null;
    }
  } catch (error) {
    console.error("❌ Error getting FCM token:", error);
    return null;
  }
};

/**
 * Listen for foreground messages (when app is open).
 */
export const onForegroundMessage = (callback) => {
  return onMessage(messaging, callback);
};