import { useState, useCallback } from 'react';
import { Task } from '@/lib/api';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export const useDependencies = (
	taskId: number,
	onTaskUpdate?: (task: Task) => void
) => {
	const [isAddingDependency, setIsAddingDependency] = useState(false);
	const [isRemovingDependency, setIsRemovingDependency] = useState(false);
	const [isValidating, setIsValidating] = useState(false);

	const addDependency = useCallback(
		async (dependencyId: number) => {
			setIsAddingDependency(true);
			try {
				const updatedTask = await api.addDependency(taskId, dependencyId);
				onTaskUpdate?.(updatedTask);
				toast.success('依存関係を追加しました');
				return updatedTask;
			} catch (error) {
				console.error('Failed to add dependency:', error);
				toast.error('依存関係の追加に失敗しました');
				throw error;
			} finally {
				setIsAddingDependency(false);
			}
		},
		[taskId, onTaskUpdate]
	);

	const removeDependency = useCallback(
		async (dependencyId: number) => {
			setIsRemovingDependency(true);
			try {
				const updatedTask = await api.removeDependency(taskId, dependencyId);
				onTaskUpdate?.(updatedTask);
				toast.success('依存関係を削除しました');
				return updatedTask;
			} catch (error) {
				console.error('Failed to remove dependency:', error);
				toast.error('依存関係の削除に失敗しました');
				throw error;
			} finally {
				setIsRemovingDependency(false);
			}
		},
		[taskId, onTaskUpdate]
	);

	const validateDependencies = useCallback(async (autoFix: boolean = false) => {
		setIsValidating(true);
		try {
			const result = await api.validateDependencies(autoFix);

			if (result.isValid) {
				toast.success('依存関係に問題はありません');
			} else {
				const message = autoFix
					? `${result.fixed}件の問題を修正しました`
					: `${result.issues.length}件の問題が見つかりました`;
				toast.warning(message);
			}

			return result;
		} catch (error) {
			console.error('Failed to validate dependencies:', error);
			toast.error('依存関係の検証に失敗しました');
			throw error;
		} finally {
			setIsValidating(false);
		}
	}, []);

	const fixDependencies = useCallback(async () => {
		try {
			const result = await api.fixDependencies();
			toast.success('依存関係の問題を修正しました');
			return result;
		} catch (error) {
			console.error('Failed to fix dependencies:', error);
			toast.error('依存関係の修正に失敗しました');
			throw error;
		}
	}, []);

	return {
		addDependency,
		removeDependency,
		validateDependencies,
		fixDependencies,
		isAddingDependency,
		isRemovingDependency,
		isValidating
	};
};
