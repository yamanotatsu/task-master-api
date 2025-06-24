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
import { PersonTag } from '@/components/ui/notion/PersonTag';
import { api, Subtask } from '@/lib/api';
import { toast } from 'sonner';

interface CreateSubtaskModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSubtaskCreated: (subtask: Subtask) => void;
	taskId: string;
	users?: Array<{ id: string; name: string; avatar?: string }>;
}

export const CreateSubtaskModal: React.FC<CreateSubtaskModalProps> = ({
	isOpen,
	onClose,
	onSubtaskCreated,
	taskId,
	users = []
}) => {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [formData, setFormData] = useState({
		title: '',
		description: '',
		status: 'pending' as 'pending' | 'completed',
		assigneeId: ''
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!formData.title.trim()) {
			toast.error('タイトルは必須です');
			return;
		}

		setIsSubmitting(true);
		try {
			const subtaskData: any = {
				title: formData.title.trim(),
				status: formData.status
			};

			// Only include optional fields if they have values
			if (formData.description.trim()) {
				subtaskData.description = formData.description.trim();
			}
			if (formData.assigneeId) {
				subtaskData.assigneeId = formData.assigneeId;
			}

			const response = await api.addSubtask(taskId, subtaskData);
			console.log('Created subtask response:', response); // デバッグ用ログ

			// APIレスポンスから新しく作成されたサブタスクを取得
			if (response && response.subtasks && response.subtasks.length > 0) {
				// 最後のサブタスクが新しく作成されたもの
				const newSubtask = response.subtasks[response.subtasks.length - 1];
				const subtaskWithTaskId = {
					...newSubtask,
					taskId: taskId
				};

				toast.success('サブタスクを作成しました');
				onSubtaskCreated(subtaskWithTaskId);
				onClose();
				resetForm();
			} else {
				throw new Error('Invalid response from API');
			}
		} catch (error) {
			console.error('Failed to create subtask:', error);
			toast.error('サブタスクの作成に失敗しました');
		} finally {
			setIsSubmitting(false);
		}
	};

	const resetForm = () => {
		setFormData({
			title: '',
			description: '',
			status: 'pending',
			assigneeId: ''
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
			<DialogContent className="max-w-md">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>新規サブタスク作成</DialogTitle>
						<DialogDescription>
							新しいサブタスクを作成します。
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
								placeholder="サブタスクのタイトルを入力"
								value={formData.title}
								onChange={(e) =>
									setFormData({ ...formData, title: e.target.value })
								}
								required
								autoFocus
							/>
						</div>

						{/* Description */}
						<div className="space-y-2">
							<Label htmlFor="description">説明</Label>
							<Textarea
								id="description"
								placeholder="サブタスクの説明を入力"
								value={formData.description}
								onChange={(e) =>
									setFormData({ ...formData, description: e.target.value })
								}
								rows={3}
							/>
						</div>

						{/* Status */}
						<div className="space-y-2">
							<Label>ステータス</Label>
							<select
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
								value={formData.status}
								onChange={(e) =>
									setFormData({
										...formData,
										status: e.target.value as 'pending' | 'completed'
									})
								}
							>
								<option value="pending">未完了</option>
								<option value="completed">完了</option>
							</select>
						</div>

						{/* Assignee */}
						{users.length > 0 && (
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
						)}
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
							{isSubmitting ? '作成中...' : 'サブタスクを作成'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
};
