import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Deep indigo night / soft lavender mist, with aurora blobs behind the glass.
// Violet + sky-blue lead. Green/red are reserved for budget status so they keep their meaning.
export const palettes = {
  dark: {
    bg: ['#080C1F', '#140B33', '#07161F'],
    blobs: ['#7C3AED', '#0EA5E9', '#EC4899'],
    blobRing: 0.055,
    text: '#F3F5FF',
    muted: 'rgba(224,229,255,0.66)',
    faint: 'rgba(224,229,255,0.40)',
    glass: 'rgba(255,255,255,0.075)',
    glassStrong: 'rgba(255,255,255,0.14)',
    input: 'rgba(255,255,255,0.07)',
    border: 'rgba(255,255,255,0.17)',
    track: 'rgba(255,255,255,0.10)',
    tint: 'dark',
    blur: 45,
    shadow: '#000000',
    shadowOpacity: 0.35,
    accent: '#9A8CFF',
    accent2: '#38BDF8',
    accentGradient: ['#8B7CFF', '#38BDF8'],
    onAccent: '#0B0B1E',
    good: '#34D399',
    bad: '#FB7185',
    goodSoft: 'rgba(52,211,153,0.16)',
    badSoft: 'rgba(251,113,133,0.16)',
    income: '#38E1C6',
    expense: '#FF8FA3',
  },
  light: {
    bg: ['#EDF0FF', '#F6EDFF', '#E4F6F4'],
    blobs: ['#A78BFA', '#5EEAD4', '#FDA4AF'],
    blobRing: 0.085,
    text: '#171A3C',
    muted: 'rgba(23,26,60,0.64)',
    faint: 'rgba(23,26,60,0.40)',
    glass: 'rgba(255,255,255,0.58)',
    glassStrong: 'rgba(255,255,255,0.88)',
    input: 'rgba(255,255,255,0.72)',
    border: 'rgba(255,255,255,0.95)',
    track: 'rgba(23,26,60,0.08)',
    tint: 'light',
    blur: 55,
    shadow: '#5B47F5',
    shadowOpacity: 0.14,
    accent: '#5B47F5',
    accent2: '#0891B2',
    accentGradient: ['#5B47F5', '#2F7BF5'],
    onAccent: '#FFFFFF',
    good: '#047857',
    bad: '#E11D48',
    goodSoft: 'rgba(4,120,87,0.12)',
    badSoft: 'rgba(225,29,72,0.11)',
    income: '#0F9F8C',
    expense: '#E5456B',
  },
};

const Ctx = createContext(null);
const KEY = 'theme_mode';

export function ThemeProvider({ children }) {
  const system = useColorScheme();
  const [mode, setMode] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => setMode(v === 'light' || v === 'dark' ? v : system === 'light' ? 'light' : 'dark'))
      .catch(() => setMode('dark'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = useCallback(() => {
    setMode((m) => {
      const next = (m || 'dark') === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem(KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo(() => {
    const m = mode || 'dark';
    return { mode: m, isDark: m === 'dark', t: palettes[m], toggle };
  }, [mode, toggle]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
