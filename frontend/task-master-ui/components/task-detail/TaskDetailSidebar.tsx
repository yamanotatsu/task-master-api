"use client"

import React from 'react'
import { Calendar, User, Tag, Link, AlertCircle, Clock } from 'lucide-react'
import { Task } from '@/lib/api'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'

interface TaskDetailSidebarProps {
  task: Task
  projectId: string
  onTaskUpdate: (updates: Partial<Task>) => void
}

export const TaskDetailSidebar: React.FC<TaskDetailSidebarProps> = ({
  task,
  projectId,
  onTaskUpdate
}) => {
  const priorityOptions = [
    { value: 'high', label: '高', color: 'text-red-600' },
    { value: 'medium', label: '中', color: 'text-yellow-600' },
    { value: 'low', label: '低', color: 'text-gray-600' }
  ]

  return (
    <div className="w-64 border-l bg-gray-50 px-4 py-4 overflow-y-auto">
      <div className="space-y-6">
        {/* Priority */}
        <div>
          <label className="flex items-center text-xs font-medium text-gray-700 mb-2">
            <AlertCircle className="h-3 w-3 mr-1" />
            優先度
          </label>
          <Select
            value={task.priority}
            onValueChange={(value: Task['priority']) => onTaskUpdate({ priority: value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {priorityOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  <span className={option.color}>{option.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Assignee */}
        <div>
          <label className="flex items-center text-xs font-medium text-gray-700 mb-2">
            <User className="h-3 w-3 mr-1" />
            担当者
          </label>
          <button className="w-full text-left px-3 py-2 bg-white border rounded-md text-sm hover:bg-gray-50">
            {task.assignee || '未割当'}
          </button>
        </div>

        {/* Due Date */}
        <div>
          <label className="flex items-center text-xs font-medium text-gray-700 mb-2">
            <Calendar className="h-3 w-3 mr-1" />
            期限
          </label>
          <button className="w-full text-left px-3 py-2 bg-white border rounded-md text-sm hover:bg-gray-50">
            期限を設定
          </button>
        </div>

        {/* Estimated Effort */}
        <div>
          <label className="flex items-center text-xs font-medium text-gray-700 mb-2">
            <Clock className="h-3 w-3 mr-1" />
            見積もり工数
          </label>
          <Input
            type="text"
            value={task.estimatedEffort || ''}
            onChange={(e) => onTaskUpdate({ estimatedEffort: e.target.value })}
            placeholder="例: 2h, 1d, 3pts"
            className="w-full"
          />
        </div>

        {/* Actual Effort */}
        <div>
          <label className="flex items-center text-xs font-medium text-gray-700 mb-2">
            <Clock className="h-3 w-3 mr-1" />
            実績工数
          </label>
          <Input
            type="text"
            value={task.actualEffort || ''}
            onChange={(e) => onTaskUpdate({ actualEffort: e.target.value })}
            placeholder="例: 3h, 2d"
            className="w-full"
          />
        </div>

        {/* Labels */}
        <div>
          <label className="flex items-center text-xs font-medium text-gray-700 mb-2">
            <Tag className="h-3 w-3 mr-1" />
            ラベル
          </label>
          <button className="w-full text-left px-3 py-2 bg-white border rounded-md text-sm hover:bg-gray-50">
            ラベルを追加
          </button>
        </div>

        {/* Dependencies */}
        <div>
          <label className="flex items-center text-xs font-medium text-gray-700 mb-2">
            <Link className="h-3 w-3 mr-1" />
            依存関係
          </label>
          {task.dependencies.length > 0 ? (
            <div className="space-y-1">
              <p className="text-xs text-gray-600 mb-1">ブロックされているタスク:</p>
              {task.dependencies.map(depId => (
                <div key={depId} className="text-sm bg-white px-2 py-1 rounded border">
                  タスク #{depId}
                </div>
              ))}
            </div>
          ) : (
            <button className="w-full text-left px-3 py-2 bg-white border rounded-md text-sm hover:bg-gray-50">
              依存関係を追加
            </button>
          )}
        </div>

        {/* Metadata */}
        <div className="pt-4 border-t">
          <div className="space-y-2 text-xs text-gray-500">
            <div>
              <span className="font-medium">作成日:</span> {task.createdAt ? new Date(task.createdAt).toLocaleDateString('ja-JP') : '-'}
            </div>
            <div>
              <span className="font-medium">更新日:</span> {task.updatedAt ? new Date(task.updatedAt).toLocaleDateString('ja-JP') : '-'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}