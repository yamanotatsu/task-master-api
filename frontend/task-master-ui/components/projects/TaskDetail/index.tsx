'use client';

import * as React from 'react';
import { TaskHeader } from './TaskHeader';
import { PropertyPanel } from './PropertyPanel';
import { ContentEditor } from './ContentEditor';
import { SubtaskRow } from '../ProjectTaskTable/SubtaskRow';
import { Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EditableCell } from '@/components/ui/notion';

interface TaskDetailProps {
  task: {
    id: string;
    title: string;
    description?: string;
    details?: string;
    testStrategy?: string;
    status: string;
    assignee?: {
      id: string;
      name: string;
      avatar?: string;
    };
    deadline?: string;
    priority: string;
    projectId: string;
    projectName?: string;
  };
  subtasks: Array<{
    id: string;
    taskId: string;
    title: string;
    status: string;
    assignee?: {
      id: string;
      name: string;
      avatar?: string;
    };
  }>;
  users: Array<{ id: string; name: string; avatar?: string }>;
  onTaskUpdate: (updates: any) => void;
  onSubtaskUpdate: (subtaskId: string, updates: any) => void;
  onAddSubtask: () => void;
  onSubtaskClick?: (subtaskId: string) => void;
  onExpandTask?: () => void;
  expandingTask?: boolean;
  disabled?: boolean;
}

export const TaskDetail: React.FC<TaskDetailProps> = ({
  task,
  subtasks,
  users,
  onTaskUpdate,
  onSubtaskUpdate,
  onAddSubtask,
  onSubtaskClick,
  onExpandTask,
  expandingTask,
  disabled,
}) => {
  const handlePropertyChange = (key: string, value: any) => {
    onTaskUpdate({ [key]: value });
  };

  return (
    <div className="flex gap-8">
      {/* 左サイドバー - プロパティパネル */}
      <PropertyPanel
        task={task}
        users={users}
        onPropertyChange={handlePropertyChange}
        onAddSubtask={onAddSubtask}
        disabled={disabled}
      />

      {/* メインコンテンツエリア */}
      <div className="flex-1">
        <TaskHeader
          icon="📋"
          title={task.title}
          onTitleChange={(title) => onTaskUpdate({ title })}
          disabled={disabled}
        />

        {/* サブタスクセクション */}
        <div className="mb-8">
          <h3 className="text-sm font-medium text-gray-700 mb-3">サブタスク</h3>
          {subtasks.length > 0 ? (
            <div className="bg-white rounded-lg border border-gray-200">
              <table className="w-full">
                <tbody>
                  {subtasks.map((subtask) => (
                    <SubtaskRow
                      key={subtask.id}
                      subtask={subtask}
                      onSubtaskUpdate={onSubtaskUpdate}
                      users={users}
                      taskId={task.id}
                      projectId={task.projectId}
                      onSubtaskClick={onSubtaskClick}
                    />
                  ))}
                  <tr className="border-t border-gray-100">
                    <td colSpan={7} className="px-2 py-2">
                      <div className="flex items-center gap-4 px-8">
                        <button
                          onClick={onAddSubtask}
                          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                          disabled={disabled}
                        >
                          <Plus className="h-4 w-4" />
                          サブタスク追加
                        </button>
                        {onExpandTask && (
                          <button
                            onClick={onExpandTask}
                            className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                            disabled={disabled || expandingTask}
                          >
                            {expandingTask ? (
                              <>
                                <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                生成中...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4" />
                                AIで分解
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 text-center">
              <p className="text-sm text-gray-500 mb-4">サブタスクがありません</p>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={onAddSubtask}
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
                  disabled={disabled}
                >
                  <Plus className="h-4 w-4" />
                  サブタスク追加
                </button>
                {onExpandTask && (
                  <button
                    onClick={onExpandTask}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                    disabled={disabled || expandingTask}
                  >
                    {expandingTask ? (
                      <>
                        <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        生成中...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        AIで分解
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 説明セクション */}
        {(task.description || !disabled) && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">説明</h3>
            <EditableCell
              value={task.description || ''}
              onValueChange={(value) => onTaskUpdate({ description: value })}
              placeholder="タスクの説明を入力..."
              disabled={disabled}
              multiline
              className="text-sm leading-relaxed"
            />
          </div>
        )}

        {/* 詳細セクション */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">詳細</h3>
          <ContentEditor
            content={task.details}
            onContentChange={(content) => onTaskUpdate({ details: content })}
            disabled={disabled}
          />
        </div>

        {/* テスト戦略セクション */}
        {(task.testStrategy || !disabled) && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">テスト戦略</h3>
            <EditableCell
              value={task.testStrategy || ''}
              onValueChange={(value) => onTaskUpdate({ testStrategy: value })}
              placeholder="テスト戦略を入力..."
              disabled={disabled}
              multiline
              className="text-sm leading-relaxed"
            />
          </div>
        )}
      </div>
    </div>
  );
};