/**
 * baseAPI.js — Axios instance for React Native
 *
 * BASE URL STRATEGY
 * ─────────────────────────────────────────────────────────────────
 *  Development (Expo Go / dev build):
 *    Constants.expoConfig.hostUri is the Expo Metro bundler address,
 *    e.g. "192.168.1.12:8081".  We strip the port and append :5000 to
 *    reach the Spring Boot backend running on the same machine.
 *    This works on any network — no hardcoded IP needed.
 *
 *  Emulator fallbacks (when hostUri is not available):
 *    Android emulator  → http://10.0.2.2:5000
 *    iOS simulator     → http://localhost:5000
 *
 *  Production:
 *    Set PRODUCTION_URL below and it will be used automatically
 *    in non-dev builds (__DEV__ === false).
 * ─────────────────────────────────────────────────────────────────
 */

import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ─── Config ───────────────────────────────────────────────────────
const BACKEND_PORT  = 5000;
const PRODUCTION_URL = 'https://your-api-domain.com'; // ← fill in when deploying

// ─── Base URL resolver ────────────────────────────────────────────
function resolveBaseURL() {
  // Production builds: use explicit URL
  if (!__DEV__) return PRODUCTION_URL;

  // Expo Go / dev build: hostUri = Metro bundler host + port
  // e.g. "192.168.1.12:8081" → backend is on the same machine at :5000
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0]; // strip ":8081"
    if (host) return `http://${host}:${BACKEND_PORT}`;
  }

  // Simulator / emulator fallbacks (no hostUri in those environments)
  if (Platform.OS === 'android') return `http://10.0.2.2:${BACKEND_PORT}`;
  return `http://localhost:${BACKEND_PORT}`;
}

export const BASE_URL = resolveBaseURL();

// ── Startup diagnostic ────────────────────────────────────────────
if (__DEV__) {
  console.log(`[API] Base URL → ${BASE_URL}`);
}

// ─── Axios instance ───────────────────────────────────────────────
const API = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ─── Request interceptor ──────────────────────────────────────────
API.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error),
);

// ─── Response interceptor ────────────────────────────────────────
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (__DEV__) {
      console.warn(
        '[API Error]',
        error.config?.method?.toUpperCase(),
        error.config?.url,
        '→',
        error.response?.status,
        error.response?.data ?? error.message,
      );
    }
    return Promise.reject(error);
  },
);

/**
 * Attach a Basic Auth header to every subsequent request.
 * Call this once after a successful login.
 */
export function setAuthHeader(base64Token) {
  if (base64Token) {
    API.defaults.headers.common['Authorization'] = `Basic ${base64Token}`;
  } else {
    delete API.defaults.headers.common['Authorization'];
  }
}

/** Remove auth header on logout. */
export function clearAuthHeader() {
  delete API.defaults.headers.common['Authorization'];
}

export default API;
