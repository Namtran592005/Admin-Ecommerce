import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1/api';

let accessToken = null;
let refreshToken = null; // RAM — fallback khi cookie refresh bị chặn cross-site (dev)
export const setAccessToken = (t) => { accessToken = t; };
export const setRefreshToken = (t) => { refreshToken = t; };
export const clearTokens = () => { accessToken = null; refreshToken = null; };

export const api = axios.create({ baseURL: API_BASE, withCredentials: true, timeout: 30000 });

api.interceptors.request.use((cfg) => {
  if (accessToken) cfg.headers.Authorization = 'Bearer ' + accessToken;
  return cfg;
});

// Tự refresh khi 401 (1 lần), refresh hỏng -> đá về /login
let refreshing = null;
let onAuthFail = () => {};
export const setOnAuthFail = (fn) => { onAuthFail = fn; };

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const req = err.config || {};
    if (err.response?.status === 401 && !req._retried && !req.url?.includes('/auth/refresh')) {
      req._retried = true;
      try {
        refreshing ||= axios.post(API_BASE + '/auth/refresh',
          refreshToken ? { refresh_token: refreshToken } : {},
          { withCredentials: true })
          .then((r) => {
            setAccessToken(r.data.accessToken);
            if (r.data.refreshToken) setRefreshToken(r.data.refreshToken);
          })
          .finally(() => { refreshing = null; });
        await refreshing;
        return api(req);
      } catch (e) {
        onAuthFail();
        throw e;
      }
    }
    throw err;
  }
);

export const errMsg = (e, fallback = 'Có lỗi xảy ra') =>
  e?.response?.data?.error || e?.message || fallback;

export const fmtVND = (n) =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Number(n || 0)) + ' ₫';

export const fmtDate = (s) => {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
};
