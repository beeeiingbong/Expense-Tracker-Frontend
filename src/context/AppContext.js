import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { currentMonth } from '../utils/format';
import { useAuth } from './AuthContext';

const Ctx = createContext(null);

// Shared month (every tab looks at the same month) and the pending-SMS badge count.
export function AppProvider({ children }) {
  const { status } = useAuth();
  const [month, setMonth] = useState(currentMonth());
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPending = useCallback(async () => {
    try { const r = await api.sms.pending(); setPendingCount((r.pendingList || []).length); } catch {}
  }, []);

  useEffect(() => { if (status === 'in') refreshPending(); }, [status, refreshPending]);

  const value = useMemo(
    () => ({ month, setMonth, pendingCount, setPendingCount, refreshPending }),
    [month, pendingCount, refreshPending]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useApp = () => useContext(Ctx);
