'use client';

import React from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ErrorType = 'error' | 'warning' | 'info' | 'success';

interface ErrorMessageProps {
	type?: ErrorType;
	title?: string;
	message: string;
	action?: {
		label: string;
		onClick: () => void;
	};
	onDismiss?: () => void;
	className?: string;
}

const iconMap = {
	error: AlertCircle,
	warning: AlertTriangle,
	info: Info,
	success: CheckCircle
};

const colorMap = {
	error: 'bg-red-50 border-red-200 text-red-800',
	warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
	info: 'bg-blue-50 border-blue-200 text-blue-800',
	success: 'bg-green-50 border-green-200 text-green-800'
};

const iconColorMap = {
	error: 'text-red-600',
	warning: 'text-yellow-600',
	info: 'text-blue-600',
	success: 'text-green-600'
};

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
	type = 'error',
	title,
	message,
	action,
	onDismiss,
	className
}) => {
	const Icon = iconMap[type];

	return (
		<div
			className={cn('rounded-lg border p-4', colorMap[type], className)}
			role="alert"
		>
			<div className="flex">
				<div className="flex-shrink-0">
					<Icon className={cn('h-5 w-5', iconColorMap[type])} />
				</div>
				<div className="ml-3 flex-1">
					{title && <h3 className="text-sm font-medium mb-1">{title}</h3>}
					<p className="text-sm">{message}</p>
					{action && (
						<div className="mt-3">
							<Button
								size="sm"
								variant="outline"
								onClick={action.onClick}
								className={cn(
									'border-current text-current hover:bg-current/10',
									type === 'error' && 'hover:bg-red-100',
									type === 'warning' && 'hover:bg-yellow-100',
									type === 'info' && 'hover:bg-blue-100',
									type === 'success' && 'hover:bg-green-100'
								)}
							>
								{action.label}
							</Button>
						</div>
					)}
				</div>
				{onDismiss && (
					<div className="ml-auto pl-3">
						<button
							onClick={onDismiss}
							className={cn(
								'inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2',
								type === 'error' && 'hover:bg-red-100 focus:ring-red-600',
								type === 'warning' &&
									'hover:bg-yellow-100 focus:ring-yellow-600',
								type === 'info' && 'hover:bg-blue-100 focus:ring-blue-600',
								type === 'success' && 'hover:bg-green-100 focus:ring-green-600'
							)}
						>
							<X className="h-4 w-4" />
						</button>
					</div>
				)}
			</div>
		</div>
	);
};
