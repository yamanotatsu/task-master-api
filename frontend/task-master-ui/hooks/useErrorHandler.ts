import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface ErrorState {
	isError: boolean;
	message: string;
	details?: any;
}

export const useErrorHandler = () => {
	const [error, setError] = useState<ErrorState>({
		isError: false,
		message: '',
		details: null
	});

	const handleError = useCallback((error: unknown, customMessage?: string) => {
		console.error('Error occurred:', error);

		let message = customMessage || 'エラーが発生しました';
		let details = null;

		if (error instanceof Error) {
			message = customMessage || error.message;
			details = {
				name: error.name,
				stack: error.stack
			};
		} else if (typeof error === 'string') {
			message = error;
		} else if (error && typeof error === 'object' && 'message' in error) {
			message = customMessage || (error as any).message;
			details = error;
		}

		setError({
			isError: true,
			message,
			details
		});

		// Show toast notification
		toast.error(message);

		return { message, details };
	}, []);

	const clearError = useCallback(() => {
		setError({
			isError: false,
			message: '',
			details: null
		});
	}, []);

	const withErrorHandling = useCallback(
		async <T>(
			asyncFn: () => Promise<T>,
			options?: {
				customMessage?: string;
				showToast?: boolean;
				onError?: (error: any) => void;
			}
		): Promise<T | null> => {
			try {
				return await asyncFn();
			} catch (error) {
				const errorInfo = handleError(error, options?.customMessage);

				if (options?.onError) {
					options.onError(errorInfo);
				}

				return null;
			}
		},
		[handleError]
	);

	return {
		error,
		handleError,
		clearError,
		withErrorHandling
	};
};
