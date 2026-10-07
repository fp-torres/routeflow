import { Select } from '@routeflow/ui';
import { useStores } from '@/lib/queries';

/** Seleção de loja ativa (lista nativa — ótima no celular). */
export function StorePicker({
  id,
  value,
  onChange,
  exclude = [],
}: {
  id: string;
  value: string;
  onChange: (id: string) => void;
  exclude?: string[];
}) {
  const stores = useStores({ active: true, pageSize: 200 });
  const items = (stores.data?.items ?? []).filter((s) => !exclude.includes(s.id));
  return (
    <Select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={stores.isLoading}
    >
      <option value="">{stores.isLoading ? 'Carregando lojas…' : 'Selecione a loja'}</option>
      {items.map((s) => (
        <option key={s.id} value={s.id}>
          {s.code} — {s.name}
          {s.neighborhood ? ` (${s.neighborhood})` : ''}
        </option>
      ))}
    </Select>
  );
}
