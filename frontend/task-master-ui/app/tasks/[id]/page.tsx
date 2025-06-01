'use client';

import { useEffect, useState } from 'react';
import { api, Task, ComplexityAnalysis } from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = parseInt(params.id as string);
  
  const [task, setTask] = useState<Task | null>(null);
  const [complexity, setComplexity] = useState<ComplexityAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanding, setIsExpanding] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    loadTask();
  }, [taskId]);

  const loadTask = async () => {
    try {
      setLoading(true);
      const taskData = await api.getTask(taskId);
      setTask(taskData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load task');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeComplexity = async () => {
    setIsAnalyzing(true);
    try {
      const analysis = await api.analyzeTaskComplexity(taskId);
      setComplexity(analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze complexity');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExpand = async () => {
    setIsExpanding(true);
    try {
      const expandedTask = await api.expandTask(taskId, { numSubtasks: 5 });
      setTask(expandedTask);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to expand task');
    } finally {
      setIsExpanding(false);
    }
  };

  const handleClearSubtasks = async () => {
    if (!confirm('Are you sure you want to clear all subtasks?')) return;
    
    try {
      const clearedTask = await api.clearSubtasks(taskId);
      setTask(clearedTask);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear subtasks');
    }
  };

  const handleSubtaskToggle = async (subtaskId: number, completed: boolean) => {
    if (!task) return;
    
    try {
      const updatedTask = await api.updateSubtask(taskId, subtaskId, { completed });
      setTask(updatedTask);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update subtask');
    }
  };

  const handleAddDependency = async () => {
    const depId = prompt('Enter the ID of the task to depend on:');
    if (!depId) return;
    
    try {
      const updatedTask = await api.addDependency(taskId, parseInt(depId));
      setTask(updatedTask);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add dependency');
    }
  };

  const handleRemoveDependency = async (depId: number) => {
    try {
      const updatedTask = await api.removeDependency(taskId, depId);
      setTask(updatedTask);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove dependency');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading task...</div>;
  }

  if (!task) {
    return <div className="text-center py-12">Task not found</div>;
  }

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'blocked': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getComplexityColor = (level: string) => {
    switch (level) {
      case 'very-high': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      default: return 'text-green-600';
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/tasks" className="text-blue-600 hover:text-blue-800">
          ← Back to Tasks
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-3xl font-bold">{task.title}</h1>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
            {task.status}
          </span>
        </div>

        {task.description && (
          <p className="text-gray-700 mb-6">{task.description}</p>
        )}

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <span className="font-semibold">Priority:</span> {task.priority}
          </div>
          {task.estimatedEffort && (
            <div>
              <span className="font-semibold">Estimated Effort:</span> {task.estimatedEffort}
            </div>
          )}
          {task.assignee && (
            <div>
              <span className="font-semibold">Assignee:</span> {task.assignee}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={handleAnalyzeComplexity}
            disabled={isAnalyzing}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Complexity'}
          </button>
          
          <button
            onClick={handleExpand}
            disabled={isExpanding}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            {isExpanding ? 'Expanding...' : 'Expand Task'}
          </button>
          
          {task.subtasks.length > 0 && (
            <button
              onClick={handleClearSubtasks}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Clear Subtasks
            </button>
          )}
        </div>

        {/* Complexity Analysis */}
        {complexity && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h2 className="text-xl font-semibold mb-3">Complexity Analysis</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium">Score:</span>{' '}
                <span className={`font-bold ${getComplexityColor(complexity.complexity.level)}`}>
                  {complexity.complexity.score} ({complexity.complexity.level})
                </span>
              </div>
              <div>
                <span className="font-medium">Subtasks:</span> {complexity.complexity.factors.subtaskCount}
              </div>
              <div>
                <span className="font-medium">Dependencies:</span> {complexity.complexity.factors.dependencyCount}
              </div>
              <div>
                <span className="font-medium">Technical:</span> {complexity.complexity.factors.hasTechnicalTerms ? 'Yes' : 'No'}
              </div>
            </div>
            {complexity.complexity.recommendations.length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium mb-2">Recommendations:</h3>
                <ul className="list-disc list-inside text-sm text-gray-700">
                  {complexity.complexity.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Dependencies */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-semibold">Dependencies</h2>
            <button
              onClick={handleAddDependency}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              + Add Dependency
            </button>
          </div>
          {task.dependencies.length === 0 ? (
            <p className="text-gray-500">No dependencies</p>
          ) : (
            <div className="space-y-2">
              {task.dependencies.map((depId) => (
                <div key={depId} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                  <Link href={`/tasks/${depId}`} className="text-blue-600 hover:text-blue-800">
                    Task #{depId}
                  </Link>
                  <button
                    onClick={() => handleRemoveDependency(depId)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Subtasks */}
        <div>
          <h2 className="text-xl font-semibold mb-3">Subtasks</h2>
          {task.subtasks.length === 0 ? (
            <p className="text-gray-500">No subtasks. Click "Expand Task" to generate subtasks.</p>
          ) : (
            <div className="space-y-2">
              {task.subtasks.map((subtask) => (
                <div key={subtask.id} className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    checked={subtask.completed}
                    onChange={(e) => handleSubtaskToggle(subtask.id, e.target.checked)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className={subtask.completed ? 'line-through text-gray-500' : ''}>
                      {subtask.title}
                    </p>
                    {subtask.description && (
                      <p className="text-sm text-gray-600 mt-1">{subtask.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}