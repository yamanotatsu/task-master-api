'use client';

import { useState } from 'react';
import { api, Task } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  ArrowLeft,
  Save,
  Loader2,
  AlertTriangle,
  Clock,
  User,
  GitBranch,
  FileText,
  TestTube
} from 'lucide-react';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

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

      toast.success('Task created successfully');
      router.push('/tasks');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create task');
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
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/tasks">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tasks
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create New Task</CardTitle>
          <CardDescription>
            Fill in the details below to create a new task. Required fields are marked with an asterisk.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Title *
              </label>
              <Input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter task title"
                required
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="Provide a brief description of the task"
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Priority */}
              <div className="space-y-2">
                <label htmlFor="priority" className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  Priority
                </label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value as Task['priority'] })}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Assignee */}
              <div className="space-y-2">
                <label htmlFor="assignee" className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Assignee
                </label>
                <Input
                  type="text"
                  id="assignee"
                  name="assignee"
                  value={formData.assignee}
                  onChange={handleChange}
                  placeholder="Enter assignee name"
                />
              </div>
            </div>

            {/* Estimated Effort */}
            <div className="space-y-2">
              <label htmlFor="estimatedEffort" className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Estimated Effort
              </label>
              <Input
                type="text"
                id="estimatedEffort"
                name="estimatedEffort"
                value={formData.estimatedEffort}
                onChange={handleChange}
                placeholder="e.g., 2 hours, 1 day, 1 week"
              />
            </div>

            {/* Dependencies */}
            <div className="space-y-2">
              <label htmlFor="dependencies" className="text-sm font-medium flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                Dependencies
              </label>
              <Input
                type="text"
                id="dependencies"
                name="dependencies"
                value={formData.dependencies}
                onChange={handleChange}
                placeholder="Comma-separated task IDs (e.g., 1, 2, 3)"
              />
              <p className="text-sm text-muted-foreground">
                Enter the IDs of tasks that must be completed before this task.
              </p>
            </div>

            {/* Additional Details */}
            <div className="space-y-2">
              <label htmlFor="details" className="text-sm font-medium">
                Additional Details
              </label>
              <Textarea
                id="details"
                name="details"
                value={formData.details}
                onChange={handleChange}
                rows={3}
                placeholder="Any additional information or context"
                className="resize-none"
              />
            </div>

            {/* Testing Strategy */}
            <div className="space-y-2">
              <label htmlFor="testingStrategy" className="text-sm font-medium flex items-center gap-2">
                <TestTube className="h-4 w-4 text-muted-foreground" />
                Testing Strategy
              </label>
              <Textarea
                id="testingStrategy"
                name="testingStrategy"
                value={formData.testingStrategy}
                onChange={handleChange}
                rows={2}
                placeholder="Describe how this task should be tested"
                className="resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                asChild
              >
                <Link href="/tasks">
                  Cancel
                </Link>
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !formData.title.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Task
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}