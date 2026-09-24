import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

export const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,76,129,.07)]', className)} {...props} />
));
Card.displayName = 'Card';

export const CardHeader = ({ className, ...props }) => (
  <div className={cn('flex flex-col gap-1.5 p-5 pb-3', className)} {...props} />
);
export const CardTitle = ({ className, ...props }) => (
  <h3 className={cn('font-semibold leading-none tracking-tight text-[15px]', className)} {...props} />
);
export const CardDescription = ({ className, ...props }) => (
  <p className={cn('text-sm text-slate-500', className)} {...props} />
);
export const CardContent = ({ className, ...props }) => (
  <div className={cn('p-5 pt-0', className)} {...props} />
);

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      color: {
        default: 'border-transparent bg-slate-100 text-slate-700',
        blue: 'border-transparent bg-blue-100 text-blue-800',
        green: 'border-transparent bg-emerald-100 text-emerald-800',
        red: 'border-transparent bg-red-100 text-red-800',
        orange: 'border-transparent bg-amber-100 text-amber-800',
        purple: 'border-transparent bg-violet-100 text-violet-800',
        cyan: 'border-transparent bg-cyan-100 text-cyan-800',
        gold: 'border-transparent bg-yellow-100 text-yellow-800',
        volcano: 'border-transparent bg-orange-100 text-orange-800',
        geekblue: 'border-transparent bg-indigo-100 text-indigo-800',
      },
    },
    defaultVariants: { color: 'default' },
  }
);
export const Badge = ({ className, color, ...props }) => (
  <span className={cn(badgeVariants({ color }), className)} {...props} />
);
