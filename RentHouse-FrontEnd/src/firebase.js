import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBS9-reeuqAokXmqrK9HzxltCZ9ZD5Wky0",
  authDomain: "renthub-notifications.firebaseapp.com",
  projectId: "renthub-notifications",
  storageBucket: "renthub-notifications.firebasestorage.app",
  messagingSenderId: "456493577783",
  appId: "1:456493577783:web:d26b32a0d847f9fa7bf1b2"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js", { scope: "/" }
    );
    await navigator.serviceWorker.ready;

    console.log("🔥 Getting FCM token...");
    const token = await getToken(messaging, {
      vapidKey: "BCQ8FwD3ybKRBoOqXxW_75LzHasYVtu-lBQOcYO3sn3AYB7wRnx6gq-rOufzsNGnrcb1Z_GeHxndFArz3bZCuIc",
      serviceWorkerRegistration: registration
    });

    console.log("✅ Token:", token);
    return token || null;

  } catch (err) {
    console.error("❌ FCM error:", err.message);
    return null;
  }
};

export const onForegroundMessage = (callback) => onMessage(messaging, callback);
export { messaging };