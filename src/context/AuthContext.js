import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import {
  cacheUser, clearSession, getCachedUser, getTokens, saveTokens, setAuthLostHandler,
} from '../api/client';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | out | in

  const signOut = useCallback(async () => {
    try {
      const { refresh } = await getTokens();
      if (refresh) await api.auth.logout(refresh);
    } catch {}
    await clearSession();
    setUser(null);
    setStatus('out');
  }, []);

  useEffect(() => {
    setAuthLostHandler(() => { setUser(null); setStatus('out'); });
    (async () => {
      const { refresh } = await getTokens();
      if (!refresh) return setStatus('out');
      setUser(await getCachedUser());
      setStatus('in'); // stay signed in across app restarts
      try {
        const me = await api.users.me(); // silently refreshes the access token if it expired
        setUser((u) => ({ ...u, ...me }));
        cacheUser(me);
      } catch {} // a dead session is handled by setAuthLostHandler
    })();
  }, []);

  const completeLogin = useCallback(async ({ user: u, accessToken, refreshToken }) => {
    await saveTokens({ accessToken, refreshToken });
    await cacheUser(u);
    setUser(u);
    setStatus('in');
  }, []);

  const value = useMemo(() => ({ user, status, completeLogin, signOut }), [user, status, completeLogin, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
