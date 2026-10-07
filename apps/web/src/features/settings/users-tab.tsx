import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRightLeft, Copy, KeyRound, UserPlus, Wand, Pencil } from 'lucide-react';
import * as React from 'react';
import {
  formatDateTimeBR,
  USER_ROLE_LABEL,
  userCreateSchema,
  type UserDto,
  type UserRole,
} from '@routeflow/types';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  Field,
  Input,
  Select,
  Switch,
  toast,
} from '@routeflow/ui';
import { ListSkeleton, toastError } from '@/components/states';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { fieldErrors } from '@/lib/forms';
import { useUsers } from '@/lib/queries';

const ROLES: UserRole[] = ['EMPLOYEE', 'MANAGER', 'ADMIN'];

/** Senha forte e legível (sem caracteres ambíguos). */
function generatePassword(): string {
  const letters = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const pick = (set: string) => set[crypto.getRandomValues(new Uint32Array(1))[0]! % set.length]!;
  const body = Array.from({ length: 9 }, () => pick(letters)).join('');
  return `${body}${pick(digits)}${pick(digits)}${pick('@#*!')}`;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copiado.');
  } catch {
    toast.error('Não foi possível copiar. Selecione o texto manualmente.');
  }
}

/**
 * Gestão de usuários (somente administrador).
 * Funcionário: opera o próprio dia (agenda, rotas, visitas, fotos, despesas, lojas e cartas).
 * Gestor: acompanha toda a operação, relatórios e links públicos.
 * Administrador: tudo, inclusive usuários, configurações e importação.
 */
export function UsersTab() {
  const { user: me } = useAuth();
  const client = useQueryClient();
  const users = useUsers();
  const [creating, setCreating] = React.useState(false);
  const [resetting, setResetting] = React.useState<UserDto | null>(null);
  const [editing, setEditing] = React.useState<UserDto | null>(null);
  const [transferTo, setTransferTo] = React.useState<UserDto | null>(null);
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { role?: UserRole; active?: boolean } }) =>
      api.patch<UserDto>(`/users/${id}`, body),
    onSuccess: () => {
      toast.success('Usuário atualizado.');
      void client.invalidateQueries({ queryKey: ['users'] });
    },
    onError: toastError,
  });
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Usuários e permissões</CardTitle>
          <CardDescription>
            <strong>Funcionário</strong>: agenda, rotas, visitas, fotos, despesas, lojas e cartas do
            próprio dia. <strong>Gestor</strong>: acompanha toda a operação, relatórios e links
            públicos. <strong>Administrador</strong>: tudo, inclusive usuários, configurações e
            importação.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div>
            <Button onClick={() => setCreating(true)}>
              <UserPlus /> Novo usuário
            </Button>
          </div>
          {users.isLoading ? (
            <ListSkeleton rows={2} />
          ) : (
            <ul className="divide-y">
              {users.data?.map((u) => {
                const self = u.id === me?.id;
                return (
                  <li key={u.id} className="flex flex-wrap items-center gap-3 py-3">
                    <Avatar name={u.name} src={u.avatarUrl} />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-semibold">
                        {u.name}
                        {self ? <Badge tone="neutral">você</Badge> : null}
                        {!u.active ? <Badge tone="warning">desativado</Badge> : null}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {u.email} · último acesso{' '}
                        {u.lastLoginAt ? formatDateTimeBR(u.lastLoginAt) : 'nunca'}
                      </p>
                    </div>
                    <Select
                      aria-label={`Papel de ${u.name}`}
                      value={u.role}
                      disabled={self || update.isPending}
                      onChange={(e) =>
                        update.mutate({ id: u.id, body: { role: e.target.value as UserRole } })
                      }
                      className="w-auto"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {USER_ROLE_LABEL[r]}
                        </option>
                      ))}
                    </Select>
                    <Switch
                      id={`user-active-${u.id}`}
                      label="Ativo"
                      checked={u.active}
                      disabled={self || update.isPending}
                      onCheckedChange={(v) => update.mutate({ id: u.id, body: { active: v } })}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditing(u)}>
                        <Pencil /> Editar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setResetting(u)}>
                        <KeyRound /> Senha
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!u.active}
                        onClick={() => setTransferTo(u)}
                      >
                        <ArrowRightLeft /> Receber operação
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
      <CreateUserDialog open={creating} onOpenChange={setCreating} />
      <ResetPasswordDialog user={resetting} onClose={() => setResetting(null)} />
      <EditUserDialog user={editing} onClose={() => setEditing(null)} />
      <TransferDialog
        target={transferTo}
        users={users.data ?? []}
        onClose={() => setTransferTo(null)}
      />
    </div>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const client = useQueryClient();
  const [values, setValues] = React.useState({
    name: '',
    email: '',
    password: '',
    role: 'EMPLOYEE' as UserRole,
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [created, setCreated] = React.useState<{
    email: string;
    password: string;
    name: string;
  } | null>(null);
  React.useEffect(() => {
    if (open) {
      setValues({ name: '', email: '', password: generatePassword(), role: 'EMPLOYEE' });
      setErrors({});
      setCreated(null);
    }
  }, [open]);
  const create = useMutation({
    mutationFn: () => api.post<UserDto>('/users', values),
    onSuccess: (u) => {
      setCreated({ email: u.email, password: values.password, name: u.name });
      void client.invalidateQueries({ queryKey: ['users'] });
    },
    onError: toastError,
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = userCreateSchema.safeParse(values);
    const next = parsed.success ? {} : fieldErrors(parsed.error);
    setErrors(next);
    if (Object.keys(next).length === 0) create.mutate();
  };
  const credentials = created
    ? `RouteFlow\nE-mail: ${created.email}\nSenha: ${created.password}`
    : '';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Novo usuário"
        description="A pessoa pode trocar a senha depois em Configurações › Perfil."
      >
        {created ? (
          <div className="flex flex-col gap-3">
            <Alert tone="success" title={`${created.name} já pode entrar no RouteFlow.`}>
              <pre className="mt-1 whitespace-pre-wrap break-all font-mono text-xs text-foreground">
                {credentials}
              </pre>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => void copyText(credentials)}
              >
                <Copy /> Copiar acesso
              </Button>
            </Alert>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Concluir</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="flex flex-col gap-3">
            <Field label="Nome" htmlFor="nu-name" error={errors.name}>
              <Input
                id="nu-name"
                value={values.name}
                onChange={(e) => setValues({ ...values, name: e.target.value })}
              />
            </Field>
            <Field label="E-mail (login)" htmlFor="nu-email" error={errors.email}>
              <Input
                id="nu-email"
                type="email"
                autoComplete="off"
                value={values.email}
                onChange={(e) => setValues({ ...values, email: e.target.value })}
              />
            </Field>
            <Field
              label="Senha inicial"
              htmlFor="nu-password"
              error={errors.password}
              hint="Mínimo de 10 caracteres, com letras e números."
            >
              <div className="flex gap-2">
                <Input
                  id="nu-password"
                  value={values.password}
                  autoComplete="new-password"
                  onChange={(e) => setValues({ ...values, password: e.target.value })}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setValues({ ...values, password: generatePassword() })}
                >
                  <Wand /> Gerar
                </Button>
              </div>
            </Field>
            <Field label="Papel" htmlFor="nu-role">
              <Select
                id="nu-role"
                value={values.role}
                onChange={(e) => setValues({ ...values, role: e.target.value as UserRole })}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {USER_ROLE_LABEL[r]}
                  </option>
                ))}
              </Select>
            </Field>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={create.isPending}>
                Criar usuário
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ user, onClose }: { user: UserDto | null; onClose: () => void }) {
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (user) {
      setPassword(generatePassword());
      setError(null);
    }
  }, [user]);
  const reset = useMutation({
    mutationFn: () => api.post(`/users/${user!.id}/password`, { password }),
    onSuccess: () => {
      toast.success('Senha redefinida. As sessões abertas desse usuário foram encerradas.');
      void copyText(password);
      onClose();
    },
    onError: toastError,
  });
  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      {user ? (
        <DialogContent
          title={`Redefinir senha — ${user.name}`}
          description="A nova senha é copiada ao confirmar."
        >
          <form
            noValidate
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
                setError('Mínimo de 10 caracteres, com letras e números.');
                return;
              }
              reset.mutate();
            }}
          >
            <Field label="Nova senha" htmlFor="rp-password" error={error ?? undefined}>
              <div className="flex gap-2">
                <Input
                  id="rp-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPassword(generatePassword())}
                >
                  <Wand /> Gerar
                </Button>
              </div>
            </Field>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" loading={reset.isPending}>
                Redefinir e copiar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

interface TransferResult {
  routes: number;
  skippedRoutes: number;
  visits: number;
  templates: number;
  templatesKept: boolean;
  homeAddressCopied: boolean;
}

function TransferDialog({
  target,
  users,
  onClose,
}: {
  target: UserDto | null;
  users: UserDto[];
  onClose: () => void;
}) {
  const client = useQueryClient();
  const { user: me } = useAuth();
  const sources = users.filter((u) => u.id !== target?.id);
  const [fromUserId, setFrom] = React.useState('');
  const [includePast, setIncludePast] = React.useState(true);
  React.useEffect(() => {
    if (target) setFrom(sources.find((u) => u.id === me?.id)?.id ?? sources[0]?.id ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reinicia só ao abrir para outro usuário
  }, [target?.id]);
  const transfer = useMutation({
    mutationFn: () =>
      api.post<TransferResult>(`/users/${target!.id}/transfer-operation`, {
        fromUserId,
        includePast,
      }),
    onSuccess: (r) => {
      toast.success(
        `${r.routes} rota(s), ${r.visits} visita(s) e ${r.templates} roteiro(s) transferidos para ${target!.name}` +
          (r.homeAddressCopied ? '; endereço de casa copiado' : '') +
          (r.skippedRoutes ? `; ${r.skippedRoutes} data(s) mantidas (já havia rota)` : '') +
          (r.templatesKept ? '; os roteiros de destino foram mantidos' : '') +
          '.',
      );
      void client.invalidateQueries();
      onClose();
    },
    onError: toastError,
  });
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      {target ? (
        <DialogContent
          title={`Transferir operação para ${target.name}`}
          description="Move roteiros, rotas e visitas (com fotos e histórico) e copia o endereço de casa, se ainda não houver."
        >
          <div className="flex flex-col gap-3">
            <Field label="Operação de" htmlFor="tr-from">
              <Select id="tr-from" value={fromUserId} onChange={(e) => setFrom(e.target.value)}>
                {sources.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({USER_ROLE_LABEL[u.role]})
                  </option>
                ))}
              </Select>
            </Field>
            <Checkbox
              id="tr-past"
              label="Incluir rotas e visitas passadas (histórico completo)"
              checked={includePast}
              onChange={(e) => setIncludePast(e.target.checked)}
            />
            <Alert tone="info" title="Use quando a planilha foi importada no usuário errado.">
              Ex.: a programação foi importada no administrador, mas quem visita as lojas é a
              funcionária. Datas em que o destino já tem rota são mantidas.
            </Alert>
            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                onClick={() => transfer.mutate()}
                loading={transfer.isPending}
                disabled={!fromUserId}
              >
                Transferir
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function EditUserDialog({ user, onClose }: { user: UserDto | null; onClose: () => void }) {
  const client = useQueryClient();
  const { user: me, setUser } = useAuth();
  const [values, setValues] = React.useState({ name: '', email: '' });
  React.useEffect(() => {
    if (user) setValues({ name: user.name, email: user.email });
  }, [user]);
  const save = useMutation({
    mutationFn: () => api.patch<UserDto>(`/users/${user!.id}`, values),
    onSuccess: (u) => {
      if (u.id === me?.id) setUser(u);
      void client.invalidateQueries({ queryKey: ['users'] });
      toast.success('Dados do usuário atualizados.');
      onClose();
    },
    onError: toastError,
  });
  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      {user ? (
        <DialogContent title={`Editar — ${user.name}`} description="O e-mail é o login de acesso.">
          <div className="flex flex-col gap-3">
            <Field label="Nome" htmlFor="eu-name">
              <Input
                id="eu-name"
                value={values.name}
                onChange={(e) => setValues({ ...values, name: e.target.value })}
              />
            </Field>
            <Field label="E-mail (login)" htmlFor="eu-email">
              <Input
                id="eu-email"
                type="email"
                value={values.email}
                onChange={(e) => setValues({ ...values, email: e.target.value })}
              />
            </Field>
            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                onClick={() => save.mutate()}
                loading={save.isPending}
                disabled={values.name.trim().length < 2 || !values.email.includes('@')}
              >
                Salvar
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
