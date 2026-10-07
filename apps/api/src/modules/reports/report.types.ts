import type { IsoDate, ReportType } from '@routeflow/types';

export type CellFormat = 'text' | 'date' | 'datetime' | 'money' | 'number' | 'percent' | 'status';

export interface ReportColumn {
  key: string;
  header: string;
  /** Peso relativo da largura no PDF e largura (caracteres) no Excel */
  width: number;
  format?: CellFormat;
  align?: 'left' | 'right' | 'center';
}

export type ReportCell = string | number | null;

export interface ReportSection {
  title: string;
  sheetName: string;
  columns: ReportColumn[];
  rows: Array<Record<string, ReportCell>>;
  /** Seções extensas podem ser omitidas do PDF (permanecem no Excel) */
  pdf?: boolean;
}

export interface ReportData {
  type: ReportType;
  title: string;
  from: IsoDate;
  to: IsoDate;
  generatedAt: Date;
  timeZone: string;
  kpis: Array<{ label: string; value: string }>;
  chart: {
    title: string;
    points: Array<{ label: string; total: number; completed: number }>;
  } | null;
  sections: ReportSection[];
  conclusions: string[];
}
