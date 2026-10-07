import { useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import type { AuthResponse, UserDto } from '@routeflow/types';
import { hasSessionHint, onSessionChange, refreshSession, request, setAccessToken } from './api';

type Status = 'loading' | 'authenticated' | 'anonymous';

interface AuthState {
  user: UserDto | null;
  status: Status;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: UserDto) => void;
}

const AuthContext = React.createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<UserDto | null>(null);
  const [status, setStatus] = React.useState<Status>('loading');
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const off = onSessionChange((session) => {
      setUser(session?.user ?? null);
      setStatus(session ? 'authenticated' : 'anonymous');
    });
    if (hasSessionHint()) void refreshSession();
    else setStatus('anonymous');
    return () => {
      off();
    };
  }, []);

  const value = React.useMemo<AuthState>(
    () => ({
      user,
      status,
      setUser,
      login: async (email, password) => {
        const session = await request<AuthResponse>('POST', '/auth/login', {
          body: { email, password },
          auth: false,
        });
        setAccessToken(session.accessToken);
        setUser(session.user);
        setStatus('authenticated');
      },
      logout: async () => {
        try {
          await request('POST', '/auth/logout', { auth: false });
        } finally {
          setAccessToken(null);
          setUser(null);
          setStatus('anonymous');
          queryClient.clear();
        }
      },
    }),
    [user, status, queryClient],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
