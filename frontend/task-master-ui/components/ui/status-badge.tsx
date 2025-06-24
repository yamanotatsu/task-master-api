import { cn } from '@/lib/utils';

type StatusType =
	| 'pending'
	| 'in-progress'
	| 'done'
	| 'deferred'
	| 'cancelled'
	| 'review';

interface StatusBadgeProps {
	status: StatusType;
	className?: string;
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
	pending: {
		label: '未着手',
		className: 'bg-primary text-primary-foreground'
	},
	'in-progress': {
		label: '進行中',
		className: 'bg-chart-3 text-white'
	},
	done: {
		label: '完了',
		className: 'bg-chart-2 text-white'
	},
	review: {
		label: 'レビュー中',
		className: 'bg-chart-5 text-white'
	},
	deferred: {
		label: '延期',
		className: 'bg-muted text-muted-foreground'
	},
	cancelled: {
		label: 'キャンセル',
		className: 'bg-muted text-muted-foreground'
	}
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
	const config = statusConfig[status] || statusConfig['pending'];

	return (
		<span
			className={cn(
				'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
				config.className,
				className
			)}
		>
			{config.label}
		</span>
	);
}
