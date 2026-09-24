import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { api, setAccessToken, setRefreshToken, clearTokens, setOnAuthFail } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { id, email, roles[], permissions[] }
  const [ready, setReady] = useState(false);
  const booted = useRef(false);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    clearTokens();
    setUser(null);
  }, []);

  useEffect(() => { setOnAuthFail(() => { clearTokens(); setUser(null); }); }, []);

  const login = useCallback(async (identifier, password) => {
    const { data } = await api.post('/auth/login', { identifier, password });
    setAccessToken(data.accessToken);
    if (data.refreshToken) setRefreshToken(data.refreshToken);
    const me = await api.get('/auth/me');
    setUser(me.data.user);
    return me.data.user;
  }, []);

  // F5 không văng login: thử xoay refresh cookie (httpOnly, còn hạn 30 ngày)
  // để lấy access mới rồi nạp lại /me. Thất bại -> ở trang đăng nhập.
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    (async () => {
      try {
        const { data } = await api.post('/auth/refresh', {});
        setAccessToken(data.accessToken);
        if (data.refreshToken) setRefreshToken(data.refreshToken);
        const me = await api.get('/auth/me');
        setUser(me.data.user);
      } catch {
        clearTokens();
        setUser(null);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const can = useCallback((...codes) => {
    if (!user) return false;
    if (user.roles?.includes('super_admin')) return true;
    return codes.some((c) => user.permissions?.includes(c));
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, can, ready }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
