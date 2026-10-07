import * as React from 'react';
import { storeCreateSchema, type StoreCreateInput, type StoreDto } from '@routeflow/types';
import { Button, Checkbox, DialogFooter, Field, Input, Textarea } from '@routeflow/ui';
import { fieldErrors } from '@/lib/forms';
import { useCatalog } from '@/lib/queries';

type FormState = Record<
  | 'code'
  | 'name'
  | 'network'
  | 'address'
  | 'neighborhood'
  | 'city'
  | 'state'
  | 'zipCode'
  | 'region'
  | 'latitude'
  | 'longitude'
  | 'observations',
  string
> & { active: boolean };

function initial(store?: StoreDto): FormState {
  return {
    code: store?.code ?? '',
    name: store?.name ?? '',
    network: store?.network ?? '',
    address: store?.address ?? '',
    neighborhood: store?.neighborhood ?? '',
    city: store?.city ?? 'Rio de Janeiro',
    state: store?.state ?? 'RJ',
    zipCode: store?.zipCode ?? '',
    region: store?.region ?? '',
    latitude: store?.latitude != null ? String(store.latitude) : '',
    longitude: store?.longitude != null ? String(store.longitude) : '',
    observations: store?.observations ?? '',
    active: store?.active ?? true,
  };
}

export function StoreForm({
  store,
  submitting,
  onSubmit,
  onCancel,
}: {
  store?: StoreDto;
  submitting: boolean;
  onSubmit: (data: StoreCreateInput) => void;
  onCancel: () => void;
}) {
  const catalog = useCatalog();
  const [form, setForm] = React.useState<FormState>(() => initial(store));
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const set =
    (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      code: form.code || undefined,
      latitude: form.latitude ? Number(form.latitude.replace(',', '.')) : null,
      longitude: form.longitude ? Number(form.longitude.replace(',', '.')) : null,
    };
    const parsed = storeCreateSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    onSubmit(payload as StoreCreateInput);
  };
  const text = (
    key: keyof FormState,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <Field label={label} htmlFor={`store-${key}`} error={errors[key]}>
      <Input
        id={`store-${key}`}
        value={form[key] as string}
        onChange={set(key)}
        aria-invalid={!!errors[key]}
        {...props}
      />
    </Field>
  );
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {text('code', 'Código', { placeholder: 'Ex.: V47 (vazio = gerar)' })}
        <Field label="Rede" htmlFor="store-network" error={errors.network}>
          <Input
            id="store-network"
            list="store-networks"
            value={form.network}
            onChange={set('network')}
            aria-invalid={!!errors.network}
          />
          <datalist id="store-networks">
            {catalog.data?.networks.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </Field>
      </div>
      {text('name', 'Nome da loja')}
      {text('address', 'Endereço', { placeholder: 'Rua, número, complemento' })}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {text('neighborhood', 'Bairro')}
        <Field label="Região" htmlFor="store-region" error={errors.region}>
          <Input
            id="store-region"
            list="store-regions"
            value={form.region}
            onChange={set('region')}
          />
          <datalist id="store-regions">
            {catalog.data?.regions.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </Field>
        {text('city', 'Cidade')}
        <div className="grid grid-cols-2 gap-3">
          {text('state', 'UF', { maxLength: 2 })}
          {text('zipCode', 'CEP', { inputMode: 'numeric' })}
        </div>
        {text('latitude', 'Latitude', { inputMode: 'decimal', placeholder: '-22.9...' })}
        {text('longitude', 'Longitude', { inputMode: 'decimal', placeholder: '-43.2...' })}
      </div>
      <Field label="Observações" htmlFor="store-observations">
        <Textarea
          id="store-observations"
          value={form.observations}
          onChange={set('observations')}
        />
      </Field>
      <Checkbox
        id="store-active"
        label="Loja ativa"
        checked={form.active}
        onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
      />
      <DialogFooter>
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={submitting}>
          {store ? 'Salvar alterações' : 'Cadastrar loja'}
        </Button>
      </DialogFooter>
    </form>
  );
}
