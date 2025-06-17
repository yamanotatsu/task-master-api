import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
	'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
	{
		variants: {
			variant: {
				default:
					'border-transparent bg-primary/10 text-primary hover:bg-primary/20',
				secondary:
					'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
				destructive:
					'border-transparent bg-destructive/10 text-destructive hover:bg-destructive/20',
				outline: 'text-foreground border-border',
				success:
					'border-transparent bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20',
				warning:
					'border-transparent bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20',
				pending:
					'border-transparent bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20',
				'in-progress':
					'border-transparent bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20',
				done: 'border-transparent bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20',
				blocked:
					'border-transparent bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20'
			}
		},
		defaultVariants: {
			variant: 'default'
		}
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
