import {
  addMonthsIso,
  endOfMonthIso,
  endOfWeekIso,
  startOfMonthIso,
  startOfWeekIso,
  todayIso,
  type IsoDate,
} from '@routeflow/types';
import { DatePicker, Label, Select } from '@routeflow/ui';

export type PeriodPreset = 'month' | 'last-month' | 'week' | 'custom';

export function presetRange(
  preset: PeriodPreset,
  today = todayIso(),
): { from: IsoDate; to: IsoDate } {
  if (preset === 'week') return { from: startOfWeekIso(today), to: endOfWeekIso(today) };
  if (preset === 'last-month') {
    const ref = addMonthsIso(startOfMonthIso(today), -1);
    return { from: ref, to: endOfMonthIso(ref) };
  }
  return { from: startOfMonthIso(today), to: endOfMonthIso(today) };
}

/** Seletor de período (este mês, mês passado, semana, personalizado). */
export function PeriodPicker({
  preset,
  from,
  to,
  onChange,
}: {
  preset: PeriodPreset;
  from: IsoDate;
  to: IsoDate;
  onChange: (v: { preset: PeriodPreset; from: IsoDate; to: IsoDate }) => void;
}) {
  return (
    <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-[minmax(10rem,14rem)_1fr_1fr] sm:items-end">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="period-preset">Período</Label>
        <Select
          id="period-preset"
          value={preset}
          onChange={(e) => {
            const value = e.target.value as PeriodPreset;
            onChange(
              value === 'custom'
                ? { preset: value, from, to }
                : { preset: value, ...presetRange(value) },
            );
          }}
        >
          <option value="month">Este mês</option>
          <option value="last-month">Mês passado</option>
          <option value="week">Esta semana</option>
          <option value="custom">Personalizado</option>
        </Select>
      </div>
      {preset === 'custom' ? (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="period-from">De</Label>
            <DatePicker
              id="period-from"
              value={from}
              max={to}
              onChange={(e) => e.target.value && onChange({ preset, from: e.target.value, to })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="period-to">Até</Label>
            <DatePicker
              id="period-to"
              value={to}
              min={from}
              onChange={(e) => e.target.value && onChange({ preset, from, to: e.target.value })}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
