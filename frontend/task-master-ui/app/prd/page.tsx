'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function PRDPage() {
  const [prdContent, setPrdContent] = useState('');
  const [taskCount, setTaskCount] = useState(10);
  const [useResearch, setUseResearch] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await api.generateTasksFromPRD({
        prd_content: prdContent,
        target_task_count: taskCount,
        use_research_mode: useResearch,
      });
      
      router.push('/tasks');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Submit Product Requirements Document</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="prd" className="block text-sm font-medium mb-2">
            PRD Content
          </label>
          <textarea
            id="prd"
            value={prdContent}
            onChange={(e) => setPrdContent(e.target.value)}
            className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your product requirements document here..."
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="taskCount" className="block text-sm font-medium mb-2">
              Target Task Count
            </label>
            <input
              type="number"
              id="taskCount"
              min="1"
              max="100"
              value={taskCount}
              onChange={(e) => setTaskCount(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={useResearch}
                onChange={(e) => setUseResearch(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium">Use Research Mode</span>
            </label>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !prdContent.trim()}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Generating Tasks...' : 'Generate Tasks from PRD'}
        </button>
      </form>
    </div>
  );
}