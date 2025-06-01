'use client';

import { useState } from 'react';
import { api, Task } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewTaskPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    dependencies: '',
    details: '',
    testingStrategy: '',
    assignee: '',
    estimatedEffort: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const dependencies = formData.dependencies
        .split(',')
        .map(d => parseInt(d.trim()))
        .filter(d => !isNaN(d));

      await api.createTask({
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        dependencies,
        details: formData.details,
        testingStrategy: formData.testingStrategy,
        assignee: formData.assignee,
        estimatedEffort: formData.estimatedEffort,
      });

      router.push('/tasks');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/tasks" className="text-blue-600 hover:text-blue-800">
          ← Back to Tasks
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-6">Create New Task</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-2">
            Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-2">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="priority" className="block text-sm font-medium mb-2">
              Priority
            </label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div>
            <label htmlFor="assignee" className="block text-sm font-medium mb-2">
              Assignee
            </label>
            <input
              type="text"
              id="assignee"
              name="assignee"
              value={formData.assignee}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label htmlFor="estimatedEffort" className="block text-sm font-medium mb-2">
            Estimated Effort
          </label>
          <input
            type="text"
            id="estimatedEffort"
            name="estimatedEffort"
            value={formData.estimatedEffort}
            onChange={handleChange}
            placeholder="e.g., 2 hours, 1 day"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="dependencies" className="block text-sm font-medium mb-2">
            Dependencies
          </label>
          <input
            type="text"
            id="dependencies"
            name="dependencies"
            value={formData.dependencies}
            onChange={handleChange}
            placeholder="Comma-separated task IDs (e.g., 1, 2, 3)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="details" className="block text-sm font-medium mb-2">
            Additional Details
          </label>
          <textarea
            id="details"
            name="details"
            value={formData.details}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="testingStrategy" className="block text-sm font-medium mb-2">
            Testing Strategy
          </label>
          <textarea
            id="testingStrategy"
            name="testingStrategy"
            value={formData.testingStrategy}
            onChange={handleChange}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="flex justify-end space-x-4">
          <Link
            href="/tasks"
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || !formData.title.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  );
}