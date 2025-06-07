"use client"

import React from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Task } from '@/lib/api'
import { DraggableTaskItem } from './DraggableTaskItem'
import { TaskRow } from './TaskRow'

interface DraggableTaskListProps {
  tasks: Task[]
  projectId: string
  onTasksReorder: (tasks: Task[]) => void
  onTaskClick: (taskId: number) => void
  onTaskStatusChange: (taskId: number, status: Task['status']) => void
  onTaskDelete: (taskId: number) => void
  selectedTasks: number[]
  onTaskSelectionChange: (taskIds: number[]) => void
}

export const DraggableTaskList: React.FC<DraggableTaskListProps> = ({
  tasks,
  projectId,
  onTasksReorder,
  onTaskClick,
  onTaskStatusChange,
  onTaskDelete,
  selectedTasks,
  onTaskSelectionChange
}) => {
  const [activeId, setActiveId] = React.useState<number | null>(null)
  const [expandedTasks, setExpandedTasks] = React.useState<Set<number>>(new Set())

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setActiveId(Number(active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = tasks.findIndex(task => task.id === Number(active.id))
      const newIndex = tasks.findIndex(task => task.id === Number(over?.id))

      if (oldIndex !== -1 && newIndex !== -1) {
        const newTasks = arrayMove(tasks, oldIndex, newIndex)
        onTasksReorder(newTasks)
      }
    }

    setActiveId(null)
  }

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

  const handleTaskSelect = (taskId: number, checked: boolean) => {
    if (checked) {
      onTaskSelectionChange([...selectedTasks, taskId])
    } else {
      onTaskSelectionChange(selectedTasks.filter(id => id !== taskId))
    }
  }

  const activeTask = tasks.find(task => task.id === activeId)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedTasks.length === tasks.length && tasks.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onTaskSelectionChange(tasks.map(t => t.id))
                    } else {
                      onTaskSelectionChange([])
                    }
                  }}
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
            <SortableContext
              items={tasks.map(t => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {tasks.map((task) => (
                <DraggableTaskItem
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
            </SortableContext>
          </tbody>
        </table>
      </div>

      <DragOverlay>
        {activeId && activeTask ? (
          <div className="bg-white shadow-lg rounded-lg p-4 opacity-90">
            <span className="text-sm font-medium">{activeTask.title}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}