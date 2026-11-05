import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

// Loads data whenever the screen is focused or `deps` change. Keeps old data visible while
// a silent refresh runs, but clears it when `deps` (e.g. the month) change.
export function useLoad(fetcher, deps) {
  const key = deps.join('|');
  const [state, setState] = useState({ data: null, key: null, loading: true, error: null });
  const [refreshing, setRefreshing] = useState(false);
  const seq = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(async () => {
    const id = ++seq.current;
    setState((s) => ({
      data: s.key === key ? s.data : null,
      key,
      loading: s.key !== key || s.data == null,
      error: null,
    }));
    try {
      const data = await fetcher();
      if (id === seq.current) setState({ data, key, loading: false, error: null });
    } catch (e) {
      if (id === seq.current) setState((s) => ({ ...s, loading: false, error: e.message || 'Something went wrong' }));
    }
  }, [key]);

  useFocusEffect(useCallback(() => { run(); }, [run]));

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await run();
    setRefreshing(false);
  }, [run]);

  return { data: state.data, loading: state.loading, error: state.error, refreshing, refresh, reload: run };
}
