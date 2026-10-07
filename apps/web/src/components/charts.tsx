import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatBRL, type ChartPoint, type VisitStatus } from '@routeflow/types';

const axis = { fontSize: 11, fill: 'var(--muted-foreground)' };
const tooltipStyle = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  color: 'var(--foreground)',
  fontSize: 13,
};

export function VisitsBarChart({ data, height = 220 }: { data: ChartPoint[]; height?: number }) {
  const rows = data.map((d) => ({
    label: d.label,
    Concluídas: d.completed ?? 0,
    Restantes: Math.max(0, d.total - (d.completed ?? 0)),
  }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="label"
          tick={axis}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={8}
        />
        <YAxis allowDecimals={false} tick={axis} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--muted)' }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Concluídas" stackId="v" fill="var(--success)" radius={[0, 0, 0, 0]} />
        <Bar dataKey="Restantes" stackId="v" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function HorizontalBars({ data, height }: { data: ChartPoint[]; height?: number }) {
  const rows = data.map((d) => ({ label: d.label, Total: d.total, Concluídas: d.completed ?? 0 }));
  return (
    <ResponsiveContainer width="100%" height={height ?? Math.max(140, rows.length * 44 + 30)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis type="number" allowDecimals={false} tick={axis} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={104}
          tick={axis}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--muted)' }} />
        <Bar dataKey="Total" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
        <Bar dataKey="Concluídas" fill="var(--success)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MoneyLineChart({ data, height = 220 }: { data: ChartPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data.map((d) => ({ label: d.label, Gasto: d.total }))}
        margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
      >
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} minTickGap={12} />
        <YAxis
          tick={axis}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `R$${v}`}
        />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatBRL(Number(v))} />
        <Line type="monotone" dataKey="Gasto" stroke="var(--line)" strokeWidth={3} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

const STATUS_COLOR: Record<VisitStatus, string> = {
  PENDING: 'var(--muted-foreground)',
  IN_PROGRESS: 'var(--chart-1)',
  COMPLETED: 'var(--success)',
  NOT_COMPLETED: 'var(--danger)',
  RESCHEDULED: 'var(--warning)',
  CANCELLED: 'var(--input)',
  BLOCKED: 'var(--critical)',
};

export function StatusDonut({
  data,
  height = 220,
}: {
  data: Array<{ status: VisitStatus; label: string; total: number }>;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="label"
          innerRadius="55%"
          outerRadius="85%"
          paddingAngle={2}
          isAnimationActive={false}
        >
          {data.map((d) => (
            <Cell key={d.status} fill={STATUS_COLOR[d.status]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
