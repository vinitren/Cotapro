import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary-100 text-primary-700',
        secondary: 'bg-gray-100 dark:bg-white/10 text-[rgb(var(--fg))]',
        destructive: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
        outline: 'border border-[rgb(var(--border))] text-[rgb(var(--fg))]',
        draft: 'bg-gray-100 dark:bg-white/10 text-[rgb(var(--fg))]',
        sent: 'bg-blue-100 text-blue-700',
        approved: 'bg-primary-100 text-primary-700',
        rejected: 'bg-red-100 text-red-700',
        expired: 'bg-amber-100 text-amber-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
