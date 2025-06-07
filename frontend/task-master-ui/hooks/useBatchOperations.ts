import { useState, useCallback } from 'react'
import { Task } from '@/lib/api'
import { api } from '@/lib/api'
import { toast } from 'sonner'

interface BatchUpdatePayload {
  taskIds: number[]
  updates: Partial<Task>
}

export const useBatchOperations = (onTasksUpdate?: (tasks: Task[]) => void) => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)

  const batchUpdateTasks = useCallback(async (
    taskIds: number[],
    updates: Partial<Task>
  ): Promise<Task[]> => {
    setIsProcessing(true)
    setProgress(0)
    
    const updatedTasks: Task[] = []
    const totalTasks = taskIds.length
    
    try {
      // Process tasks in batches to avoid overwhelming the server
      const batchSize = 10
      for (let i = 0; i < taskIds.length; i += batchSize) {
        const batch = taskIds.slice(i, i + batchSize)
        
        const batchPromises = batch.map(taskId => 
          api.updateTask(taskId, updates).catch(error => {
            console.error(`Failed to update task ${taskId}:`, error)
            return null
          })
        )
        
        const results = await Promise.all(batchPromises)
        const successfulUpdates = results.filter(Boolean) as Task[]
        updatedTasks.push(...successfulUpdates)
        
        // Update progress
        const completed = Math.min(i + batchSize, taskIds.length)
        setProgress(Math.round((completed / totalTasks) * 100))
      }
      
      onTasksUpdate?.(updatedTasks)
      
      const successCount = updatedTasks.length
      const failedCount = taskIds.length - successCount
      
      if (successCount > 0) {
        toast.success(`${successCount}件のタスクを更新しました`)
      }
      
      if (failedCount > 0) {
        toast.error(`${failedCount}件のタスクの更新に失敗しました`)
      }
      
      return updatedTasks
    } catch (error) {
      console.error('Batch update failed:', error)
      toast.error('一括更新に失敗しました')
      throw error
    } finally {
      setIsProcessing(false)
      setProgress(0)
    }
  }, [onTasksUpdate])

  const batchDeleteTasks = useCallback(async (taskIds: number[]): Promise<void> => {
    setIsProcessing(true)
    setProgress(0)
    
    const totalTasks = taskIds.length
    let deletedCount = 0
    
    try {
      for (let i = 0; i < taskIds.length; i++) {
        try {
          await api.deleteTask(taskIds[i])
          deletedCount++
        } catch (error) {
          console.error(`Failed to delete task ${taskIds[i]}:`, error)
        }
        
        setProgress(Math.round(((i + 1) / totalTasks) * 100))
      }
      
      if (deletedCount > 0) {
        toast.success(`${deletedCount}件のタスクを削除しました`)
      }
      
      const failedCount = taskIds.length - deletedCount
      if (failedCount > 0) {
        toast.error(`${failedCount}件のタスクの削除に失敗しました`)
      }
    } catch (error) {
      console.error('Batch delete failed:', error)
      toast.error('一括削除に失敗しました')
      throw error
    } finally {
      setIsProcessing(false)
      setProgress(0)
    }
  }, [])

  const batchUpdateStatus = useCallback(async (
    taskIds: number[],
    status: Task['status']
  ) => {
    return batchUpdateTasks(taskIds, { status })
  }, [batchUpdateTasks])

  const batchUpdatePriority = useCallback(async (
    taskIds: number[],
    priority: Task['priority']
  ) => {
    return batchUpdateTasks(taskIds, { priority })
  }, [batchUpdateTasks])

  const batchUpdateAssignee = useCallback(async (
    taskIds: number[],
    assignee: string
  ) => {
    return batchUpdateTasks(taskIds, { assignee: assignee || undefined })
  }, [batchUpdateTasks])

  return {
    batchUpdateTasks,
    batchDeleteTasks,
    batchUpdateStatus,
    batchUpdatePriority,
    batchUpdateAssignee,
    isProcessing,
    progress
  }
}