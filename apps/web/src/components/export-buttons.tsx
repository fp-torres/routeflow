import { FileDown, FileSpreadsheet } from 'lucide-react';
import * as React from 'react';
import type { ReportType } from '@routeflow/types';
import { Button, toast } from '@routeflow/ui';
import { download, type Query } from '@/lib/api';
import { errorMessage } from './states';

/** [Exportar PDF] [Exportar Excel] — presente em todos os módulos relevantes. */
export function ExportButtons({
  type,
  query,
  size = 'sm',
}: {
  type: ReportType;
  query: Query;
  size?: 'sm' | 'md';
}) {
  const [busy, setBusy] = React.useState<'pdf' | 'xlsx' | null>(null);
  const run = async (format: 'pdf' | 'xlsx') => {
    setBusy(format);
    try {
      await download(`/reports/${type}/${format}`, query);
      toast.success(format === 'pdf' ? 'PDF gerado.' : 'Planilha Excel gerada.');
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size={size}
        loading={busy === 'pdf'}
        disabled={!!busy}
        onClick={() => run('pdf')}
      >
        <FileDown /> Exportar PDF
      </Button>
      <Button
        variant="outline"
        size={size}
        loading={busy === 'xlsx'}
        disabled={!!busy}
        onClick={() => run('xlsx')}
      >
        <FileSpreadsheet /> Exportar Excel
      </Button>
    </div>
  );
}
