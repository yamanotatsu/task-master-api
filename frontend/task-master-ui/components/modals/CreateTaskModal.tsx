'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog';
import { StatusSelect } from '@/components/ui/notion/Select';
import { PrioritySelect } from '@/components/ui/notion/Select';
import { DatePicker } from '@/components/ui/notion/DatePicker';
import { PersonTag } from '@/components/ui/notion/PersonTag';
import { api, Task } from '@/lib/api';
import { toast } from 'sonner';

interface CreateTaskModalProps {
	isOpen: boolean;
	onClose: () => void;
	onTaskCreated: (task: Task) => void;
	projectId: string;
	users?: Array<{ id: string; name: string; avatar?: string }>;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
	isOpen,
	onClose,
	onTaskCreated,
	projectId,
	users = []
}) => {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [formData, setFormData] = useState({
		title: '',
		description: '',
		details: '',
		testStrategy: '',
		priority: 'medium' as Task['priority'],
		status: 'not-started' as Task['status'],
		assigneeId: '',
		deadline: null as Date | null
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!formData.title.trim()) {
			toast.error('タイトルは必須です');
			return;
		}

		if (!formData.description.trim()) {
			toast.error('説明は必須です');
			return;
		}

		setIsSubmitting(true);
		try {
			const taskData: any = {
				projectId,
				title: formData.title.trim(),
				description: formData.description.trim(),
				details: formData.details.trim(),
				testStrategy: formData.testStrategy.trim(),
				priority: formData.priority,
				status: formData.status
			};

			// Only include optional fields if they have values
			if (formData.assigneeId) {
				taskData.assigneeId = formData.assigneeId;
			}
			if (formData.deadline) {
				taskData.deadline = formData.deadline.toISOString();
			}

			const response = await api.createTask(taskData);
			console.log('Created task response:', response); // デバッグ用ログ

			// APIレスポンスがTaskオブジェクトそのものか、taskIdを含むオブジェクトかを判定
			let createdTask: Task;

			if (response && typeof response === 'object') {
				if ('id' in response && 'title' in response) {
					// レスポンスが完全なTaskオブジェクトの場合
					createdTask = response as Task;
				} else if ('taskId' in response) {
					// レスポンスがtaskIdのみの場合は、作成したタスクを取得
					const fetchedTask = await api.getTask(String(response.taskId));
					createdTask = fetchedTask;
				} else if ('data' in response && response.data) {
					// レスポンスがdata属性にTaskを含む場合
					createdTask = response.data as Task;
				} else {
					// フォールバック: 送信したデータから構築
					createdTask = {
						id: String(response.taskId || response.id),
						title: taskData.title,
						description: taskData.description || undefined,
						status: taskData.status,
						priority: taskData.priority,
						dependencies: [],
						subtasks: [],
						details: taskData.details || undefined,
						testStrategy: taskData.testStrategy || undefined,
						assignee: taskData.assigneeId || undefined,
						deadline: taskData.deadline || undefined,
						estimatedEffort: undefined,
						actualEffort: undefined,
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString()
					};
				}

				toast.success('タスクを作成しました');
				onTaskCreated(createdTask);
				onClose();
				resetForm();
			} else {
				throw new Error('Invalid response from API');
			}
		} catch (error) {
			console.error('Failed to create task:', error);
			toast.error('タスクの作成に失敗しました');
		} finally {
			setIsSubmitting(false);
		}
	};

	const resetForm = () => {
		setFormData({
			title: '',
			description: '',
			details: '',
			testStrategy: '',
			priority: 'medium',
			status: 'not-started',
			assigneeId: '',
			deadline: null
		});
	};

	const handleClose = () => {
		if (!isSubmitting) {
			resetForm();
			onClose();
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>新規タスク作成</DialogTitle>
						<DialogDescription>
							新しいタスクを作成します。必須項目は「タイトル」と「説明」です。
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 py-4">
						{/* Title (Required) */}
						<div className="space-y-2">
							<Label htmlFor="title">
								タイトル <span className="text-red-500">*</span>
							</Label>
							<Input
								id="title"
								placeholder="タスクのタイトルを入力"
								value={formData.title}
								onChange={(e) =>
									setFormData({ ...formData, title: e.target.value })
								}
								maxLength={500}
								required
								autoFocus
							/>
						</div>

						{/* Description (Required) */}
						<div className="space-y-2">
							<Label htmlFor="description">
								説明 <span className="text-red-500">*</span>
							</Label>
							<Textarea
								id="description"
								placeholder="タスクの説明を入力"
								value={formData.description}
								onChange={(e) =>
									setFormData({ ...formData, description: e.target.value })
								}
								rows={3}
								required
							/>
						</div>

						{/* Status and Priority */}
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label>ステータス</Label>
								<StatusSelect
									value={formData.status}
									onChange={(value) =>
										setFormData({
											...formData,
											status: value as Task['status']
										})
									}
								/>
							</div>
							<div className="space-y-2">
								<Label>優先度</Label>
								<PrioritySelect
									value={formData.priority}
									onChange={(value) =>
										setFormData({
											...formData,
											priority: value as Task['priority']
										})
									}
								/>
							</div>
						</div>

						{/* Assignee and Deadline */}
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label>担当者</Label>
								<PersonTag
									users={users}
									value={formData.assigneeId}
									onChange={(userId) =>
										setFormData({ ...formData, assigneeId: userId })
									}
									placeholder="担当者を選択"
								/>
							</div>
							<div className="space-y-2">
								<Label>期限</Label>
								<DatePicker
									date={formData.deadline}
									onChange={(date) =>
										setFormData({ ...formData, deadline: date || null })
									}
									placeholder="期限を選択"
								/>
							</div>
						</div>

						{/* Details */}
						<div className="space-y-2">
							<Label htmlFor="details">詳細</Label>
							<Textarea
								id="details"
								placeholder="タスクの詳細情報を入力"
								value={formData.details}
								onChange={(e) =>
									setFormData({ ...formData, details: e.target.value })
								}
								rows={3}
							/>
						</div>

						{/* Test Strategy */}
						<div className="space-y-2">
							<Label htmlFor="testStrategy">テスト戦略</Label>
							<Textarea
								id="testStrategy"
								placeholder="テスト方針や戦略を入力"
								value={formData.testStrategy}
								onChange={(e) =>
									setFormData({ ...formData, testStrategy: e.target.value })
								}
								rows={3}
							/>
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={handleClose}
							disabled={isSubmitting}
						>
							キャンセル
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? '作成中...' : 'タスクを作成'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
};
