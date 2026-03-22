/**
 * AuthContext.js — React Native Auth Context
 *
 * Replaces every direct localStorage.* call across the app with a single
 * source of truth backed by AsyncStorage. All state is loaded into memory
 * on mount, so every consumer gets synchronous access to auth values —
 * exactly the same API as the web's localStorage, but without the I/O
 * on every read.
 *
 * SETUP
 * ─────
 * 1. Install the package:
 *      npx expo install @react-native-async-storage/async-storage
 *    or (bare RN):
 *      npm install @react-native-async-storage/async-storage
 *      npx pod-install          # iOS only
 *
 * 2. Wrap your root component:
 *      import { AuthProvider } from './context/AuthContext';
 *      <AuthProvider>
 *        <App />
 *      </AuthProvider>
 *
 * 3. Use in any component:
 *      import { useAuth } from './context/AuthContext';
 *      const { userId, isLoggedIn, loginUser, logout } = useAuth();
 *
 * NOTE ON btoa
 * ────────────
 * btoa() is available in Hermes (React Native ≥ 0.70).
 * For older projects add:  npm install base-64
 * Then swap the import:    import { encode as btoa } from 'base-64';
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthHeader, clearAuthHeader } from '../api/baseAPI';

// ─── AsyncStorage key constants ───────────────────────────────────────────────
// One place for every key name so typos are impossible.
const KEYS = {
  // Permanent session (set on login / OAuth, cleared on logout)
  USER_ID:       'userId',
  USERNAME:      'username',
  EMAIL:         'email',
  PASSWORD:      'password',       // kept for Basic-Auth reconstruction
  PHONE_NUMBER:  'phoneNumber',
  PROFILE_IMAGE: 'profileImage',
  USER_ROLE:     'userRole',
  IS_LOGGED_IN:  'isLoggedIn',
  AUTH_HEADER:   'authHeader',

  // OTP signup flow (temporary — cleared after verifyOtp succeeds)
  PENDING_LOGIN:    'pendingLogin',
  TEMP_USER_DATA:   'tempUserData',
  PENDING_EMAIL:    'pendingEmail',
  PENDING_PASSWORD: 'pendingPassword',

  // In-app navigation state
  // NOTE: In a fully-migrated RN app these should be React Navigation
  // route params instead. Kept here to preserve the web API surface.
  VISIT_HOUSE_ID:   'visitHouseId',
  STRIPE_START_DATE: 'stripeStartDate',
  STRIPE_END_DATE:   'stripeEndDate',
};

// ─── Default/empty auth state ─────────────────────────────────────────────────
const DEFAULT_STATE = {
  // Auth flags
  isLoggedIn: false,
  isLoading:  true,   // true while AsyncStorage is being read on first mount

  // User fields (mirrors every localStorage key the web app uses)
  userId:       null,
  username:     '',
  email:        '',
  password:     '',
  phoneNumber:  '',
  profileImage: '',
  userRole:     null,   // 'USER' | 'ADMIN' | null
  authHeader:   '',

  // OTP temp state (only populated between signup and OTP verification)
  pendingLogin:    false,
  tempUserData:    null,
  pendingEmail:    '',
  pendingPassword: '',

  // Navigation / session state
  visitHouseId:    null,
  stripeStartDate: null,
  stripeEndDate:   null,
};

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext(DEFAULT_STATE);

// ─── Helper: build Basic Auth header ─────────────────────────────────────────
function buildAuthHeader(email, password) {
  // btoa is available in Hermes (RN ≥ 0.70).
  // For older RN: import { encode as btoa } from 'base-64';
  return 'Basic ' + btoa(`${email}:${password}`);
}

// ─── Helper: batch AsyncStorage write ────────────────────────────────────────
// Converts a plain object into the [[key, value]] pairs AsyncStorage.multiSet expects.
async function multiSet(map) {
  const pairs = Object.entries(map)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]);
  if (pairs.length) await AsyncStorage.multiSet(pairs);
}

// ─── Helper: default avatar URL ──────────────────────────────────────────────
function defaultAvatar(username) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(username || 'User')}&background=random`;
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(DEFAULT_STATE);

  // Guard against updating state after unmount
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const safeSet = useCallback((updater) => {
    if (mounted.current) setAuth(updater);
  }, []);

  // ── Load all keys from AsyncStorage on mount ──────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const values = await AsyncStorage.multiGet(Object.values(KEYS));
        // values is [ [key, value|null], ... ] in the same order as KEYS
        const map = {};
        Object.values(KEYS).forEach((key, i) => { map[key] = values[i][1]; });

        const isLoggedIn = map[KEYS.IS_LOGGED_IN] === 'true';
        const authHeader = map[KEYS.AUTH_HEADER] || '';

        // Re-attach auth header on app reload (e.g. after backgrounding)
        if (authHeader) setAuthHeader(authHeader.replace('Basic ', ''));

        safeSet(() => ({
          isLoading: false,
          isLoggedIn,

          userId:       map[KEYS.USER_ID]       || null,
          username:     map[KEYS.USERNAME]       || '',
          email:        map[KEYS.EMAIL]          || '',
          password:     map[KEYS.PASSWORD]       || '',
          phoneNumber:  map[KEYS.PHONE_NUMBER]   || '',
          profileImage: map[KEYS.PROFILE_IMAGE]  || '',
          userRole:     map[KEYS.USER_ROLE]      || null,
          authHeader:   authHeader,

          pendingLogin:    map[KEYS.PENDING_LOGIN]    === 'true',
          pendingEmail:    map[KEYS.PENDING_EMAIL]    || '',
          pendingPassword: map[KEYS.PENDING_PASSWORD] || '',
          tempUserData:    map[KEYS.TEMP_USER_DATA]
            ? JSON.parse(map[KEYS.TEMP_USER_DATA])
            : null,

          visitHouseId:    map[KEYS.VISIT_HOUSE_ID]    || null,
          stripeStartDate: map[KEYS.STRIPE_START_DATE] || null,
          stripeEndDate:   map[KEYS.STRIPE_END_DATE]   || null,
        }));
      } catch (e) {
        if (__DEV__) console.warn('[AuthContext] Failed to load from AsyncStorage:', e);
        safeSet((prev) => ({ ...prev, isLoading: false }));
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── loginUser ─────────────────────────────────────────────────────────────
  /**
   * Call after a successful /api/auth/login response.
   * Stores every user field + sets isLoggedIn = true.
   *
   * Web equivalent (AboutContactPage.js lines 88-99):
   *   localStorage.setItem("userId", id);
   *   localStorage.setItem("authHeader", "Basic " + btoa(...));
   *   ...
   *   localStorage.setItem("isLoggedIn", "true");
   *
   * @param {{ id, role, username, phoneNumber, profileImage }} userData
   *   The response body from POST /api/auth/login
   * @param {{ email: string, password: string }} credentials
   *   The email+password the user typed (needed to build the Basic Auth header)
   */
  const loginUser = useCallback(async (userData, { email, password }) => {
    const { id, role, username, phoneNumber, profileImage } = userData;
    const avatar = profileImage || defaultAvatar(username);
    const header = buildAuthHeader(email, password);

    await multiSet({
      [KEYS.USER_ID]:       String(id),
      [KEYS.AUTH_HEADER]:   header,
      [KEYS.USER_ROLE]:     role,
      [KEYS.USERNAME]:      username,
      [KEYS.EMAIL]:         email,
      [KEYS.PASSWORD]:      password,
      [KEYS.PHONE_NUMBER]:  phoneNumber   || '',
      [KEYS.PROFILE_IMAGE]: avatar,
      [KEYS.IS_LOGGED_IN]:  'true',
    });

    // Wire the Axios instance so every subsequent API call carries the header
    setAuthHeader(header.replace('Basic ', ''));

    safeSet((prev) => ({
      ...prev,
      isLoggedIn:   true,
      userId:       String(id),
      authHeader:   header,
      userRole:     role,
      username:     username,
      email:        email,
      password:     password,
      phoneNumber:  phoneNumber || '',
      profileImage: avatar,
    }));
  }, [safeSet]);

  // ── signupPending ─────────────────────────────────────────────────────────
  /**
   * Call after a successful /api/auth/signup response, BEFORE OTP is verified.
   * Stores temp state so OtpVerificationPage can read pendingEmail etc.
   *
   * Web equivalent (AboutContactPage.js lines 41-55):
   *   localStorage.setItem("pendingLogin", "true");
   *   localStorage.setItem("tempUserData", JSON.stringify(userData));
   *   localStorage.setItem("pendingEmail", email);
   *   localStorage.setItem("pendingPassword", password);
   *   + also pre-stores userId, authHeader, role, username, email, password,
   *     phoneNumber, profileImage (web stores these before OTP — we do too)
   *
   * @param {{ id, role, username, phoneNumber, profileImage }} userData
   * @param {{ email: string, password: string }} credentials
   */
  const signupPending = useCallback(async (userData, { email, password }) => {
    const { id, role, username, phoneNumber, profileImage } = userData;
    const avatar = profileImage || defaultAvatar(username);
    const header = buildAuthHeader(email, password);

    await multiSet({
      // Pre-store user data (mirrors web behavior exactly)
      [KEYS.USER_ID]:          String(id),
      [KEYS.AUTH_HEADER]:      header,
      [KEYS.USER_ROLE]:        role,
      [KEYS.USERNAME]:         username,
      [KEYS.EMAIL]:            email,
      [KEYS.PASSWORD]:         password,
      [KEYS.PHONE_NUMBER]:     phoneNumber || '',
      [KEYS.PROFILE_IMAGE]:    avatar,
      // OTP temp state
      [KEYS.PENDING_LOGIN]:    'true',
      [KEYS.TEMP_USER_DATA]:   JSON.stringify(userData),
      [KEYS.PENDING_EMAIL]:    email,
      [KEYS.PENDING_PASSWORD]: password,
    });

    safeSet((prev) => ({
      ...prev,
      userId:          String(id),
      authHeader:      header,
      userRole:        role,
      username:        username,
      email:           email,
      password:        password,
      phoneNumber:     phoneNumber || '',
      profileImage:    avatar,
      pendingLogin:    true,
      tempUserData:    userData,
      pendingEmail:    email,
      pendingPassword: password,
    }));
  }, [safeSet]);

  // ── completeVerification ──────────────────────────────────────────────────
  /**
   * Call after POST /api/auth/verify-otp succeeds.
   * Promotes the pending signup state to a real logged-in session and
   * removes all OTP temp keys.
   *
   * Web equivalent (OtpVerificationPage.js lines 15-32):
   *   const userData = JSON.parse(localStorage.getItem("tempUserData"));
   *   localStorage.setItem("userId", userData.id); ...
   *   localStorage.setItem("isLoggedIn", "true");
   *   localStorage.removeItem("pendingLogin"); ...
   */
  const completeVerification = useCallback(async () => {
    // Everything was already written by signupPending — just flip the flags.
    await AsyncStorage.setItem(KEYS.IS_LOGGED_IN, 'true');
    await AsyncStorage.multiRemove([
      KEYS.PENDING_LOGIN,
      KEYS.TEMP_USER_DATA,
      KEYS.PENDING_EMAIL,
      KEYS.PENDING_PASSWORD,
    ]);

    // Re-attach auth header (pendingEmail/password already in state)
    safeSet((prev) => {
      const header = prev.authHeader || buildAuthHeader(prev.pendingEmail, prev.pendingPassword);
      setAuthHeader(header.replace('Basic ', ''));

      return {
        ...prev,
        isLoggedIn:      true,
        authHeader:      header,
        pendingLogin:    false,
        tempUserData:    null,
        pendingEmail:    '',
        pendingPassword: '',
      };
    });
  }, [safeSet]);

  // ── loginOAuth ────────────────────────────────────────────────────────────
  /**
   * Call after a successful OAuth callback (OauthSuccess equivalent).
   * Note: full OAuth in React Native requires expo-auth-session or
   * react-native-app-auth — this function only handles the storage side.
   *
   * Web equivalent (OauthSuccess.js lines 23-41):
   *   localStorage.setItem("userId", user.id); ...
   *   localStorage.setItem("isLoggedIn", "true");
   *   if (user.password) localStorage.setItem("password", user.password);
   *
   * @param {{ id, username, email, role, profileImage, password? }} user
   *   The response from GET /api/auth/oauth2/user
   */
  const loginOAuth = useCallback(async (user) => {
    const avatar =
      user.profileImage && user.profileImage !== 'null'
        ? user.profileImage
        : defaultAvatar(user.username);

    const storageMap = {
      [KEYS.USER_ID]:       String(user.id),
      [KEYS.USERNAME]:      user.username || '',
      [KEYS.EMAIL]:         user.email    || '',
      [KEYS.USER_ROLE]:     user.role     || 'USER',
      [KEYS.PROFILE_IMAGE]: avatar,
      [KEYS.IS_LOGGED_IN]:  'true',
    };

    // OAuth users may receive a server-generated password (shown once)
    if (user.password) {
      storageMap[KEYS.PASSWORD] = user.password;
      const header = buildAuthHeader(user.email, user.password);
      storageMap[KEYS.AUTH_HEADER] = header;
      setAuthHeader(header.replace('Basic ', ''));
    }

    await multiSet(storageMap);

    safeSet((prev) => ({
      ...prev,
      isLoggedIn:   true,
      userId:       String(user.id),
      username:     user.username || '',
      email:        user.email    || '',
      userRole:     user.role     || 'USER',
      profileImage: avatar,
      password:     user.password || prev.password,
      authHeader:   storageMap[KEYS.AUTH_HEADER] || prev.authHeader,
    }));
  }, [safeSet]);

  // ── updateProfile ─────────────────────────────────────────────────────────
  /**
   * Update one or more user profile fields in both state and AsyncStorage.
   * Call this after a successful PUT /api/users/update response.
   *
   * Web equivalent (UserProfile.js):
   *   localStorage.setItem("username", userData.fullName);
   *   localStorage.setItem("profileImage", userData.profileImage);
   *   // etc. — one key at a time inside toggleEditing / saveProfileImage
   *
   * @param {{
   *   username?: string,
   *   email?: string,
   *   phoneNumber?: string,
   *   password?: string,
   *   profileImage?: string,
   * }} fields  Only the fields that changed.
   */
  const updateProfile = useCallback(async (fields) => {
    const storageMap = {};

    if (fields.username     !== undefined) storageMap[KEYS.USERNAME]      = fields.username;
    if (fields.email        !== undefined) storageMap[KEYS.EMAIL]         = fields.email;
    if (fields.phoneNumber  !== undefined) storageMap[KEYS.PHONE_NUMBER]  = fields.phoneNumber;
    if (fields.password     !== undefined) storageMap[KEYS.PASSWORD]      = fields.password;
    if (fields.profileImage !== undefined) storageMap[KEYS.PROFILE_IMAGE] = fields.profileImage;

    if (Object.keys(storageMap).length) await multiSet(storageMap);

    safeSet((prev) => ({ ...prev, ...fields }));
  }, [safeSet]);

  // ── logout ────────────────────────────────────────────────────────────────
  /**
   * Clear all stored auth data and reset state.
   *
   * Web equivalent (UserProfile.js line 131-133):
   *   localStorage.clear();
   *   navigate("/");
   *   window.location.reload();
   *
   * Navigation after logout is the caller's responsibility.
   * Example:
   *   const { logout } = useAuth();
   *   const handleLogout = async () => { await logout(); navigation.replace('Login'); };
   */
  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove(Object.values(KEYS));
    clearAuthHeader();
    safeSet(() => ({ ...DEFAULT_STATE, isLoading: false }));
  }, [safeSet]);

  // ── Navigation/session helpers ────────────────────────────────────────────
  /**
   * Save the house ID the user wants to schedule a visit for.
   *
   * Web equivalent (PropertyDetailsPage.js line 392):
   *   localStorage.setItem("visitHouseId", id);
   *
   * NOTE: In a fully-migrated RN app, prefer passing this as a React
   * Navigation route param instead.
   *
   * @param {string|number} id
   */
  const setVisitHouseId = useCallback(async (id) => {
    await AsyncStorage.setItem(KEYS.VISIT_HOUSE_ID, String(id));
    safeSet((prev) => ({ ...prev, visitHouseId: String(id) }));
  }, [safeSet]);

  /**
   * Save the Stripe booking date range before redirecting to payment.
   *
   * Web equivalent (PropertyDetailsPage.js lines 260-261):
   *   localStorage.setItem("stripeStartDate", startDate);
   *   localStorage.setItem("stripeEndDate", calculatedEndDate);
   *
   * @param {{ startDate: string, endDate: string }}
   */
  const setStripeDates = useCallback(async ({ startDate, endDate }) => {
    await multiSet({
      [KEYS.STRIPE_START_DATE]: startDate,
      [KEYS.STRIPE_END_DATE]:   endDate,
    });
    safeSet((prev) => ({ ...prev, stripeStartDate: startDate, stripeEndDate: endDate }));
  }, [safeSet]);

  /**
   * Remove Stripe booking dates after payment is handled.
   *
   * Web equivalent (PropertyDetailsPage.js lines 315-316):
   *   localStorage.removeItem("stripeStartDate");
   *   localStorage.removeItem("stripeEndDate");
   */
  const clearStripeDates = useCallback(async () => {
    await AsyncStorage.multiRemove([KEYS.STRIPE_START_DATE, KEYS.STRIPE_END_DATE]);
    safeSet((prev) => ({ ...prev, stripeStartDate: null, stripeEndDate: null }));
  }, [safeSet]);

  // ── Computed values ───────────────────────────────────────────────────────
  const isAdmin = auth.userRole === 'ADMIN';

  // ── Context value (memoised to prevent unnecessary re-renders) ───────────
  const value = useMemo(() => ({
    // ── State ──────────────────────────────────────────────────────────────
    ...auth,
    isAdmin,

    // ── Auth mutations ──────────────────────────────────────────────────────
    loginUser,
    signupPending,
    completeVerification,
    loginOAuth,
    updateProfile,
    logout,

    // ── Session helpers ─────────────────────────────────────────────────────
    setVisitHouseId,
    setStripeDates,
    clearStripeDates,
  }), [
    auth,
    isAdmin,
    loginUser,
    signupPending,
    completeVerification,
    loginOAuth,
    updateProfile,
    logout,
    setVisitHouseId,
    setStripeDates,
    clearStripeDates,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
/**
 * useAuth — consume the auth context from any component.
 *
 * Usage:
 *   const { userId, isLoggedIn, isAdmin, loginUser, logout } = useAuth();
 *
 * isLoading is true while AsyncStorage is being read on first app launch.
 * Render a splash/loading screen until it's false:
 *
 *   const { isLoading } = useAuth();
 *   if (isLoading) return <SplashScreen />;
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}

export default AuthContext;
