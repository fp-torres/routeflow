import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, Link2, Plus, Upload } from 'lucide-react';
import * as React from 'react';
import { useSearchParams } from 'react-router';
import {
  changePasswordSchema,
  formatBRL,
  formatDateBR,
  formatDateTimeBR,
  SHARED_SCOPE_LABEL,
  SHARED_SCOPES,
  TRANSPORT_TYPE_LABEL,
  TRANSPORT_TYPES,
  USER_ROLE_LABEL,
  type CompanySettings,
  type FareDto,
  type ImportResultDto,
  type SharedAccessCreatedDto,
  type SharedScope,
  type TransportType,
  type UserDto,
} from '@routeflow/types';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  DataTable,
  DatePicker,
  Field,
  Input,
  PageHeader,
  SegmentedControl,
  Select,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
} from '@routeflow/ui';
import { ErrorState, ListSkeleton, toastError } from '@/components/states';
import { api, upload } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { fieldErrors } from '@/lib/forms';
import {
  keys,
  useAudit,
  useFares,
  useHomeAddress,
  useImportRuns,
  useProviders,
  useSettings,
  useSharedAccess,
} from '@/lib/queries';
import { useTheme, type ThemePreference } from '@/lib/theme';
import { UsersTab } from './users-tab';

function ProfileTab() {
  const { user, setUser } = useAuth();
  const [name, setName] = React.useState(user?.name ?? '');
  const [pwd, setPwd] = React.useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const saveName = useMutation({
    mutationFn: () => api.patch<UserDto>('/users/me', { name }),
    onSuccess: (u) => {
      setUser(u);
      toast.success('Perfil atualizado.');
    },
    onError: toastError,
  });
  const savePwd = useMutation({
    mutationFn: () => api.post('/users/me/password', pwd),
    onSuccess: () => {
      setPwd({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Senha alterada. Outras sessões foram encerradas.');
    },
    onError: toastError,
  });
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>
            {user?.email} — {user ? USER_ROLE_LABEL[user.role] : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Field label="Nome" htmlFor="profile-name">
            <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Button
            onClick={() => saveName.mutate()}
            loading={saveName.isPending}
            disabled={name.trim().length < 2}
          >
            Salvar nome
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Alterar senha</CardTitle>
          <CardDescription>Mínimo de 10 caracteres, com letras e números.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const parsed = changePasswordSchema.safeParse(pwd);
              if (!parsed.success) return setErrors(fieldErrors(parsed.error));
              setErrors({});
              savePwd.mutate();
            }}
          >
            {(['currentPassword', 'newPassword', 'confirmPassword'] as const).map((k) => (
              <Field
                key={k}
                label={
                  k === 'currentPassword'
                    ? 'Senha atual'
                    : k === 'newPassword'
                      ? 'Nova senha'
                      : 'Confirme a nova senha'
                }
                htmlFor={`pwd-${k}`}
                error={errors[k]}
              >
                <Input
                  id={`pwd-${k}`}
                  type="password"
                  autoComplete={k === 'currentPassword' ? 'current-password' : 'new-password'}
                  value={pwd[k]}
                  onChange={(e) => setPwd({ ...pwd, [k]: e.target.value })}
                />
              </Field>
            ))}
            <Button type="submit" loading={savePwd.isPending}>
              Alterar senha
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function HomeTab() {
  const client = useQueryClient();
  const home = useHomeAddress();
  const [form, setForm] = React.useState({ address: '', latitude: '', longitude: '' });
  React.useEffect(() => {
    if (home.data)
      setForm({
        address: home.data.address,
        latitude: home.data.latitude?.toString() ?? '',
        longitude: home.data.longitude?.toString() ?? '',
      });
  }, [home.data]);
  const save = useMutation({
    mutationFn: () =>
      api.put('/me/home-address', {
        address: form.address,
        latitude: form.latitude ? Number(form.latitude.replace(',', '.')) : null,
        longitude: form.longitude ? Number(form.longitude.replace(',', '.')) : null,
      }),
    onSuccess: () => {
      toast.success('Endereço de casa atualizado. Rotas futuras passam a sair daqui.');
      void client.invalidateQueries({ queryKey: keys.home });
      void client.invalidateQueries({ queryKey: ['route'] });
      void client.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: toastError,
  });
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Endereço de casa</CardTitle>
        <CardDescription>
          Origem e destino final de todas as rotas: Casa → lojas do dia → Casa.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Field label="Endereço completo" htmlFor="home-address">
          <Input
            id="home-address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Latitude (opcional)"
            htmlFor="home-lat"
            hint="Preenchida automaticamente se a geocodificação estiver ativa."
          >
            <Input
              id="home-lat"
              inputMode="decimal"
              value={form.latitude}
              onChange={(e) => setForm({ ...form, latitude: e.target.value })}
            />
          </Field>
          <Field label="Longitude (opcional)" htmlFor="home-lng">
            <Input
              id="home-lng"
              inputMode="decimal"
              value={form.longitude}
              onChange={(e) => setForm({ ...form, longitude: e.target.value })}
            />
          </Field>
        </div>
        <Button
          onClick={() => save.mutate()}
          loading={save.isPending}
          disabled={form.address.trim().length < 8}
        >
          Salvar endereço
        </Button>
      </CardContent>
    </Card>
  );
}

function AppearanceTab() {
  const { preference, setPreference } = useTheme();
  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Aparência</CardTitle>
        <CardDescription>A preferência fica salva neste dispositivo.</CardDescription>
      </CardHeader>
      <CardContent>
        <SegmentedControl<ThemePreference>
          label="Tema"
          value={preference}
          onChange={setPreference}
          options={[
            { value: 'light', label: 'Claro' },
            { value: 'dark', label: 'Escuro' },
            { value: 'system', label: 'Sistema' },
          ]}
        />
      </CardContent>
    </Card>
  );
}

const lines = (v: string) =>
  v
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

function OperationTab() {
  const client = useQueryClient();
  const settings = useSettings();
  const [form, setForm] = React.useState<CompanySettings | null>(null);
  React.useEffect(() => {
    if (settings.data) setForm(settings.data);
  }, [settings.data]);
  const save = useMutation({
    mutationFn: () => api.patch<CompanySettings>('/settings', form),
    onSuccess: (s) => {
      client.setQueryData(keys.settings, s);
      toast.success('Configurações salvas.');
    },
    onError: toastError,
  });
  if (!form) return <ListSkeleton rows={3} />;
  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Regras da operação</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Field label="Nome exibido no painel público e relatórios" htmlFor="op-name">
          <Input
            id="op-name"
            value={form.companyName}
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Alerta amarelo (dias antes do vencimento)" htmlFor="op-warn">
            <Input
              id="op-warn"
              type="number"
              min={1}
              value={form.authorizationWarningDays}
              onChange={(e) =>
                setForm({ ...form, authorizationWarningDays: Number(e.target.value) })
              }
            />
          </Field>
          <Field label="Alerta vermelho (dias antes do vencimento)" htmlFor="op-crit">
            <Input
              id="op-crit"
              type="number"
              min={0}
              value={form.authorizationCriticalDays}
              onChange={(e) =>
                setForm({ ...form, authorizationCriticalDays: Number(e.target.value) })
              }
            />
          </Field>
        </div>
        <fieldset className="flex flex-col gap-1">
          <legend className="text-sm font-semibold">Redes que exigem carta de autorização</legend>
          <p className="text-xs text-muted-foreground">
            Lojas das redes desmarcadas aparecem como “Carta não exigida” (ex.: Cristal). Cada loja
            também pode ter uma exceção no próprio cadastro.
          </p>
          <div className="flex flex-wrap gap-x-5">
            {form.networks.map((n) => (
              <Checkbox
                key={n}
                id={`req-${n}`}
                label={n}
                checked={form.authorizationRequiredNetworks.includes(n)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    authorizationRequiredNetworks: e.target.checked
                      ? [...form.authorizationRequiredNetworks, n]
                      : form.authorizationRequiredNetworks.filter((x) => x !== n),
                  })
                }
              />
            ))}
          </div>
        </fieldset>
        <Switch
          id="op-block"
          label="Bloquear visita sem autorização válida"
          description="Padrão: desativado (apenas alerta)."
          checked={form.blockVisitWithoutAuthorization}
          onCheckedChange={(v) => setForm({ ...form, blockVisitWithoutAuthorization: v })}
        />
        <Switch
          id="op-auto"
          label="Gerar rotas automaticamente pelo roteiro"
          description="Mantém a agenda dos próximos dias preenchida."
          checked={form.autoGenerateRoutes}
          onCheckedChange={(v) => setForm({ ...form, autoGenerateRoutes: v })}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Horizonte de geração (dias)" htmlFor="op-horizon">
            <Input
              id="op-horizon"
              type="number"
              min={0}
              max={120}
              value={form.routeGenerationHorizonDays}
              onChange={(e) =>
                setForm({ ...form, routeGenerationHorizonDays: Number(e.target.value) })
              }
            />
          </Field>
          <Field
            label="Mapa da sequência de paradas (visão geral)"
            htmlFor="op-mode"
            hint="Os trechos sempre abrem em transporte público."
          >
            <Select
              id="op-mode"
              value={form.fullRouteTravelMode}
              onChange={(e) =>
                setForm({ ...form, fullRouteTravelMode: e.target.value as 'driving' | 'walking' })
              }
            >
              <option value="walking">A pé (recomendado)</option>
              <option value="driving">Carro</option>
            </Select>
          </Field>
        </div>
        <Field label="Atividades sugeridas (uma por linha)" htmlFor="op-presets">
          <Textarea
            id="op-presets"
            rows={5}
            value={form.activityPresets.join('\n')}
            onChange={(e) => setForm({ ...form, activityPresets: lines(e.target.value) })}
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Redes (uma por linha)" htmlFor="op-networks">
            <Textarea
              id="op-networks"
              value={form.networks.join('\n')}
              onChange={(e) => setForm({ ...form, networks: lines(e.target.value) })}
            />
          </Field>
          <Field label="Regiões (uma por linha)" htmlFor="op-regions">
            <Textarea
              id="op-regions"
              value={form.regions.join('\n')}
              onChange={(e) => setForm({ ...form, regions: lines(e.target.value) })}
            />
          </Field>
        </div>
        <Button onClick={() => save.mutate()} loading={save.isPending}>
          Salvar configurações
        </Button>
      </CardContent>
    </Card>
  );
}

function FaresTab({ admin }: { admin: boolean }) {
  const client = useQueryClient();
  const fares = useFares();
  const [draft, setDraft] = React.useState({
    type: 'BUS' as TransportType,
    operator: '',
    value: '',
    effectiveFrom: new Date().toISOString().slice(0, 10),
  });
  const refresh = () => {
    void client.invalidateQueries({ queryKey: keys.fares });
    void client.invalidateQueries({ queryKey: ['dashboard'] });
  };
  const update = useMutation({
    mutationFn: (f: FareDto & { value: number }) =>
      api.patch(`/transport/fares/${f.id}`, { ...f, effectiveUntil: f.effectiveUntil }),
    onSuccess: () => {
      toast.success('Tarifa atualizada.');
      refresh();
    },
    onError: toastError,
  });
  const create = useMutation({
    mutationFn: () =>
      api.post('/transport/fares', {
        ...draft,
        value: Number(draft.value.replace(',', '.')),
        verified: true,
        active: true,
      }),
    onSuccess: () => {
      toast.success('Tarifa cadastrada.');
      setDraft({ ...draft, operator: '', value: '' });
      refresh();
    },
    onError: toastError,
  });
  return (
    <div className="flex flex-col gap-4">
      {fares.data?.some((f) => !f.verified && f.active) ? (
        <Alert tone="warning" title="Há tarifas de referência não confirmadas.">
          Confira os valores vigentes e clique em “Confirmar”. As estimativas de custo usam estas
          tarifas.
        </Alert>
      ) : null}
      {fares.isLoading ? (
        <ListSkeleton rows={3} />
      ) : fares.error ? (
        <ErrorState error={fares.error} />
      ) : (
        <DataTable
          rows={fares.data ?? []}
          rowKey={(f) => f.id}
          caption="Tarifas"
          columns={[
            { key: 'type', header: 'Tipo', cell: (f) => TRANSPORT_TYPE_LABEL[f.type] },
            { key: 'op', header: 'Operadora', cell: (f) => f.operator },
            { key: 'value', header: 'Valor', cell: (f) => <strong>{formatBRL(f.value)}</strong> },
            {
              key: 'from',
              header: 'Vigência',
              cell: (f) => `desde ${formatDateBR(f.effectiveFrom)}`,
            },
            {
              key: 'status',
              header: 'Situação',
              cell: (f) =>
                f.verified ? (
                  <Badge tone="success">Confirmada</Badge>
                ) : (
                  <Badge tone="warning">Referência</Badge>
                ),
            },
            {
              key: 'actions',
              header: 'Ações',
              cell: (f) =>
                admin ? (
                  <span className="flex gap-1">
                    {!f.verified ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => update.mutate({ ...f, verified: true })}
                      >
                        Confirmar
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const v = window.prompt('Novo valor (R$):', String(f.value));
                        if (v)
                          update.mutate({
                            ...f,
                            value: Number(v.replace(',', '.')),
                            verified: true,
                          });
                      }}
                    >
                      Alterar valor
                    </Button>
                  </span>
                ) : null,
            },
          ]}
          mobileCard={(f) => (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3">
              <span>
                <span className="block font-semibold">
                  {TRANSPORT_TYPE_LABEL[f.type]} — {formatBRL(f.value)}
                </span>
                <span className="text-xs text-muted-foreground">{f.operator}</span>
              </span>
              {f.verified ? (
                <Badge tone="success">Confirmada</Badge>
              ) : admin ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => update.mutate({ ...f, verified: true })}
                >
                  Confirmar
                </Button>
              ) : (
                <Badge tone="warning">Referência</Badge>
              )}
            </div>
          )}
        />
      )}
      {admin ? (
        <Card>
          <CardHeader>
            <CardTitle>Nova tarifa</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
            <Field label="Tipo" htmlFor="fare-type">
              <Select
                id="fare-type"
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value as TransportType })}
              >
                {TRANSPORT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TRANSPORT_TYPE_LABEL[t]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Operadora" htmlFor="fare-op">
              <Input
                id="fare-op"
                value={draft.operator}
                onChange={(e) => setDraft({ ...draft, operator: e.target.value })}
              />
            </Field>
            <Field label="Valor (R$)" htmlFor="fare-value">
              <Input
                id="fare-value"
                inputMode="decimal"
                value={draft.value}
                onChange={(e) => setDraft({ ...draft, value: e.target.value })}
              />
            </Field>
            <Field label="Vigente desde" htmlFor="fare-from">
              <DatePicker
                id="fare-from"
                value={draft.effectiveFrom}
                onChange={(e) => setDraft({ ...draft, effectiveFrom: e.target.value })}
              />
            </Field>
            <Button
              className="sm:col-span-4"
              onClick={() => create.mutate()}
              loading={create.isPending}
              disabled={!draft.operator || !draft.value}
            >
              <Plus /> Cadastrar tarifa
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function SharedTab() {
  const client = useQueryClient();
  const shared = useSharedAccess();
  const [form, setForm] = React.useState<{ label: string; scope: SharedScope[] }>({
    label: 'Gestor',
    scope: ['visits', 'photos', 'authorizations'],
  });
  const [created, setCreated] = React.useState<SharedAccessCreatedDto | null>(null);
  const invalidate = () => client.invalidateQueries({ queryKey: keys.shared });
  const create = useMutation({
    mutationFn: () => api.post<SharedAccessCreatedDto>('/shared-access', form),
    onSuccess: (r) => {
      setCreated(r);
      void invalidate();
    },
    onError: toastError,
  });
  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch(`/shared-access/${id}`, { active }),
    onSuccess: (_r, v) => {
      toast.success(v.active ? 'Link reativado.' : 'Link desativado. Reative quando quiser.');
      void invalidate();
    },
    onError: toastError,
  });
  const revoke = useMutation({
    mutationFn: (id: string) => api.post(`/shared-access/${id}/revoke`),
    onSuccess: () => {
      toast.success('Link revogado definitivamente.');
      void invalidate();
    },
    onError: toastError,
  });
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Link copiado.');
    } catch {
      toast.error('Não foi possível copiar. Selecione o link manualmente.');
    }
  };
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Novo link público</CardTitle>
          <CardDescription>
            Painel somente leitura para o empregador/gestor, sem login. O link não expira: continua
            funcionando até você desativá-lo ou revogá-lo.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Field label="Nome do link" htmlFor="share-label">
            <Input
              id="share-label"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
          </Field>
          <fieldset className="flex flex-col">
            <legend className="mb-1 text-sm font-semibold">O que o link pode mostrar</legend>
            {SHARED_SCOPES.map((s) => (
              <Checkbox
                key={s}
                id={`scope-${s}`}
                label={SHARED_SCOPE_LABEL[s]}
                checked={form.scope.includes(s)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    scope: e.target.checked
                      ? [...form.scope, s]
                      : form.scope.filter((x) => x !== s),
                  })
                }
              />
            ))}
          </fieldset>
          <Button
            onClick={() => create.mutate()}
            loading={create.isPending}
            disabled={!form.scope.length || form.label.trim().length < 2}
          >
            <Link2 /> Gerar link
          </Button>
          {created ? (
            <Alert tone="success" title="Link criado. Você pode copiá-lo de novo na lista ao lado.">
              <span className="mt-1 block break-all font-mono text-xs text-foreground">
                {created.url}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => void copy(created.url)}
              >
                <Copy /> Copiar link
              </Button>
            </Alert>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Links existentes</CardTitle>
        </CardHeader>
        <CardContent>
          {shared.isLoading ? (
            <ListSkeleton rows={2} />
          ) : !shared.data?.length ? (
            <p className="text-sm text-muted-foreground">Nenhum link criado.</p>
          ) : (
            <ul className="divide-y">
              {shared.data.map((s) => {
                const revoked = !!s.revokedAt;
                return (
                  <li key={s.id} className="flex flex-col gap-2 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block font-semibold">
                          {s.label}{' '}
                          <span className="font-mono text-xs text-muted-foreground">
                            {s.tokenPreview}…
                          </span>
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {s.scope.map((x) => SHARED_SCOPE_LABEL[x]).join(', ')} — {s.accessCount}{' '}
                          acesso(s)
                          {s.lastAccessAt ? ` — último ${formatDateTimeBR(s.lastAccessAt)}` : ''}
                        </span>
                      </span>
                      {revoked ? (
                        <Badge tone="danger">Revogado</Badge>
                      ) : (
                        <Switch
                          id={`share-active-${s.id}`}
                          label={s.active ? 'Ativo' : 'Desativado'}
                          checked={s.active}
                          disabled={toggle.isPending}
                          onCheckedChange={(v) => toggle.mutate({ id: s.id, active: v })}
                        />
                      )}
                    </div>
                    {!revoked ? (
                      <div className="flex flex-wrap gap-2">
                        {s.url ? (
                          <Button size="sm" variant="outline" onClick={() => void copy(s.url!)}>
                            <Copy /> Copiar link
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Criado na versão anterior: o endereço não pode ser exibido de novo.
                          </span>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-danger"
                          onClick={() =>
                            window.confirm(
                              'Revogar este link de vez? Quem tiver o endereço perde o acesso e ele não pode ser reativado.',
                            ) && revoke.mutate(s.id)
                          }
                        >
                          Revogar
                        </Button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ImportTab() {
  const client = useQueryClient();
  const runs = useImportRuns();
  const [file, setFile] = React.useState<File | null>(null);
  const [options, setOptions] = React.useState({ dryRun: true, updateExisting: false });
  const [result, setResult] = React.useState<ImportResultDto | null>(null);
  const run = useMutation({
    mutationFn: () => {
      const form = new FormData();
      form.append('file', file!, file!.name);
      form.append('dryRun', String(options.dryRun));
      form.append('updateExisting', String(options.updateExisting));
      return upload<ImportResultDto>('/import/spreadsheet', form);
    },
    onSuccess: (r) => {
      setResult(r);
      toast.success(r.dryRun ? 'Simulação concluída (nada foi gravado).' : 'Importação concluída.');
      void client.invalidateQueries();
    },
    onError: toastError,
  });
  return (
    <div className="flex flex-col gap-4">
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Importar planilha XLSX</CardTitle>
          <CardDescription>
            Importação idempotente: reimportar não duplica lojas, rotas nem visitas. Inconsistências
            são registradas, nunca apagadas.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            aria-label="Planilha XLSX"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="h-auto py-2"
          />
          <Checkbox
            id="imp-dry"
            label="Simular (não grava nada)"
            checked={options.dryRun}
            onChange={(e) => setOptions({ ...options, dryRun: e.target.checked })}
          />
          <Checkbox
            id="imp-update"
            label="Atualizar registros existentes com os dados da planilha"
            checked={options.updateExisting}
            onChange={(e) => setOptions({ ...options, updateExisting: e.target.checked })}
          />
          <Button onClick={() => run.mutate()} loading={run.isPending} disabled={!file}>
            <Upload /> {options.dryRun ? 'Simular importação' : 'Importar'}
          </Button>
        </CardContent>
      </Card>
      {result ? (
        <Card>
          <CardHeader>
            <CardTitle>
              Resultado:{' '}
              {result.status === 'SUCCESS'
                ? 'sucesso'
                : result.status === 'FAILED'
                  ? 'falhou'
                  : 'concluído com observações'}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              {Object.entries(result.summary).map(([k, c]) => (
                <li key={k} className="rounded-md bg-muted p-2">
                  <span className="block font-semibold">{k}</span>
                  <span className="text-xs text-muted-foreground">
                    +{c.created} / ~{c.updated} / ={c.unchanged}
                  </span>
                </li>
              ))}
            </ul>
            <ul className="flex flex-col gap-2">
              {result.issues.map((i, idx) => (
                <li key={idx}>
                  <Alert
                    tone={
                      i.severity === 'error'
                        ? 'danger'
                        : i.severity === 'warning'
                          ? 'warning'
                          : 'info'
                    }
                    title={i.code}
                  >
                    {i.message}
                  </Alert>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Importações anteriores</CardTitle>
        </CardHeader>
        <CardContent>
          {runs.data?.length ? (
            <ul className="divide-y text-sm">
              {runs.data.map((r) => (
                <li key={r.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <span>
                    {r.fileName} {r.dryRun ? <Badge>simulação</Badge> : null}
                  </span>
                  <span className="text-muted-foreground">
                    {formatDateTimeBR(r.createdAt)} — {r.issues.length} observação(ões)
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma importação registrada.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function IntegrationsTab() {
  const providers = useProviders();
  if (providers.isLoading) return <ListSkeleton rows={3} />;
  if (providers.error || !providers.data) return <ErrorState error={providers.error} />;
  const p = providers.data;
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Rotas e transporte</CardTitle>
          <CardDescription>{p.route.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Badge tone={p.route.provider === 'google' && p.route.configured ? 'success' : 'info'}>
            {p.route.provider === 'google' ? 'Google Routes' : 'Estimativa local'}
          </Badge>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Geocodificação</CardTitle>
          <CardDescription>{p.geocoding.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <Badge tone={p.geocoding.configured ? 'success' : 'warning'}>
            {p.geocoding.configured ? 'Ativa' : 'Inativa'}
          </Badge>
          <span>{p.storesWithoutCoordinates} loja(s) sem coordenadas</span>
          <span>Casa {p.homeHasCoordinates ? 'com' : 'sem'} coordenadas</span>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Armazenamento de arquivos</CardTitle>
          <CardDescription>Fotos e PDFs com links assinados e temporários.</CardDescription>
        </CardHeader>
        <CardContent>
          <Badge tone="outline">
            {p.storage.driver === 'local' ? 'Disco do servidor' : p.storage.driver}
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}

function AuditTab() {
  const [page, setPage] = React.useState(1);
  const audit = useAudit(page);
  if (audit.isLoading) return <ListSkeleton />;
  if (audit.error || !audit.data) return <ErrorState error={audit.error} />;
  return (
    <>
      <DataTable
        rows={audit.data.items}
        rowKey={(a) => a.id}
        caption="Auditoria"
        columns={[
          { key: 'when', header: 'Quando', cell: (a) => formatDateTimeBR(a.createdAt) },
          { key: 'who', header: 'Usuário', cell: (a) => a.user?.name ?? '—' },
          {
            key: 'action',
            header: 'Ação',
            cell: (a) => <code className="text-xs">{a.action}</code>,
          },
          { key: 'entity', header: 'Entidade', cell: (a) => a.entity },
          { key: 'ip', header: 'IP', cell: (a) => a.ipAddress ?? '—' },
        ]}
        mobileCard={(a) => (
          <div className="rounded-lg border bg-card p-3 text-sm">
            <code className="text-xs font-semibold">{a.action}</code>
            <p className="text-xs text-muted-foreground">
              {formatDateTimeBR(a.createdAt)} — {a.user?.name ?? 'sistema'}
            </p>
          </div>
        )}
      />
      <div className="mt-3 flex justify-center gap-3">
        <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Anterior
        </Button>
        <Button
          variant="outline"
          disabled={page >= audit.data.totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Próxima
        </Button>
      </div>
    </>
  );
}

export function SettingsPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const admin = user?.role === 'ADMIN';
  const manager = admin || user?.role === 'MANAGER';
  const tabs = [
    { value: 'perfil', label: 'Perfil', show: true },
    { value: 'casa', label: 'Endereço de casa', show: true },
    { value: 'aparencia', label: 'Aparência', show: true },
    { value: 'usuarios', label: 'Usuários', show: admin },
    { value: 'operacao', label: 'Operação', show: admin },
    { value: 'tarifas', label: 'Tarifas', show: true },
    { value: 'links', label: 'Links públicos', show: manager },
    { value: 'importacao', label: 'Importação', show: admin },
    { value: 'integracoes', label: 'Integrações', show: true },
    { value: 'auditoria', label: 'Auditoria', show: manager },
  ].filter((t) => t.show);
  const current = tabs.some((t) => t.value === params.get('tab')) ? params.get('tab')! : 'perfil';
  React.useEffect(() => {
    document.title = 'Configurações — RouteFlow';
  }, []);
  return (
    <>
      <PageHeader title="Configurações" />
      <Tabs
        value={current}
        onValueChange={(v) => setParams({ tab: v }, { replace: true })}
        className="flex flex-col gap-4"
      >
        <TabsList className="justify-start">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="flex-none">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="perfil">
          <ProfileTab />
        </TabsContent>
        <TabsContent value="casa">
          <HomeTab />
        </TabsContent>
        <TabsContent value="aparencia">
          <AppearanceTab />
        </TabsContent>
        {admin ? (
          <TabsContent value="operacao">
            <OperationTab />
          </TabsContent>
        ) : null}
        <TabsContent value="tarifas">
          <FaresTab admin={admin} />
        </TabsContent>
        {manager ? (
          <TabsContent value="links">
            <SharedTab />
          </TabsContent>
        ) : null}
        {admin ? (
          <TabsContent value="importacao">
            <ImportTab />
          </TabsContent>
        ) : null}
        {admin ? (
          <TabsContent value="usuarios">
            <UsersTab />
          </TabsContent>
        ) : null}
        <TabsContent value="integracoes">
          <IntegrationsTab />
        </TabsContent>
        {manager ? (
          <TabsContent value="auditoria">
            <AuditTab />
          </TabsContent>
        ) : null}
      </Tabs>
    </>
  );
}
