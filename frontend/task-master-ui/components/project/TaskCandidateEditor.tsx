'use client';

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	DragEndEvent
} from '@dnd-kit/core';
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TaskCandidateCard, TaskCandidate } from './TaskCandidateCard';
import { taskCandidateStorage, debounce } from '@/lib/localStorage';
import { toast } from 'sonner';

interface TaskCandidateEditorProps {
	sessionId: string;
	projectName: string;
	projectDescription?: string;
	prdContent: string;
	deadline?: string;
	initialTasks: TaskCandidate[];
	onConfirm: (tasks: TaskCandidate[]) => void;
	onBack: () => void;
}

// Sortable wrapper component
const SortableTaskCard = memo<{
	task: TaskCandidate;
	onUpdate: (tempId: string, updates: Partial<TaskCandidate>) => void;
	onDelete: (tempId: string) => void;
}>(({ task, onUpdate, onDelete }) => {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging
	} = useSortable({ id: task.tempId });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		zIndex: isDragging ? 1 : 0
	};

	return (
		<div ref={setNodeRef} style={style} {...attributes} {...listeners}>
			<TaskCandidateCard
				task={task}
				onUpdate={onUpdate}
				onDelete={onDelete}
				isDragging={isDragging}
			/>
		</div>
	);
});

SortableTaskCard.displayName = 'SortableTaskCard';

export const TaskCandidateEditor: React.FC<TaskCandidateEditorProps> = ({
	sessionId,
	projectName,
	projectDescription,
	prdContent,
	deadline,
	initialTasks,
	onConfirm,
	onBack
}) => {
	const [tasks, setTasks] = useState<TaskCandidate[]>(initialTasks);
	const [isValidating, setIsValidating] = useState(false);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8
			}
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates
		})
	);

	// Debounced save function
	const debouncedSave = useMemo(
		() =>
			debounce(async (sessionId: string, data: any) => {
				await taskCandidateStorage.save(sessionId, data);
			}, 500),
		[]
	);

	// Save to localStorage whenever tasks change (debounced)
	useEffect(() => {
		debouncedSave(sessionId, {
			projectName,
			projectDescription,
			prdContent,
			deadline,
			tasks
		});
	}, [
		tasks,
		sessionId,
		projectName,
		projectDescription,
		prdContent,
		deadline,
		debouncedSave
	]);

	const handleDragEnd = useCallback((event: DragEndEvent) => {
		const { active, over } = event;

		if (over && active.id !== over.id) {
			setTasks((items) => {
				const oldIndex = items.findIndex((item) => item.tempId === active.id);
				const newIndex = items.findIndex((item) => item.tempId === over.id);

				const newItems = arrayMove(items, oldIndex, newIndex);
				// Update order numbers
				return newItems.map((item, index) => ({
					...item,
					order: index + 1
				}));
			});
		}
	}, []);

	const handleTaskUpdate = useCallback(
		(tempId: string, updates: Partial<TaskCandidate>) => {
			setTasks((prevTasks) =>
				prevTasks.map((task) =>
					task.tempId === tempId ? { ...task, ...updates } : task
				)
			);
		},
		[]
	);

	const handleTaskDelete = useCallback((tempId: string) => {
		setTasks((prevTasks) => {
			const newTasks = prevTasks.filter((task) => task.tempId !== tempId);
			// Reorder remaining tasks
			return newTasks.map((task, index) => ({
				...task,
				order: index + 1
			}));
		});
	}, []);

	const handleAddTask = useCallback(() => {
		const newTask: TaskCandidate = {
			tempId: `temp_${Date.now()}_${Math.random()}`,
			title: '新しいタスク',
			description: '',
			details: '',
			test_strategy: '',
			priority: 'medium',
			order: tasks.length + 1
		};
		setTasks((prevTasks) => [...prevTasks, newTask]);
	}, [tasks.length]);

	const handleConfirm = useCallback(async () => {
		console.log('TaskCandidateEditor handleConfirm called');
		console.log('Current tasks:', tasks);

		// Validate tasks
		const invalidTasks = tasks.filter((task) => !task.title.trim());
		if (invalidTasks.length > 0) {
			toast.error(
				'タスク名は必須です。全てのタスクにタイトルを入力してください。'
			);
			return;
		}

		if (tasks.length === 0) {
			toast.error('少なくとも1つのタスクを作成してください。');
			return;
		}

		setIsValidating(true);
		try {
			console.log('Calling onConfirm with tasks:', tasks);
			// Remove session data after confirming
			taskCandidateStorage.remove(sessionId);
			onConfirm(tasks);
		} catch (error) {
			console.error('Failed to confirm tasks - full error:', error);
			console.error('Error details:', {
				message: error instanceof Error ? error.message : 'Unknown error',
				stack: error instanceof Error ? error.stack : 'No stack trace'
			});
			toast.error('タスクの確認中にエラーが発生しました。');
		} finally {
			console.log('handleConfirm finally block, setting isValidating to false');
			setIsValidating(false);
		}
	}, [tasks, sessionId, onConfirm]);

	const taskIds = useMemo(() => tasks.map((task) => task.tempId), [tasks]);

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h2 className="text-2xl font-bold">タスク候補の編集</h2>
				<div className="text-sm text-gray-600">{tasks.length} 個のタスク</div>
			</div>

			<div className="space-y-4">
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragEnd={handleDragEnd}
				>
					<SortableContext
						items={taskIds}
						strategy={verticalListSortingStrategy}
					>
						<div className="space-y-4">
							{tasks.map((task) => (
								<SortableTaskCard
									key={task.tempId}
									task={task}
									onUpdate={handleTaskUpdate}
									onDelete={handleTaskDelete}
								/>
							))}
						</div>
					</SortableContext>
				</DndContext>

				<Button
					onClick={handleAddTask}
					variant="outline"
					className="w-full border-dashed"
				>
					<Plus className="mr-2 h-4 w-4" />
					タスクを追加
				</Button>
			</div>

			<div className="flex justify-between pt-6 border-t">
				<Button variant="outline" onClick={onBack}>
					戻る
				</Button>
				<Button
					onClick={() => {
						console.log('Button clicked!');
						console.log('isValidating:', isValidating);
						console.log('tasks.length:', tasks.length);
						console.log('Button disabled:', isValidating || tasks.length === 0);
						handleConfirm();
					}}
					disabled={isValidating || tasks.length === 0}
				>
					{isValidating ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							検証中...
						</>
					) : (
						'タスクを確定'
					)}
				</Button>
			</div>
		</div>
	);
};
