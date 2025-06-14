'use client';

import * as React from 'react';
import { FileText } from 'lucide-react';
import { EditableCell } from '@/components/ui/notion';

interface TaskHeaderProps {
  icon?: string;
  title: string;
  onTitleChange?: (title: string) => void;
  disabled?: boolean;
}

export const TaskHeader: React.FC<TaskHeaderProps> = ({
  icon = '📋',
  title,
  onTitleChange,
  disabled,
}) => {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="text-3xl mt-1">{icon}</div>
      <div className="flex-1">
        <EditableCell
          value={title}
          onValueChange={onTitleChange}
          disabled={disabled}
          className="text-4xl font-bold text-gray-900"
          placeholder="無題のタスク"
        />
      </div>
    </div>
  );
};