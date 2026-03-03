import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

type MetricVariant = 'primary' | 'amber' | 'green' | 'blue' | 'emerald';

const variantStyles: Record<
  MetricVariant,
  { bg: string; border: string; bar: string; iconBg: string; iconColor: string }
> = {
  primary: {
    bg: 'bg-emerald-500/8',
    border: 'border-emerald-500/25',
    bar: 'bg-emerald-500',
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400',
  },
  amber: {
    bg: 'bg-amber-500/8',
    border: 'border-amber-500/25',
    bar: 'bg-amber-500',
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
  },
  green: {
    bg: 'bg-emerald-500/8',
    border: 'border-emerald-500/25',
    bar: 'bg-emerald-500',
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400',
  },
  blue: {
    bg: 'bg-blue-500/8',
    border: 'border-blue-500/25',
    bar: 'bg-blue-500',
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
  },
  emerald: {
    bg: 'bg-emerald-500/8',
    border: 'border-emerald-500/25',
    bar: 'bg-emerald-500',
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400',
  },
};

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  variant?: MetricVariant;
  className?: string;
  order?: string;
  valueClassName?: string;
  cardClassName?: string;
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  variant = 'primary',
  className,
  order,
  valueClassName,
  cardClassName,
}: MetricCardProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        'group relative h-full flex overflow-hidden rounded-xl min-h-[92px]',
        'border',
        styles.bg,
        styles.border,
        'transition-all duration-300 ease-out',
        order,
        className
      )}
    >
      {/* Barra vertical colorida na lateral esquerda */}
      <div className={cn('w-1 flex-shrink-0', styles.bar)} aria-hidden />
      <div className={cn('p-4 flex flex-col justify-start flex-1 min-w-0', cardClassName)}>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'h-8 w-8 flex-shrink-0 rounded-lg flex items-center justify-center',
              styles.iconBg
            )}
          >
            <Icon className={cn('h-4 w-4', styles.iconColor)} />
          </div>
          <p className="text-xs font-medium text-zinc-400 leading-tight min-w-0">{label}</p>
        </div>
        <p className={cn('text-xl sm:text-2xl lg:text-3xl font-bold leading-tight whitespace-nowrap mt-2 text-black dark:text-white tracking-tight min-w-0 overflow-hidden', valueClassName)}>
          {value}
        </p>
      </div>
    </div>
  );
}
