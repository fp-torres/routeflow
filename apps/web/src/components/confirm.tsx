import * as React from 'react';
import { Button, Dialog, DialogContent, DialogFooter } from '@routeflow/ui';

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  tone?: 'danger' | 'default';
}
type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

const ConfirmContext = React.createContext<(options: ConfirmOptions) => Promise<boolean>>(
  async () => false,
);

/**
 * Confirmação acessível e consistente (substitui window.confirm, que alguns celulares e o app
 * instalado como PWA ignoram ou bloqueiam).
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = React.useState<Pending | null>(null);
  const confirm = React.useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setPending({ ...options, resolve })),
    [],
  );
  const close = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={!!pending} onOpenChange={(open) => !open && close(false)}>
        {pending ? (
          <DialogContent title={pending.title} description={pending.description} size="sm">
            <DialogFooter>
              <Button variant="ghost" onClick={() => close(false)}>
                Cancelar
              </Button>
              <Button
                variant={pending.tone === 'danger' ? 'danger' : 'primary'}
                onClick={() => close(true)}
                autoFocus
              >
                {pending.confirmLabel ?? 'Confirmar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => React.useContext(ConfirmContext);
