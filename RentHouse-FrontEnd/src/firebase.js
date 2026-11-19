import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getAuth, GoogleAuthProvider, GithubAuthProvider, signInWithPopup, signOut } from "firebase/auth";

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

// ── Social sign-in (Google / GitHub) via Firebase Authentication ──────────
// Works without our own backend. Providers must be enabled in the Firebase
// console (Authentication → Sign-in method) and the site's domain listed under
// Authentication → Settings → Authorized domains.
const auth = getAuth(app);

export const signInWithSocial = async (providerName) => {
  const provider = providerName === "github" ? new GithubAuthProvider() : new GoogleAuthProvider();
  if (providerName === "github") provider.addScope("user:email");
  else provider.setCustomParameters({ prompt: "select_account" });

  const { user } = await signInWithPopup(auth, provider);
  const info = user.providerData[0] || {};
  const email = user.email || info.email;
  if (!email) throw Object.assign(new Error("Your account has no public email address."), { code: "app/no-email" });

  await signOut(auth); // we keep our own session in localStorage
  return {
    email,
    username: user.displayName || info.displayName || email.split("@")[0],
    profileImage: user.photoURL || info.photoURL || null,
    provider: providerName,
  };
};
export { messaging };