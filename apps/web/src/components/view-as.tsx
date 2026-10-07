import { Eye } from 'lucide-react';
import { Button } from '@routeflow/ui';
import { useAuth } from '@/lib/auth';
import { useUsers } from '@/lib/queries';
import { useViewAs } from '@/lib/view-as';

/** Seletor "visualizando" (ADMIN/MANAGER): de quem é o dia mostrado no dashboard, agenda e rotas. */
export function ViewAsSelect() {
  const { user } = useAuth();
  const { employeeId, setEmployeeId, canViewOthers } = useViewAs();
  const users = useUsers(canViewOthers);
  if (!canViewOthers || !user) return null;
  const options = (users.data ?? []).filter((u) => u.active);
  if (options.length <= 1) return null;
  return (
    <label
      className="flex h-9 min-w-0 items-center gap-1.5 rounded-full border bg-card px-2.5 text-sm"
      title="Operação exibida no dashboard, agenda e rotas"
    >
      <Eye className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="sr-only">Visualizando a operação de</span>
      <select
        value={employeeId ?? user.id}
        onChange={(e) => setEmployeeId(e.target.value === user.id ? null : e.target.value)}
        className="min-w-0 max-w-[8.5rem] truncate bg-transparent font-semibold outline-none sm:max-w-[13rem]"
      >
        {options.map((u) => (
          <option key={u.id} value={u.id}>
            {u.id === user.id ? `${u.name.split(' ')[0]} (eu)` : u.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ViewAsBanner() {
  const { employeeId, setEmployeeId } = useViewAs();
  const users = useUsers(!!employeeId);
  if (!employeeId) return null;
  const name = users.data?.find((u) => u.id === employeeId)?.name ?? 'outro funcionário';
  return (
    <div className="border-b bg-info-soft text-info-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5 text-sm sm:px-6">
        <Eye className="size-4 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1">
          Visualizando a operação de <strong>{name}</strong>
        </span>
        <Button size="sm" variant="ghost" onClick={() => setEmployeeId(null)}>
          Voltar para a minha
        </Button>
      </div>
    </div>
  );
}
