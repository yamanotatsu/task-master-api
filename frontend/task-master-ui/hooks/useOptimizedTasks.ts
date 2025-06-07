import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, Task } from '@/lib/api'
import { toast } from 'sonner'

export const useOptimizedTasks = (projectId: string) => {
  const queryClient = useQueryClient()

  // Fetch tasks with caching
  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      const response = await api.getTasks({ projectId })
      return response.tasks
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })

  // Optimistic update for task status
  const updateTaskStatus = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number; status: Task['status'] }) => {
      return api.updateTaskStatus(taskId, status)
    },
    onMutate: async ({ taskId, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tasks', projectId] })

      // Snapshot previous value
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks', projectId])

      // Optimistically update
      queryClient.setQueryData<Task[]>(['tasks', projectId], (old) => {
        if (!old) return []
        return old.map(task => 
          task.id === taskId ? { ...task, status } : task
        )
      })

      return { previousTasks }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', projectId], context.previousTasks)
      }
      toast.error('ステータスの更新に失敗しました')
    },
    onSuccess: () => {
      toast.success('ステータスを更新しました')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
    },
  })

  // Optimistic delete
  const deleteTask = useMutation({
    mutationFn: async (taskId: number) => {
      return api.deleteTask(taskId)
    },
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', projectId] })

      const previousTasks = queryClient.getQueryData<Task[]>(['tasks', projectId])

      queryClient.setQueryData<Task[]>(['tasks', projectId], (old) => {
        if (!old) return []
        return old.filter(task => task.id !== taskId)
      })

      return { previousTasks }
    },
    onError: (err, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', projectId], context.previousTasks)
      }
      toast.error('タスクの削除に失敗しました')
    },
    onSuccess: () => {
      toast.success('タスクを削除しました')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
    },
  })

  // Prefetch related data
  const prefetchTaskDetails = async (taskId: number) => {
    await queryClient.prefetchQuery({
      queryKey: ['task', taskId],
      queryFn: () => api.getTask(taskId),
      staleTime: 5 * 60 * 1000,
    })
  }

  return {
    tasks,
    isLoading,
    error,
    updateTaskStatus: updateTaskStatus.mutate,
    deleteTask: deleteTask.mutate,
    prefetchTaskDetails,
  }
}