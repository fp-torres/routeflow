import * as React from 'react';
import { useAuth } from './auth';

interface ViewAsValue {
  /** Funcionário cuja operação está sendo visualizada (null = o próprio usuário) */
  employeeId: string | null;
  setEmployeeId: (id: string | null) => void;
  canViewOthers: boolean;
}

const ViewAsContext = React.createContext<ViewAsValue>({
  employeeId: null,
  setEmployeeId: () => undefined,
  canViewOthers: false,
});
const KEY = 'rf-view-as';

/** ADMIN/MANAGER podem acompanhar o dia de outro funcionário (dashboard, agenda, rotas e roteiros). */
export function ViewAsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const canViewOthers = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const [stored, setStored] = React.useState<string | null>(() => {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  });
  const setEmployeeId = React.useCallback((id: string | null) => {
    setStored(id);
    try {
      if (id) localStorage.setItem(KEY, id);
      else localStorage.removeItem(KEY);
    } catch {
      // armazenamento indisponível: vale só nesta sessão
    }
  }, []);
  const employeeId = canViewOthers && stored && stored !== user?.id ? stored : null;
  const value = React.useMemo(
    () => ({ employeeId, setEmployeeId, canViewOthers }),
    [employeeId, setEmployeeId, canViewOthers],
  );
  return <ViewAsContext.Provider value={value}>{children}</ViewAsContext.Provider>;
}

export const useViewAs = () => React.useContext(ViewAsContext);
