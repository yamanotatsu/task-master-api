"use client"

import React, { useState } from 'react'
import { ChevronRight, ChevronDown, MoreHorizontal, Calendar, User, Link } from 'lucide-react'
import { Task } from '@/lib/api'
import { StatusBadge } from '@/components/ui/status-badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SubtaskRow } from './SubtaskRow'

interface TaskRowProps {
  task: Task
  allTasks: Task[]
  projectId: string
  isExpanded: boolean
  onToggle: () => void
  onTaskClick: (taskId: number) => void
  onTaskStatusChange: (taskId: number, status: Task['status']) => void
  onTaskDelete: (taskId: number) => void
  isSelected: boolean
  onTaskSelect: (checked: boolean) => void
  depth: number
  expandedTasks: Set<number>
  onToggleSubtask: (taskId: number) => void
  selectedTasks: number[]
  onSubtaskSelect: (taskId: number, checked: boolean) => void
}

export const TaskRow: React.FC<TaskRowProps> = React.memo(({
  task,
  allTasks,
  projectId,
  isExpanded,
  onToggle,
  onTaskClick,
  onTaskStatusChange,
  onTaskDelete,
  isSelected,
  onTaskSelect,
  depth,
  expandedTasks,
  onToggleSubtask,
  selectedTasks,
  onSubtaskSelect
}) => {
  const [showMenu, setShowMenu] = useState(false)
  const hasSubtasks = task.subtasks && task.subtasks.length > 0
  const isCompleted = task.status === 'completed' || task.status === 'done'

  const statusOptions: Array<{ value: Task['status'], label: string, color: string }> = [
    { value: 'not-started', label: '未着手', color: 'gray' },
    { value: 'pending', label: '保留中', color: 'yellow' },
    { value: 'in-progress', label: '進行中', color: 'blue' },
    { value: 'review', label: 'レビュー中', color: 'purple' },
    { value: 'completed', label: '完了', color: 'green' },
    { value: 'blocked', label: 'ブロック', color: 'red' },
    { value: 'cancelled', label: 'キャンセル', color: 'gray' }
  ]

  return (
    <>
      <tr 
        className="group hover:bg-gray-50 transition-colors border-b"
        onMouseEnter={() => setShowMenu(true)}
        onMouseLeave={() => setShowMenu(false)}
      >
        <td className="px-4 py-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onTaskSelect}
          />
        </td>
        
        <td className="px-4 py-3">
          <div className="flex items-center" style={{ paddingLeft: `${depth * 24}px` }}>
            {hasSubtasks && (
              <button
                onClick={onToggle}
                className="p-1 hover:bg-gray-200 rounded mr-2"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </button>
            )}
            
            {!hasSubtasks && <div className="w-7" />}
            
            <button
              onClick={() => onTaskClick(task.id)}
              className={`text-sm font-medium hover:text-blue-600 transition-colors text-left ${
                isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'
              }`}
            >
              {task.title}
            </button>
            
            {task.dependencies.length > 0 && (
              <div className="ml-2 flex items-center">
                <Link className="h-3 w-3 text-gray-400 mr-1" />
                <span className="text-xs text-gray-500">
                  {task.dependencies.length}
                </span>
              </div>
            )}
          </div>
        </td>
        
        <td className="px-4 py-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="focus:outline-none">
                <StatusBadge status={task.status} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {statusOptions.map(option => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => onTaskStatusChange(task.id, option.value)}
                  className={task.status === option.value ? 'bg-gray-100' : ''}
                >
                  <StatusBadge status={option.value} />
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
        
        <td className="px-4 py-3">
          {task.assignee ? (
            <div className="flex items-center">
              <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-xs font-medium">
                  {typeof task.assignee === 'string' 
                    ? task.assignee.charAt(0).toUpperCase()
                    : '?'}
                </span>
              </div>
            </div>
          ) : (
            <span className="text-gray-400 text-sm">未割当</span>
          )}
        </td>
        
        <td className="px-4 py-3 text-sm text-gray-600">
          -
        </td>
        
        <td className="px-4 py-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`p-1 hover:bg-gray-200 rounded transition-all ${
                  showMenu ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <MoreHorizontal className="h-4 w-4 text-gray-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onTaskClick(task.id)}>
                詳細を表示
              </DropdownMenuItem>
              <DropdownMenuItem>
                編集
              </DropdownMenuItem>
              <DropdownMenuItem>
                コピー
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-600"
                onClick={() => onTaskDelete(task.id)}
              >
                削除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      </tr>
      
      {isExpanded && hasSubtasks && task.subtasks.map((subtask, index) => (
        <SubtaskRow
          key={subtask.id}
          subtask={subtask}
          parentTask={task}
          projectId={projectId}
          onSubtaskClick={() => {}}
          onSubtaskStatusChange={() => {}}
          depth={depth + 1}
        />
      ))}
    </>
  )
})

TaskRow.displayName = 'TaskRow'