import { useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import type { AuthResponse, UserDto } from '@routeflow/types';
import { hasSessionHint, onSessionChange, refreshSession, request, setAccessToken } from './api';

type Status = 'loading' | 'authenticated' | 'anonymous';

interface AuthState {
  user: UserDto | null;
  status: Status;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: UserDto) => void;
  /** true depois de "Sair": a tela de login abre sem destino de retorno */
  loggedOut: boolean;
}

const AuthContext = React.createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<UserDto | null>(null);
  const [status, setStatus] = React.useState<Status>('loading');
  const [loggedOut, setLoggedOut] = React.useState(false);
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
      loggedOut,
      setUser,
      // "Lembrar acesso": o servidor decide a validade do cookie HttpOnly; nada sensível fica no navegador
      login: async (email, password, remember) => {
        const session = await request<AuthResponse>('POST', '/auth/login', {
          body: { email, password, remember },
          auth: false,
        });
        setAccessToken(session.accessToken);
        setUser(session.user);
        setLoggedOut(false);
        setStatus('authenticated');
      },
      logout: async () => {
        try {
          await request('POST', '/auth/logout', { auth: false });
        } finally {
          setAccessToken(null);
          setUser(null);
          setLoggedOut(true);
          setStatus('anonymous');
          queryClient.clear();
          try {
            localStorage.removeItem('rf-view-as');
          } catch {
            // armazenamento indisponível
          }
        }
      },
    }),
    [user, status, loggedOut, queryClient],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
