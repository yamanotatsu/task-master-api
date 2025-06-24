'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { SubtaskDetail } from '@/components/projects/SubtaskDetail';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { api, Task, Subtask, Project } from '@/lib/api';
import { toast } from 'sonner';

export default function SubtaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const taskId = params.taskId as string;
  const subtaskId = params.subtaskId as string;

  const [task, setTask] = useState<Task | null>(null);
  const [subtask, setSubtask] = useState<Subtask | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [users, setUsers] = useState<Array<{ id: string; name: string; avatar?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const { error, handleError, clearError, withErrorHandling } = useErrorHandler();

  useEffect(() => {
    loadSubtaskData();
  }, [subtaskId]);

  const loadSubtaskData = async () => {
    setLoading(true);
    clearError();

    await withErrorHandling(
      async () => {
        const [projectData, tasksData] = await Promise.all([
          api.getProject(projectId),
          api.getTasks({ projectId })
        ]);

        // 特定のタスクを探す
        const targetTask = tasksData.tasks.find(t => t.id === taskId);
        if (!targetTask) {
          throw new Error('タスクが見つかりません');
        }

        // 特定のサブタスクを探す
        const targetSubtask = targetTask.subtasks?.find(s => s.id === subtaskId);
        if (!targetSubtask) {
          throw new Error('サブタスクが見つかりません');
        }

        setTask(targetTask);
        setSubtask(targetSubtask);
        setProject(projectData);
        
        // プロジェクトのassigneesからユーザーリストを作成
        const usersList = projectData.assignees || [];
        setUsers(usersList);
      },
      {
        customMessage: 'サブタスクの読み込みに失敗しました'
      }
    );

    setLoading(false);
  };

  const handleSubtaskUpdate = async (updates: Partial<Subtask>) => {
    if (!task || !subtask) return;

    await withErrorHandling(
      async () => {
        await api.updateSubtask(task.id, subtaskId, updates);
        setSubtask({ ...subtask, ...updates });
        toast.success('サブタスクを更新しました');
      },
      {
        customMessage: 'サブタスクの更新に失敗しました'
      }
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error.isError) {
    return (
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ErrorMessage
          message={error.message}
          action={{
            label: '再読み込み',
            onClick: loadSubtaskData
          }}
        />
      </div>
    );
  }

  if (!task || !subtask || !project) {
    return (
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p>サブタスクが見つかりません</p>
      </div>
    );
  }

  // サブタスクデータを詳細ページ用に変換
  const subtaskForDetail = {
    id: subtask.id.toString(),
    title: subtask.title,
    description: subtask.description,
    status: subtask.status || 'pending',
    assignee: subtask.assignee ? {
      id: subtask.assignee,
      name: users.find(u => u.id === subtask.assignee)?.name || subtask.assignee,
      avatar: users.find(u => u.id === subtask.assignee)?.avatar
    } : undefined
  };

  // 親タスク情報
  const parentTask = {
    id: task.id.toString(),
    title: task.title,
    projectId: projectId
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ヘッダー */}
      <div className="border-b border-gray-200 px-8 py-4">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/projects/${projectId}/tasks/${taskId}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            タスクに戻る
          </Button>
          <div className="h-6 w-px bg-gray-300" />
          <nav className="flex items-center space-x-2 text-sm">
            <Link href="/" className="text-gray-500 hover:text-gray-700 transition-colors">
              ダッシュボード
            </Link>
            <span className="text-gray-400">/</span>
            <Link href={`/projects/${projectId}`} className="text-gray-500 hover:text-gray-700 transition-colors">
              {project.name}
            </Link>
            <span className="text-gray-400">/</span>
            <Link href={`/projects/${projectId}/tasks/${taskId}`} className="text-gray-500 hover:text-gray-700 transition-colors">
              {task.title}
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">{subtask.title}</span>
          </nav>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="px-8 py-8">
        <SubtaskDetail
          subtask={subtaskForDetail}
          parentTask={parentTask}
          project={project}
          users={users}
          onSubtaskUpdate={handleSubtaskUpdate}
        />
      </div>
    </div>
  );
}