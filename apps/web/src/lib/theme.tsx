import * as React from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeState {
  preference: ThemePreference;
  resolved: 'light' | 'dark';
  setPreference: (value: ThemePreference) => void;
}

const ThemeContext = React.createContext<ThemeState | null>(null);
const KEY = 'rf-theme';

function systemDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = React.useState<ThemePreference>(() => {
    try {
      return (localStorage.getItem(KEY) as ThemePreference | null) ?? 'system';
    } catch {
      return 'system';
    }
  });
  const [system, setSystem] = React.useState(systemDark);
  React.useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystem(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  const resolved = preference === 'system' ? (system ? 'dark' : 'light') : preference;
  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', resolved === 'dark' ? '#0a1220' : '#13233b');
  }, [resolved]);
  const setPreference = React.useCallback((value: ThemePreference) => {
    setPreferenceState(value);
    try {
      localStorage.setItem(KEY, value);
    } catch {
      // armazenamento indisponível (modo privado)
    }
  }, []);
  const value = React.useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeState {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  return ctx;
}
