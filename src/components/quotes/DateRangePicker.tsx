import { useState, useEffect } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { ptBR } from 'react-day-picker/locale';
import {
  format,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  subDays,
  subMonths,
  isSameDay,
} from 'date-fns';
import 'react-day-picker/style.css';
import { cn } from '../../lib/utils';

const ACCENT = '#22C55E';
const ACCENT_BG = 'rgba(34, 197, 94, 0.15)';

export interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  onApply?: () => void;
  onClear?: () => void;
}

function formatRangeLabel(range: DateRange | undefined): string {
  if (!range?.from) return 'Selecione um período';
  const fromStr = format(range.from, 'dd/MM/yyyy');
  if (!range.to) return `${fromStr} - ...`;
  return `${fromStr} - ${format(range.to, 'dd/MM/yyyy')}`;
}

type ShortcutId = 'hoje' | 'ultimos7' | 'ultimos30' | 'este-mes' | 'mes-passado';

const SHORTCUTS: { id: ShortcutId; label: string; getRange: () => DateRange }[] = [
  {
    id: 'hoje',
    label: 'Hoje',
    getRange: () => {
      const today = new Date();
      return { from: startOfDay(today), to: endOfDay(today) };
    },
  },
  {
    id: 'ultimos7',
    label: 'Últimos 7 dias',
    getRange: () => {
      const today = new Date();
      return { from: startOfDay(subDays(today, 6)), to: endOfDay(today) };
    },
  },
  {
    id: 'ultimos30',
    label: 'Últimos 30 dias',
    getRange: () => {
      const today = new Date();
      return { from: startOfDay(subDays(today, 29)), to: endOfDay(today) };
    },
  },
  {
    id: 'este-mes',
    label: 'Este mês',
    getRange: () => {
      const today = new Date();
      return { from: startOfMonth(today), to: endOfMonth(today) };
    },
  },
  {
    id: 'mes-passado',
    label: 'Mês passado',
    getRange: () => {
      const prev = subMonths(new Date(), 1);
      return { from: startOfMonth(prev), to: endOfMonth(prev) };
    },
  },
];

function isShortcutActive(value: DateRange | undefined, getRange: () => DateRange): boolean {
  if (!value?.from || !value?.to) return false;
  const range = getRange();
  return isSameDay(value.from, range.from!) && isSameDay(value.to, range.to!);
}

export function DateRangePicker({
  value,
  onChange,
  onApply,
  onClear,
}: DateRangePickerProps) {
  const [numberOfMonths, setNumberOfMonths] = useState(2);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => setNumberOfMonths(mq.matches ? 1 : 2);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const showActions = Boolean(onApply ?? onClear);

  return (
    <div
      className={cn(
        'rdp-root rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--cardFg))] p-4 shadow-sm',
        'dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--card))] dark:text-[rgb(var(--cardFg))]'
      )}
      style={
        {
          '--rdp-accent-color': ACCENT,
          '--rdp-accent-background-color': ACCENT_BG,
          '--rdp-range_start-background': ACCENT,
          '--rdp-range_start-color': '#fff',
          '--rdp-range_end-background': ACCENT,
          '--rdp-range_end-color': '#fff',
          '--rdp-range_middle-background-color': ACCENT_BG,
          '--rdp-range_middle-color': 'inherit',
        } as React.CSSProperties
      }
    >
      {/* Resumo do período */}
      <p
        className={cn(
          'mb-2 text-sm font-medium',
          value?.from
            ? 'text-[rgb(var(--cardFg))]'
            : 'text-[rgb(var(--muted))] dark:text-[rgb(var(--muted))]'
        )}
      >
        {formatRangeLabel(value)}
      </p>

      {/* Atalhos rápidos */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {SHORTCUTS.map(({ id, label, getRange }) => {
          const active = isShortcutActive(value, getRange);
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange?.(getRange())}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                active
                  ? 'bg-[#22C55E] text-white hover:bg-[#1ea34e] dark:bg-[#22C55E] dark:hover:bg-[#1ea34e]'
                  : 'border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--cardFg))] hover:bg-gray-100 dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--card))] dark:hover:bg-white/10'
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      <DayPicker
        mode="range"
        locale={ptBR}
        selected={value}
        onSelect={onChange}
        numberOfMonths={numberOfMonths}
        classNames={{
          root: 'w-full',
          months: 'flex flex-wrap justify-center gap-4',
          month: 'flex flex-col gap-2',
          month_caption: 'flex justify-between items-center h-9 px-1 text-[rgb(var(--cardFg))]',
          nav: 'flex items-center gap-1',
          button_previous: 'h-8 w-8 rounded border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--cardFg))] hover:bg-gray-100 dark:hover:bg-white/10',
          button_next: 'h-8 w-8 rounded border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--cardFg))] hover:bg-gray-100 dark:hover:bg-white/10',
          month_grid: 'w-full border-collapse',
          weekdays: 'text-[rgb(var(--muted))] text-xs font-medium',
          day_button:
            'h-9 w-9 rounded-md text-sm text-[rgb(var(--cardFg))] hover:bg-gray-100 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#22C55E] focus:ring-offset-2 focus:ring-offset-[rgb(var(--card))]',
          selected:
            'bg-[#22C55E] text-white hover:bg-[#22C55E] hover:text-white dark:bg-[#22C55E] dark:text-white',
          today: 'font-semibold text-[#22C55E]',
          outside: 'text-[rgb(var(--muted))] opacity-50',
          disabled: 'opacity-40 cursor-not-allowed',
          range_start: 'rounded-s-md bg-[#22C55E] text-white',
          range_end: 'rounded-e-md bg-[#22C55E] text-white',
          range_middle:
            'rounded-none bg-[rgba(34,197,94,0.15)] dark:bg-[rgba(34,197,94,0.25)] text-[rgb(var(--cardFg))]',
        }}
      />

      {showActions && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-[rgb(var(--border))] pt-4 dark:border-[rgb(var(--border))]">
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className={cn(
                'rounded-lg border border-[rgb(var(--border))] px-3 py-1.5 text-sm font-medium',
                'text-[rgb(var(--fg))] hover:bg-gray-100 dark:hover:bg-white/10'
              )}
            >
              Limpar
            </button>
          )}
          {onApply && (
            <button
              type="button"
              onClick={onApply}
              className="rounded-lg bg-[#22C55E] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#1ea34e] focus:outline-none focus:ring-2 focus:ring-[#22C55E] focus:ring-offset-2 focus:ring-offset-[rgb(var(--card))]"
            >
              Aplicar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
