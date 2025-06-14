'use client';

import React, { useState, useCallback, memo } from 'react';
import {
	Trash2,
	GripVertical,
	Edit2,
	Check,
	X,
	ChevronDown,
	ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface TaskCandidate {
	tempId: string;
	title: string;
	description: string;
	details: string;
	test_strategy: string;
	priority: 'high' | 'medium' | 'low';
	order: number;
}

interface TaskCandidateCardProps {
	task: TaskCandidate;
	onUpdate: (tempId: string, updates: Partial<TaskCandidate>) => void;
	onDelete: (tempId: string) => void;
	isDragging?: boolean;
}

export const TaskCandidateCard = memo<TaskCandidateCardProps>(
	({ task, onUpdate, onDelete, isDragging }) => {
		const [isEditMode, setIsEditMode] = useState(false);
		const [isExpanded, setIsExpanded] = useState(false);
		const [editValues, setEditValues] = useState({
			title: task.title,
			description: task.description,
			details: task.details,
			test_strategy: task.test_strategy,
			priority: task.priority
		});

		const handleEnterEditMode = useCallback(() => {
			setIsEditMode(true);
			setEditValues({
				title: task.title,
				description: task.description,
				details: task.details,
				test_strategy: task.test_strategy,
				priority: task.priority
			});
		}, [task]);

		const handleSaveAll = useCallback(() => {
			onUpdate(task.tempId, editValues);
			setIsEditMode(false);
		}, [task.tempId, editValues, onUpdate]);

		const handleCancel = useCallback(() => {
			setEditValues({
				title: task.title,
				description: task.description,
				details: task.details,
				test_strategy: task.test_strategy,
				priority: task.priority
			});
			setIsEditMode(false);
		}, [task]);

		const handleFieldChange = useCallback(
			(field: keyof typeof editValues, value: string) => {
				setEditValues((prev) => ({ ...prev, [field]: value }));
			},
			[]
		);

		const handleDelete = useCallback(() => {
			onDelete(task.tempId);
		}, [task.tempId, onDelete]);

		const toggleExpanded = useCallback(() => {
			setIsExpanded((prev) => !prev);
		}, []);

		const handlePriorityChange = useCallback(
			(value: string) => {
				if (!isEditMode) {
					onUpdate(task.tempId, {
						priority: value as TaskCandidate['priority']
					});
				} else {
					setEditValues((prev) => ({
						...prev,
						priority: value as TaskCandidate['priority']
					}));
				}
			},
			[isEditMode, task.tempId, onUpdate]
		);

		return (
			<Card
				className={cn(
					'transition-all duration-200',
					isDragging && 'opacity-50 shadow-lg',
					isEditMode && 'ring-2 ring-primary'
				)}
			>
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2 flex-1">
							{!isEditMode && (
								<div
									className="cursor-move text-gray-400 hover:text-gray-600"
									aria-label="ドラッグハンドル"
								>
									<GripVertical className="h-5 w-5" />
								</div>
							)}
							<span className="text-sm text-gray-500 font-medium">
								#{task.order + 1}
							</span>
							{isEditMode ? (
								<Input
									value={editValues.title}
									onChange={(e) => handleFieldChange('title', e.target.value)}
									onKeyDown={(e) => {
										if (e.key === 'Enter') {
											e.preventDefault();
											handleSaveAll();
										}
										if (e.key === 'Escape') {
											e.preventDefault();
											handleCancel();
										}
									}}
									className="font-semibold text-base flex-1"
									placeholder="タスク名"
								/>
							) : (
								<h3 className="font-semibold text-base flex-1">{task.title}</h3>
							)}
						</div>
						<div className="flex items-center gap-1">
							<Select
								value={isEditMode ? editValues.priority : task.priority}
								onValueChange={handlePriorityChange}
							>
								<SelectTrigger className="w-24 h-8">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="high">
										<span className="flex items-center gap-1">
											<span className="w-2 h-2 bg-red-500 rounded-full" />高
										</span>
									</SelectItem>
									<SelectItem value="medium">
										<span className="flex items-center gap-1">
											<span className="w-2 h-2 bg-yellow-500 rounded-full" />中
										</span>
									</SelectItem>
									<SelectItem value="low">
										<span className="flex items-center gap-1">
											<span className="w-2 h-2 bg-blue-500 rounded-full" />低
										</span>
									</SelectItem>
								</SelectContent>
							</Select>

							{!isEditMode ? (
								<>
									<Button
										size="sm"
										variant="ghost"
										onClick={handleEnterEditMode}
										title="編集"
									>
										<Edit2 className="h-4 w-4" />
									</Button>
									<Button size="sm" variant="ghost" onClick={toggleExpanded}>
										{isExpanded ? (
											<ChevronUp className="h-4 w-4" />
										) : (
											<ChevronDown className="h-4 w-4" />
										)}
									</Button>
									<Button
										size="sm"
										variant="ghost"
										onClick={handleDelete}
										className="text-red-500 hover:text-red-700"
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</>
							) : (
								<>
									<Button
										size="sm"
										variant="ghost"
										onClick={handleSaveAll}
										className="text-green-600 hover:text-green-700"
										title="保存"
									>
										<Check className="h-4 w-4" />
									</Button>
									<Button
										size="sm"
										variant="ghost"
										onClick={handleCancel}
										title="キャンセル"
									>
										<X className="h-4 w-4" />
									</Button>
								</>
							)}
						</div>
					</div>
				</CardHeader>

				{(isExpanded || isEditMode) && (
					<CardContent className="pt-0 space-y-4">
						<div>
							<label className="text-sm font-medium text-gray-700 mb-1 block">
								説明
							</label>
							{isEditMode ? (
								<Textarea
									value={editValues.description}
									onChange={(e) =>
										handleFieldChange('description', e.target.value)
									}
									onKeyDown={(e) => {
										if (e.key === 'Escape') {
											e.preventDefault();
											handleCancel();
										}
									}}
									className="min-h-[60px]"
									placeholder="タスクの説明"
								/>
							) : (
								<p className="text-sm text-gray-600 whitespace-pre-wrap">
									{task.description || '説明なし'}
								</p>
							)}
						</div>

						<div>
							<label className="text-sm font-medium text-gray-700 mb-1 block">
								詳細
							</label>
							{isEditMode ? (
								<Textarea
									value={editValues.details}
									onChange={(e) => handleFieldChange('details', e.target.value)}
									onKeyDown={(e) => {
										if (e.key === 'Escape') {
											e.preventDefault();
											handleCancel();
										}
									}}
									className="min-h-[100px]"
									placeholder="実装の詳細"
								/>
							) : (
								<p className="text-sm text-gray-600 whitespace-pre-wrap">
									{task.details || '詳細なし'}
								</p>
							)}
						</div>

						<div>
							<label className="text-sm font-medium text-gray-700 mb-1 block">
								テスト戦略
							</label>
							{isEditMode ? (
								<Textarea
									value={editValues.test_strategy}
									onChange={(e) =>
										handleFieldChange('test_strategy', e.target.value)
									}
									onKeyDown={(e) => {
										if (e.key === 'Escape') {
											e.preventDefault();
											handleCancel();
										}
									}}
									className="min-h-[60px]"
									placeholder="テスト戦略"
								/>
							) : (
								<p className="text-sm text-gray-600 whitespace-pre-wrap">
									{task.test_strategy || 'テスト戦略なし'}
								</p>
							)}
						</div>
					</CardContent>
				)}
			</Card>
		);
	}
);

TaskCandidateCard.displayName = 'TaskCandidateCard';
