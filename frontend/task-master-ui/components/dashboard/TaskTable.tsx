"use client"

import React, { useState } from 'react'
import { Task } from '@/lib/api'
import { TaskRow } from './TaskRow'
import { Checkbox } from '@/components/ui/checkbox'

interface TaskTableProps {
  tasks: Task[]
  projectId: string
  onTaskClick: (taskId: number) => void
  onTaskStatusChange: (taskId: number, status: Task['status']) => void
  onTaskDelete: (taskId: number) => void
  selectedTasks: number[]
  onTaskSelectionChange: (taskIds: number[]) => void
}

export const TaskTable: React.FC<TaskTableProps> = React.memo(({
  tasks,
  projectId,
  onTaskClick,
  onTaskStatusChange,
  onTaskDelete,
  selectedTasks,
  onTaskSelectionChange
}) => {
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set())

  const toggleTaskExpansion = (taskId: number) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(taskId)) {
        newSet.delete(taskId)
      } else {
        newSet.add(taskId)
      }
      return newSet
    })
  }


  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onTaskSelectionChange(tasks.map(t => t.id))
    } else {
      onTaskSelectionChange([])
    }
  }

  const handleTaskSelect = (taskId: number, checked: boolean) => {
    if (checked) {
      onTaskSelectionChange([...selectedTasks, taskId])
    } else {
      onTaskSelectionChange(selectedTasks.filter(id => id !== taskId))
    }
  }

  // Group tasks hierarchically
  const rootTasks = tasks.filter(task => 
    !tasks.some(t => t.subtasks.some(s => s.id === task.id))
  )

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="w-12 px-4 py-3">
              <Checkbox
                checked={selectedTasks.length === tasks.length && tasks.length > 0}
                onCheckedChange={handleSelectAll}
              />
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              タスク
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              ステータス
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              担当者
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              期限
            </th>
            <th className="w-12"></th>
          </tr>
        </thead>
        <tbody>
          {rootTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              allTasks={tasks}
              projectId={projectId}
              isExpanded={expandedTasks.has(task.id)}
              onToggle={() => toggleTaskExpansion(task.id)}
              onTaskClick={onTaskClick}
              onTaskStatusChange={onTaskStatusChange}
              onTaskDelete={onTaskDelete}
              isSelected={selectedTasks.includes(task.id)}
              onTaskSelect={(checked) => handleTaskSelect(task.id, checked)}
              depth={0}
              expandedTasks={expandedTasks}
              onToggleSubtask={toggleTaskExpansion}
              selectedTasks={selectedTasks}
              onSubtaskSelect={handleTaskSelect}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
})

TaskTable.displayName = 'TaskTable'