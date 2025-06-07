"use client"

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface TaskSelectionContextValue {
  selectedTasks: number[]
  selectTask: (taskId: number) => void
  deselectTask: (taskId: number) => void
  toggleTaskSelection: (taskId: number) => void
  selectAllTasks: (taskIds: number[]) => void
  clearSelection: () => void
  isTaskSelected: (taskId: number) => boolean
  selectTasksInRange: (startId: number, endId: number, allTaskIds: number[]) => void
}

const TaskSelectionContext = createContext<TaskSelectionContextValue | undefined>(undefined)

export const useTaskSelectionContext = () => {
  const context = useContext(TaskSelectionContext)
  if (!context) {
    throw new Error('useTaskSelectionContext must be used within TaskSelectionProvider')
  }
  return context
}

interface TaskSelectionProviderProps {
  children: ReactNode
}

export const TaskSelectionProvider: React.FC<TaskSelectionProviderProps> = ({ children }) => {
  const [selectedTasks, setSelectedTasks] = useState<number[]>([])
  const [lastSelectedTask, setLastSelectedTask] = useState<number | null>(null)

  const selectTask = useCallback((taskId: number) => {
    setSelectedTasks(prev => [...prev, taskId])
    setLastSelectedTask(taskId)
  }, [])

  const deselectTask = useCallback((taskId: number) => {
    setSelectedTasks(prev => prev.filter(id => id !== taskId))
  }, [])

  const toggleTaskSelection = useCallback((taskId: number) => {
    setSelectedTasks(prev => {
      if (prev.includes(taskId)) {
        return prev.filter(id => id !== taskId)
      } else {
        setLastSelectedTask(taskId)
        return [...prev, taskId]
      }
    })
  }, [])

  const selectAllTasks = useCallback((taskIds: number[]) => {
    setSelectedTasks(taskIds)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedTasks([])
    setLastSelectedTask(null)
  }, [])

  const isTaskSelected = useCallback((taskId: number) => {
    return selectedTasks.includes(taskId)
  }, [selectedTasks])

  const selectTasksInRange = useCallback((startId: number, endId: number, allTaskIds: number[]) => {
    const startIndex = allTaskIds.indexOf(startId)
    const endIndex = allTaskIds.indexOf(endId)
    
    if (startIndex === -1 || endIndex === -1) return
    
    const minIndex = Math.min(startIndex, endIndex)
    const maxIndex = Math.max(startIndex, endIndex)
    
    const tasksInRange = allTaskIds.slice(minIndex, maxIndex + 1)
    setSelectedTasks(prev => {
      const newSelection = new Set([...prev, ...tasksInRange])
      return Array.from(newSelection)
    })
  }, [])

  const value: TaskSelectionContextValue = {
    selectedTasks,
    selectTask,
    deselectTask,
    toggleTaskSelection,
    selectAllTasks,
    clearSelection,
    isTaskSelected,
    selectTasksInRange
  }

  return (
    <TaskSelectionContext.Provider value={value}>
      {children}
    </TaskSelectionContext.Provider>
  )
}