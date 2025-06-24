'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { TaskDetail } from '@/components/projects/TaskDetail';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { api, Task, Subtask, Project } from '@/lib/api';
import { toast } from 'sonner';

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const taskId = params.taskId as string;

  const [task, setTask] = useState<Task | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [users, setUsers] = useState<Array<{ id: string; name: string; avatar?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [expandingTask, setExpandingTask] = useState(false);
  const { error, handleError, clearError, withErrorHandling } = useErrorHandler();

  useEffect(() => {
    loadTaskData();
  }, [taskId]);

  const loadTaskData = async () => {
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

        setTask(targetTask);
        setSubtasks(targetTask.subtasks || []);
        setProject(projectData);
        
        // プロジェクトのassigneesからユーザーリストを作成
        const usersList = projectData.assignees || [];
        setUsers(usersList);
      },
      {
        customMessage: 'タスクの読み込みに失敗しました'
      }
    );

    setLoading(false);
  };

  const handleTaskUpdate = async (updates: Partial<Task>) => {
    if (!task) return;

    await withErrorHandling(
      async () => {
        await api.updateTask(task.id, updates);
        setTask({ ...task, ...updates });
        toast.success('タスクを更新しました');
      },
      {
        customMessage: 'タスクの更新に失敗しました'
      }
    );
  };

  const handleSubtaskUpdate = async (subtaskId: string, updates: Partial<Subtask>) => {
    if (!task) return;

    await withErrorHandling(
      async () => {
        await api.updateSubtask(task.id, subtaskId, updates);
        setSubtasks(
          subtasks.map((s) => 
            s.id === subtaskId ? { ...s, ...updates } : s
          )
        );
        toast.success('サブタスクを更新しました');
      },
      {
        customMessage: 'サブタスクの更新に失敗しました'
      }
    );
  };

  const handleAddSubtask = async () => {
    if (!task) return;

    await withErrorHandling(
      async () => {
        const updatedTask = await api.addSubtask(task.id, {
          title: '新しいサブタスク',
          status: 'pending'
        });
        // Extract the newly added subtask (it should be the last one)
        const newSubtask = updatedTask.subtasks[updatedTask.subtasks.length - 1];
        if (newSubtask) {
          setSubtasks([...subtasks, { ...newSubtask, taskId: task.id }]);
        }
        toast.success('サブタスクを作成しました');
      },
      {
        customMessage: 'サブタスクの作成に失敗しました'
      }
    );
  };
  
  const handleSubtaskClick = (subtaskId: string) => {
    router.push(`/projects/${projectId}/tasks/${taskId}/subtasks/${subtaskId}`);
  };

  const handleExpandTask = async () => {
    if (!task || expandingTask) return;

    setExpandingTask(true);
    
    await withErrorHandling(
      async () => {
        const updatedTask = await api.expandTask(parseInt(task.id), {
          numSubtasks: 5,
          useResearch: false
        });
        
        // 更新されたタスクのサブタスクを設定
        setSubtasks(updatedTask.subtasks || []);
        toast.success('AIでサブタスクを生成しました');
        
        // タスクデータを再読み込み
        await loadTaskData();
      },
      {
        customMessage: 'サブタスクの生成に失敗しました'
      }
    );
    
    setExpandingTask(false);
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
            onClick: loadTaskData
          }}
        />
      </div>
    );
  }

  if (!task || !project) {
    return (
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p>タスクが見つかりません</p>
      </div>
    );
  }

  // タスクデータを詳細ページ用に変換
  const taskForDetail = {
    id: task.id.toString(),
    title: task.title,
    description: task.description,
    details: task.details,
    testStrategy: task.testStrategy,
    status: task.status,
    assignee: task.assignee ? {
      id: task.assignee,
      name: users.find(u => u.id === task.assignee)?.name || task.assignee,
      avatar: users.find(u => u.id === task.assignee)?.avatar
    } : undefined,
    priority: task.priority,
    projectId: projectId,
    projectName: project.name
  };

  // サブタスクデータを詳細ページ用に変換
  const subtasksForDetail = subtasks.map(subtask => ({
    id: subtask.id.toString(),
    taskId: task.id.toString(),
    title: subtask.title,
    status: subtask.status || 'pending',
    assignee: subtask.assignee ? {
      id: subtask.assignee,
      name: users.find(u => u.id === subtask.assignee)?.name || subtask.assignee,
      avatar: users.find(u => u.id === subtask.assignee)?.avatar
    } : undefined
  }));

  return (
    <div className="min-h-screen bg-white">
      {/* ヘッダー */}
      <div className="border-b border-gray-200 px-8 py-4">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/projects/${projectId}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            プロジェクトに戻る
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
            <span className="text-gray-900">{task.title}</span>
          </nav>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="px-8 py-8">
        <TaskDetail
          task={taskForDetail}
          subtasks={subtasksForDetail}
          users={users}
          onTaskUpdate={handleTaskUpdate}
          onSubtaskUpdate={handleSubtaskUpdate}
          onAddSubtask={handleAddSubtask}
          onSubtaskClick={handleSubtaskClick}
          onExpandTask={handleExpandTask}
          expandingTask={expandingTask}
        />
      </div>
    </div>
  );
}