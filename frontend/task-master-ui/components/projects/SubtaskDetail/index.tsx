'use client';

import * as React from 'react';
import { TaskHeader } from '../TaskDetail/TaskHeader';
import { PropertyPanel } from '../TaskDetail/PropertyPanel';
import { ContentEditor } from '../TaskDetail/ContentEditor';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SubtaskDetailProps {
  subtask: {
    id: string;
    title: string;
    description?: string;
    status: string;
    assignee?: {
      id: string;
      name: string;
      avatar?: string;
    };
  };
  parentTask: {
    id: string;
    title: string;
    projectId: string;
  };
  project: {
    id: string;
    name: string;
  };
  users: Array<{ id: string; name: string; avatar?: string }>;
  onSubtaskUpdate: (updates: any) => void;
  disabled?: boolean;
}

export const SubtaskDetail: React.FC<SubtaskDetailProps> = ({
  subtask,
  parentTask,
  project,
  users,
  onSubtaskUpdate,
  disabled,
}) => {
  const handlePropertyChange = (key: string, value: any) => {
    onSubtaskUpdate({ [key]: value });
  };

  // サブタスク用のプロパティデータ
  const subtaskForProperty = {
    id: subtask.id,
    status: subtask.status,
    assignee: subtask.assignee,
    deadline: undefined, // サブタスクには期限なし
    priority: 'medium', // サブタスクには優先度なし（デフォルト値）
    projectId: project.id,
    projectName: project.name,
  };

  return (
    <div className="flex gap-8">
      {/* 左サイドバー - プロパティパネル */}
      <PropertyPanel
        task={subtaskForProperty}
        users={users}
        onPropertyChange={handlePropertyChange}
        disabled={disabled}
      />

      {/* メインコンテンツエリア */}
      <div className="flex-1">
        {/* 親タスクへのリンク */}
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700"
            onClick={() => window.location.href = `/projects/${parentTask.projectId}/tasks/${parentTask.id}`}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            親タスク: {parentTask.title}
          </Button>
        </div>

        <TaskHeader
          icon="📄"
          title={subtask.title}
          onTitleChange={(title) => onSubtaskUpdate({ title })}
          disabled={disabled}
        />

        {/* コンテンツエディタ */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">詳細</h3>
          <ContentEditor
            content={subtask.description}
            onContentChange={(content) => onSubtaskUpdate({ description: content })}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
};