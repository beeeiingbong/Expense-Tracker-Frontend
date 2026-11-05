import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { API_URL } from '../config';

const K = { access: 'et_access', refresh: 'et_refresh', device: 'et_device_id', user: 'et_user' };

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

let onAuthLost = null;
export const setAuthLostHandler = (fn) => { onAuthLost = fn; };

export async function getDeviceId() {
  let id = await SecureStore.getItemAsync(K.device);
  if (!id) {
    id = `${Platform.OS}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    await SecureStore.setItemAsync(K.device, id);
  }
  return id;
}
export const getDeviceName = () => Device.deviceName || Device.modelName || `${Platform.OS} device`;

export async function getTokens() {
  const [access, refresh] = await Promise.all([
    SecureStore.getItemAsync(K.access),
    SecureStore.getItemAsync(K.refresh),
  ]);
  return { access, refresh };
}
export async function saveTokens({ accessToken, refreshToken }) {
  if (accessToken) await SecureStore.setItemAsync(K.access, accessToken);
  if (refreshToken) await SecureStore.setItemAsync(K.refresh, refreshToken);
}
export async function cacheUser(user) {
  try { await SecureStore.setItemAsync(K.user, JSON.stringify(user)); } catch {}
}
export async function getCachedUser() {
  try { const v = await SecureStore.getItemAsync(K.user); return v ? JSON.parse(v) : null; } catch { return null; }
}
export async function clearSession() {
  await Promise.all([K.access, K.refresh, K.user].map((k) => SecureStore.deleteItemAsync(k).catch(() => {})));
}

// One refresh at a time, even if several requests hit a 401 together.
let refreshing = null;
function refreshAccessToken() {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const refreshToken = await SecureStore.getItemAsync(K.refresh);
    if (!refreshToken) throw new ApiError('Session expired', 401);
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken, deviceId: await getDeviceId(), deviceName: getDeviceName() }),
    }).catch(() => { throw new ApiError("Can't reach the server.", 0); });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.accessToken) throw new ApiError('Session expired', 401);
    await saveTokens(data);
    return data.accessToken;
  })().finally(() => { refreshing = null; });
  return refreshing;
}

const qs = (query) => {
  if (!query) return '';
  const parts = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  return parts.length ? `?${parts.join('&')}` : '';
};

async function send(path, { method, body, token, query }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    return await fetch(`${API_URL}${path}${qs(query)}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
  } catch (e) {
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
  } finally {
    clearTimeout(timer);
  }
}

export async function request(path, { method = 'GET', body, query, auth = true } = {}) {
  let token = auth ? await SecureStore.getItemAsync(K.access) : null;
  let res = await send(path, { method, body, token, query });

  // Expired access token: refresh once, then retry the original request.
  if (res.status === 401 && auth) {
    try {
      token = await refreshAccessToken();
      res = await send(path, { method, body, token, query });
    } catch (e) {
      if (e.status === 401) {
        await clearSession();
        onAuthLost && onAuthLost();
        throw new ApiError('Your session expired. Please sign in again.', 401);
      }
      throw e;
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (typeof data?.message === 'string' && data.message) ||
      (typeof data?.error === 'string' && data.error) ||
      (Array.isArray(data?.errors) && (data.errors[0]?.message || String(data.errors[0]))) ||
      `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, data);
  }
  return data;
}
