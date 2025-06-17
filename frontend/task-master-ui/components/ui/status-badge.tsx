import { cn } from '@/lib/utils';

type StatusType =
	| 'pending'
	| 'in-progress'
	| 'done'
	| 'blocked'
	| 'not-started'
	| 'completed'
	| 'deferred'
	| 'cancelled'
	| 'review';

interface StatusBadgeProps {
	status: StatusType;
	className?: string;
}

const statusConfig: Record<StatusType, { label: string; className: string; icon?: string }> = {
	'not-started': {
		label: '未着手',
		className: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
		icon: '○'
	},
	pending: {
		label: '未着手',
		className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
		icon: '○'
	},
	'in-progress': {
		label: '進行中',
		className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
		icon: '◐'
	},
	done: {
		label: '完了',
		className: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
		icon: '✓'
	},
	completed: {
		label: '完了',
		className: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
		icon: '✓'
	},
	blocked: {
		label: 'ブロック中',
		className: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800',
		icon: '✕'
	},
	review: {
		label: 'レビュー中',
		className: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800',
		icon: '⟲'
	},
	deferred: {
		label: '延期',
		className: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700',
		icon: '⏸'
	},
	cancelled: {
		label: 'キャンセル',
		className: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500 border border-gray-200 dark:border-gray-700',
		icon: '⊝'
	}
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
	const config = statusConfig[status] || statusConfig['pending'];

	return (
		<span
			className={cn(
				'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105',
				config.className,
				className
			)}
		>
			{config.icon && <span className="text-sm opacity-75">{config.icon}</span>}
			{config.label}
		</span>
	);
}
