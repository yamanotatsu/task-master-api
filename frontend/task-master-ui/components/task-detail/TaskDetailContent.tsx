"use client"

import React, { useState, useEffect } from 'react'
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
  const [details, setDetails] = useState(task.details || '')
  const [isEditingDetails, setIsEditingDetails] = useState(false)
  const [testStrategy, setTestStrategy] = useState(task.testStrategy || '')
  const [isEditingTestStrategy, setIsEditingTestStrategy] = useState(false)
  const [isExpandingTask, setIsExpandingTask] = useState(false)

  // Update local state when task prop changes
  useEffect(() => {
    setDescription(task.description || '')
    setDetails(task.details || '')
    setTestStrategy(task.testStrategy || '')
  }, [task])

  const handleDescriptionSave = () => {
    if (description !== task.description) {
      onTaskUpdate({ description })
    }
    setIsEditingDescription(false)
  }

  const handleDetailsSave = () => {
    if (details !== task.details) {
      onTaskUpdate({ details })
    }
    setIsEditingDetails(false)
  }

  const handleTestStrategySave = () => {
    if (testStrategy !== task.testStrategy) {
      onTaskUpdate({ testStrategy })
    }
    setIsEditingTestStrategy(false)
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

        {/* Details Section */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">実装詳細</h3>
          {isEditingDetails ? (
            <div className="space-y-2">
              <Textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="実装の詳細を入力..."
                className="min-h-[120px]"
                autoFocus
              />
              <div className="flex justify-end space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDetails(task.details || '')
                    setIsEditingDetails(false)
                  }}
                >
                  キャンセル
                </Button>
                <Button
                  size="sm"
                  onClick={handleDetailsSave}
                >
                  保存
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="min-h-[80px] p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => setIsEditingDetails(true)}
            >
              {task.details ? (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.details}</p>
              ) : (
                <p className="text-sm text-gray-400">クリックして実装詳細を追加...</p>
              )}
            </div>
          )}
        </div>

        {/* Test Strategy Section */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">テスト戦略</h3>
          {isEditingTestStrategy ? (
            <div className="space-y-2">
              <Textarea
                value={testStrategy}
                onChange={(e) => setTestStrategy(e.target.value)}
                placeholder="テスト戦略を入力..."
                className="min-h-[120px]"
                autoFocus
              />
              <div className="flex justify-end space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTestStrategy(task.testStrategy || '')
                    setIsEditingTestStrategy(false)
                  }}
                >
                  キャンセル
                </Button>
                <Button
                  size="sm"
                  onClick={handleTestStrategySave}
                >
                  保存
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="min-h-[80px] p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => setIsEditingTestStrategy(true)}
            >
              {task.testStrategy ? (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.testStrategy}</p>
              ) : (
                <p className="text-sm text-gray-400">クリックしてテスト戦略を追加...</p>
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