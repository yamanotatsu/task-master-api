"use client"

import React, { useState } from 'react'
import { Plus, Sparkles } from 'lucide-react'
import { Task, Subtask } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { SubtaskManager } from './SubtaskManager'
import { api } from '@/lib/api'
import { toast } from 'sonner'

interface TaskDetailContentProps {
  task: Task
  projectId: string
  onTaskUpdate: (updates: Partial<Task>) => void
  onSubtaskAdd: (title: string) => void
  onSubtaskUpdate: (subtaskId: number | string, updates: Partial<Subtask>) => void
  onSubtaskRemove: (subtaskId: number | string) => void
}

export const TaskDetailContent: React.FC<TaskDetailContentProps> = ({
  task,
  projectId,
  onTaskUpdate,
  onSubtaskAdd,
  onSubtaskUpdate,
  onSubtaskRemove
}) => {
  const [description, setDescription] = useState(task.description || '')
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [isExpandingTask, setIsExpandingTask] = useState(false)

  const handleDescriptionSave = () => {
    if (description !== task.description) {
      onTaskUpdate({ description })
    }
    setIsEditingDescription(false)
  }

  const handleExpandTask = async () => {
    setIsExpandingTask(true)
    try {
      const expanded = await api.expandTask(task.id, { 
        numSubtasks: 5,
        useResearch: false 
      })
      
      // Refresh task data after expansion
      toast.success('サブタスクを生成しました')
      window.location.reload() // Temporary solution
    } catch (error) {
      console.error('Failed to expand task:', error)
      toast.error('サブタスクの生成に失敗しました')
    } finally {
      setIsExpandingTask(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <div className="space-y-6">
        {/* Description Section */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">説明</h3>
          {isEditingDescription ? (
            <div className="space-y-2">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="タスクの説明を入力..."
                className="min-h-[120px]"
                autoFocus
              />
              <div className="flex justify-end space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDescription(task.description || '')
                    setIsEditingDescription(false)
                  }}
                >
                  キャンセル
                </Button>
                <Button
                  size="sm"
                  onClick={handleDescriptionSave}
                >
                  保存
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="min-h-[80px] p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => setIsEditingDescription(true)}
            >
              {task.description ? (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.description}</p>
              ) : (
                <p className="text-sm text-gray-400">クリックして説明を追加...</p>
              )}
            </div>
          )}
        </div>

        {/* Subtasks Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">
              サブタスク ({task.subtasks?.length || 0})
            </h3>
            
            {task.subtasks.length === 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleExpandTask}
                disabled={isExpandingTask}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {isExpandingTask ? 'AI生成中...' : 'AIでサブタスク生成'}
              </Button>
            )}
          </div>
          
          <SubtaskManager
            subtasks={task.subtasks || []}
            onSubtaskAdd={onSubtaskAdd}
            onSubtaskUpdate={onSubtaskUpdate}
            onSubtaskRemove={onSubtaskRemove}
          />
        </div>

        {/* Comments Section (Placeholder) */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">コメント</h3>
          <div className="border rounded-lg p-4 text-center text-sm text-gray-500">
            コメント機能は開発中です
          </div>
        </div>
      </div>
    </div>
  )
}