"use client"

import React from 'react'
import { Link, X } from 'lucide-react'
import { Task } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface DependencyItemProps {
  task: Task
  type: 'blocked-by' | 'blocking'
  onRemove?: () => void
  onTaskClick: (taskId: number) => void
}

export const DependencyItem: React.FC<DependencyItemProps> = ({
  task,
  type,
  onRemove,
  onTaskClick
}) => {
  const bgColor = type === 'blocked-by' ? 'bg-orange-50' : 'bg-blue-50'
  const borderColor = type === 'blocked-by' ? 'border-orange-200' : 'border-blue-200'
  const iconColor = type === 'blocked-by' ? 'text-orange-600' : 'text-blue-600'

  const statusColor = {
    'completed': 'success',
    'done': 'success',
    'in-progress': 'default',
    'pending': 'secondary',
    'blocked': 'destructive',
    'not-started': 'secondary'
  } as const

  return (
    <div className={`flex items-center justify-between p-2 ${bgColor} border ${borderColor} rounded-lg`}>
      <div className="flex items-center space-x-2 flex-1">
        <Link className={`h-4 w-4 ${iconColor}`} />
        <button
          onClick={() => onTaskClick(task.id)}
          className="flex items-center space-x-2 hover:underline text-left"
        >
          <span className="text-sm font-medium">#{task.id}</span>
          <span className="text-sm text-gray-600">{task.title}</span>
        </button>
        <Badge variant={statusColor[task.status] || 'secondary'}>
          {task.status}
        </Badge>
      </div>
      
      {onRemove && type === 'blocked-by' && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onRemove}
          className="hover:bg-white/50"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}