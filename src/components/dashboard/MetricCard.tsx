import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

type MetricVariant = 'primary' | 'amber' | 'green' | 'blue' | 'emerald';

const variantStyles: Record<
  MetricVariant,
  {
    gradient: string;
    glow: string;
    iconBg: string;
    iconColor: string;
  }
> = {
  primary: {
    gradient: 'from-primary-600 via-primary-500 to-primary-700',
    glow: 'shadow-[0_0_24px_-4px_rgba(22,163,74,0.4)]',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
  },
  amber: {
    gradient: 'from-amber-600 via-amber-500 to-amber-700',
    glow: 'shadow-[0_0_24px_-4px_rgba(217,119,6,0.4)]',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
  },
  green: {
    gradient: 'from-green-600 via-green-500 to-green-700',
    glow: 'shadow-[0_0_24px_-4px_rgba(22,163,74,0.4)]',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
  },
  blue: {
    gradient: 'from-blue-600 via-blue-500 to-blue-700',
    glow: 'shadow-[0_0_24px_-4px_rgba(59,130,246,0.4)]',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
  },
  emerald: {
    gradient: 'from-emerald-600 via-emerald-500 to-emerald-700',
    glow: 'shadow-[0_0_24px_-4px_rgba(5,150,105,0.4)]',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
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
        'group relative h-full flex flex-col overflow-hidden rounded-xl min-h-[92px]',
        'border border-white/20',
        'bg-gradient-to-br backdrop-blur-sm',
        styles.gradient,
        styles.glow,
        'transition-all duration-300 ease-out',
        'hover:-translate-y-0.5 hover:shadow-[0_0_32px_-4px_rgba(0,0,0,0.15)]',
        order,
        className
      )}
    >
      <div className={cn('p-4 flex flex-col justify-start', cardClassName)}>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'h-8 w-8 flex-shrink-0 rounded-lg flex items-center justify-center',
              styles.iconBg
            )}
          >
            <Icon className={cn('h-4 w-4', styles.iconColor)} />
          </div>
          <p className="text-sm font-medium text-white/90 leading-tight min-w-0">{label}</p>
        </div>
        <p className={cn('text-xl sm:text-2xl font-bold leading-tight mt-2 text-white tracking-tight drop-shadow-sm', valueClassName)}>
          {value}
        </p>
      </div>
    </div>
  );
}
