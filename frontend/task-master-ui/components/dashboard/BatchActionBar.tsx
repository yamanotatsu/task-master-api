'use client';

import React, { useState } from 'react';
import { X, ChevronDown, Trash2, CheckCircle, User, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Task } from '@/lib/api';
import { StatusBadge } from '@/components/ui/status-badge';
import { motion, AnimatePresence } from 'framer-motion';

interface BatchActionBarProps {
	selectedCount: number;
	onClearSelection: () => void;
	onBatchStatusChange: (status: Task['status']) => void;
	onBatchAssigneeChange: (assignee: string) => void;
	onBatchDelete: () => void;
	onBatchPriorityChange: (priority: Task['priority']) => void;
	members?: Array<{ id: string; name: string }>;
}

export const BatchActionBar: React.FC<BatchActionBarProps> = ({
	selectedCount,
	onClearSelection,
	onBatchStatusChange,
	onBatchAssigneeChange,
	onBatchDelete,
	onBatchPriorityChange,
	members = []
}) => {
	const [isDeleting, setIsDeleting] = useState(false);

	const statusOptions: Array<{ value: Task['status']; label: string }> = [
		{ value: 'not-started', label: '未着手' },
		{ value: 'pending', label: '保留中' },
		{ value: 'in-progress', label: '進行中' },
		{ value: 'review', label: 'レビュー中' },
		{ value: 'completed', label: '完了' },
		{ value: 'blocked', label: 'ブロック' },
		{ value: 'cancelled', label: 'キャンセル' }
	];

	const priorityOptions: Array<{
		value: Task['priority'];
		label: string;
		color: string;
	}> = [
		{ value: 'high', label: '高', color: 'text-red-600' },
		{ value: 'medium', label: '中', color: 'text-yellow-600' },
		{ value: 'low', label: '低', color: 'text-gray-600' }
	];

	const handleDelete = () => {
		if (
			confirm(`選択した${selectedCount}件のタスクを削除してもよろしいですか？`)
		) {
			setIsDeleting(true);
			onBatchDelete();
			setTimeout(() => setIsDeleting(false), 500);
		}
	};

	return (
		<AnimatePresence>
			{selectedCount > 0 && (
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: 20 }}
					transition={{ duration: 0.2 }}
					className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-30"
				>
					<div className="bg-white rounded-lg shadow-xl border p-4 flex items-center space-x-4">
						<div className="flex items-center space-x-2">
							<Badge variant="secondary" className="text-sm">
								{selectedCount}件選択中
							</Badge>
							<Button
								variant="ghost"
								size="sm"
								onClick={onClearSelection}
								className="h-8 w-8 p-0"
							>
								<X className="h-4 w-4" />
							</Button>
						</div>

						<div className="h-6 w-px bg-gray-300" />

						<div className="flex items-center space-x-2">
							{/* Status Change */}
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" size="sm">
										<CheckCircle className="mr-2 h-4 w-4" />
										ステータス
										<ChevronDown className="ml-2 h-4 w-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent>
									{statusOptions.map((option) => (
										<DropdownMenuItem
											key={option.value}
											onClick={() => onBatchStatusChange(option.value)}
										>
											<StatusBadge status={option.value} />
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>

							{/* Priority Change */}
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" size="sm">
										<Tag className="mr-2 h-4 w-4" />
										優先度
										<ChevronDown className="ml-2 h-4 w-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent>
									{priorityOptions.map((option) => (
										<DropdownMenuItem
											key={option.value}
											onClick={() => onBatchPriorityChange(option.value)}
										>
											<span className={option.color}>{option.label}</span>
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>

							{/* Assignee Change */}
							{members.length > 0 && (
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="outline" size="sm">
											<User className="mr-2 h-4 w-4" />
											担当者
											<ChevronDown className="ml-2 h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent>
										<DropdownMenuItem onClick={() => onBatchAssigneeChange('')}>
											未割当
										</DropdownMenuItem>
										<DropdownMenuSeparator />
										{members.map((member) => (
											<DropdownMenuItem
												key={member.id}
												onClick={() => onBatchAssigneeChange(member.name)}
											>
												<div className="flex items-center">
													<div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center mr-2">
														<span className="text-xs font-medium">
															{member.name.charAt(0)}
														</span>
													</div>
													{member.name}
												</div>
											</DropdownMenuItem>
										))}
									</DropdownMenuContent>
								</DropdownMenu>
							)}

							<div className="h-6 w-px bg-gray-300" />

							{/* Delete */}
							<Button
								variant="outline"
								size="sm"
								onClick={handleDelete}
								disabled={isDeleting}
								className="text-red-600 hover:text-red-700 hover:bg-red-50"
							>
								<Trash2 className="mr-2 h-4 w-4" />
								{isDeleting ? '削除中...' : '削除'}
							</Button>
						</div>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};
