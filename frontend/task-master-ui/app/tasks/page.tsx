'use client';

import { useEffect, useState } from 'react';
import { api, Task } from '@/lib/api';
import Link from 'next/link';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
  }, [filter]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await api.getTasks(filter !== 'all' ? filter : undefined);
      setTasks(response.tasks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (taskId: number, newStatus: Task['status']) => {
    try {
      await api.updateTaskStatus(taskId, newStatus);
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleDelete = async (taskId: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await api.deleteTask(taskId);
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'blocked': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading tasks...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Tasks</h1>
        
        <div className="flex items-center space-x-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="all">All Tasks</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="blocked">Blocked</option>
          </select>
          
          <Link
            href="/tasks/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            New Task
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No tasks found. Create your first task or submit a PRD to generate tasks.
        </div>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task) => (
            <div key={task.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <Link href={`/tasks/${task.id}`} className="text-xl font-semibold hover:text-blue-600">
                    {task.title}
                  </Link>
                  
                  <div className="flex items-center space-x-4 mt-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                    <span className={`text-sm font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority} priority
                    </span>
                    {task.dependencies.length > 0 && (
                      <span className="text-sm text-gray-600">
                        {task.dependencies.length} dependencies
                      </span>
                    )}
                    {task.subtasks.length > 0 && (
                      <span className="text-sm text-gray-600">
                        {task.subtasks.filter(st => st.completed).length}/{task.subtasks.length} subtasks
                      </span>
                    )}
                  </div>
                  
                  {task.description && (
                    <p className="text-gray-600 mt-2 line-clamp-2">{task.description}</p>
                  )}
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusUpdate(task.id, e.target.value as Task['status'])}
                    className="text-sm px-2 py-1 border border-gray-300 rounded"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="blocked">Blocked</option>
                  </select>
                  
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}