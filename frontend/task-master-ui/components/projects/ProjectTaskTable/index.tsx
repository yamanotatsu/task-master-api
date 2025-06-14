'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { TaskRow } from './TaskRow';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface Task {
  id: string;
  title: string;
  status: string;
  assignee?: {
    id: string;
    name: string;
    avatar?: string;
  };
  deadline?: string;
  priority: string;
}

interface Subtask {
  id: string;
  taskId: string;
  title: string;
  status: string;
  assignee?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface ProjectTaskTableProps {
  tasks: Task[];
  subtasks: Subtask[];
  users: Array<{ id: string; name: string; avatar?: string }>;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onSubtaskUpdate: (subtaskId: string, updates: Partial<Subtask>) => Promise<void>;
  onAddTask: () => Promise<void>;
  onAddSubtask: (taskId: string) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onTaskClick: (taskId: string) => void;
  onSubtaskClick?: (taskId: string, subtaskId: string) => void;
  onTasksReorder: (tasks: Task[]) => Promise<void>;
  projectId?: string;
}

export const ProjectTaskTable: React.FC<ProjectTaskTableProps> = ({
  tasks,
  subtasks,
  users,
  onTaskUpdate,
  onSubtaskUpdate,
  onAddTask,
  onAddSubtask,
  onDeleteTask,
  onTaskClick,
  onSubtaskClick,
  onTasksReorder,
  projectId,
}) => {
  const [expandedTasks, setExpandedTasks] = React.useState<Set<string>>(new Set());
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const toggleExpand = (taskId: string) => {
    setExpandedTasks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = tasks.findIndex((task) => task.id === active.id);
      const newIndex = tasks.findIndex((task) => task.id === over?.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newTasks = arrayMove(tasks, oldIndex, newIndex);
        await onTasksReorder(newTasks);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="w-full overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="w-8 px-2"></th>
              <th className="text-left px-2 py-2 text-sm font-medium text-gray-700">
                タスク
              </th>
              <th className="text-left px-2 py-2 text-sm font-medium text-gray-700 w-32">
                ステータス
              </th>
              <th className="text-left px-2 py-2 text-sm font-medium text-gray-700 w-36">
                担当者
              </th>
              <th className="text-left px-2 py-2 text-sm font-medium text-gray-700 w-32">
                期限
              </th>
              <th className="text-left px-2 py-2 text-sm font-medium text-gray-700 w-24">
                優先度
              </th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            <SortableContext
              items={tasks.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {tasks.map((task) => {
                const taskSubtasks = subtasks.filter((s) => s.taskId === task.id);
                return (
                  <TaskRow
                    key={task.id}
                    task={task}
                    subtasks={taskSubtasks}
                    isExpanded={expandedTasks.has(task.id)}
                    onToggleExpand={() => toggleExpand(task.id)}
                    onTaskUpdate={onTaskUpdate}
                    onSubtaskUpdate={onSubtaskUpdate}
                    onAddSubtask={onAddSubtask}
                    onDeleteTask={onDeleteTask}
                    onTaskClick={onTaskClick}
                    onSubtaskClick={onSubtaskClick}
                    users={users}
                    projectId={projectId}
                  />
                );
              })}
            </SortableContext>
            <tr>
              <td colSpan={7} className="px-2 py-2">
                <button
                  onClick={onAddTask}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                >
                  <Plus className="h-4 w-4" />
                  新規タスク
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </DndContext>
  );
};