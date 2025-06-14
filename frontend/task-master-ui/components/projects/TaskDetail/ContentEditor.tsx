'use client';

import * as React from 'react';
import { FileText, File, Plus } from 'lucide-react';
import { EditableCell } from '@/components/ui/notion';

interface ContentEditorProps {
  content?: string;
  onContentChange?: (content: string) => void;
  disabled?: boolean;
}

export const ContentEditor: React.FC<ContentEditorProps> = ({
  content,
  onContentChange,
  disabled,
}) => {
  const [isEditing, setIsEditing] = React.useState(false);

  if (content || isEditing || !disabled) {
    return (
      <EditableCell
        value={content || ''}
        onValueChange={onContentChange}
        placeholder="詳細を入力..."
        disabled={disabled}
        multiline
        className="text-sm leading-relaxed min-h-[200px]"
      />
    );
  }

  return (
    <div className="p-8 bg-gray-50 rounded-lg">
      <div className="text-center">
        <p className="text-gray-500 mb-4">「Enter」キーを押して入力を開始...</p>
        <div className="flex flex-col gap-2 max-w-xs mx-auto">
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-100 rounded transition-colors"
            disabled={disabled}
          >
            <FileText className="h-4 w-4 text-gray-400" />
            <span className="text-sm">タスクの詳細</span>
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-100 rounded transition-colors opacity-50 cursor-not-allowed"
            disabled
          >
            <File className="h-4 w-4 text-gray-400" />
            <span className="text-sm">空白のページ</span>
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-100 rounded transition-colors opacity-50 cursor-not-allowed"
            disabled
          >
            <Plus className="h-4 w-4 text-gray-400" />
            <span className="text-sm">新規テンプレート</span>
          </button>
        </div>
      </div>
    </div>
  );
};