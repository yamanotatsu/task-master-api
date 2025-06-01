'use client';

import { useEffect, useState } from 'react';
import { api, Task } from '@/lib/api';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  Plus, 
  Trash2, 
  GitBranch, 
  CheckCircle2, 
  ListTodo,
  AlertCircle,
  Clock,
  XCircle,
  Filter
} from 'lucide-react';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [updatingTasks, setUpdatingTasks] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadTasks();
  }, [filter]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await api.getTasks(filter !== 'all' ? filter : undefined);
      setTasks(response.tasks || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load tasks');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (taskId: number, newStatus: Task['status']) => {
    setUpdatingTasks(prev => new Set(prev).add(taskId));
    try {
      await api.updateTaskStatus(taskId, newStatus);
      await loadTasks();
      toast.success('Task status updated successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdatingTasks(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  const handleDelete = async (taskId: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    setUpdatingTasks(prev => new Set(prev).add(taskId));
    try {
      await api.deleteTask(taskId);
      await loadTasks();
      toast.success('Task deleted successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete task');
    } finally {
      setUpdatingTasks(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4" />;
      case 'in-progress': return <Clock className="h-4 w-4" />;
      case 'blocked': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: Task['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'completed': return 'secondary';
      case 'in-progress': return 'default';
      case 'blocked': return 'destructive';
      default: return 'outline';
    }
  };

  const getPriorityVariant = (priority: Task['priority']): "default" | "secondary" | "destructive" | "outline" => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-32" />
          <div className="flex items-center space-x-4">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">Manage and track your project tasks</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter tasks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button asChild>
            <Link href="/tasks/new">
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Link>
          </Button>
        </div>
      </div>

      {tasks.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <ListTodo className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No tasks found</p>
            <p className="text-muted-foreground mb-4">
              Create your first task or submit a PRD to generate tasks.
            </p>
            <Button asChild>
              <Link href="/tasks/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task) => (
            <Card 
              key={task.id} 
              className={`transition-all hover:shadow-md ${
                updatingTasks.has(task.id) ? 'opacity-60' : ''
              }`}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1 space-y-1">
                    <CardTitle className="text-xl">
                      <Link 
                        href={`/tasks/${task.id}`} 
                        className="hover:text-primary transition-colors"
                      >
                        {task.title}
                      </Link>
                    </CardTitle>
                    
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={getStatusVariant(task.status)} className="gap-1">
                        {getStatusIcon(task.status)}
                        {task.status}
                      </Badge>
                      
                      <Badge variant={getPriorityVariant(task.priority)}>
                        {task.priority} priority
                      </Badge>
                      
                      {task.dependencies.length > 0 && (
                        <Badge variant="outline" className="gap-1">
                          <GitBranch className="h-3 w-3" />
                          {task.dependencies.length} dependencies
                        </Badge>
                      )}
                      
                      {task.subtasks.length > 0 && (
                        <Badge variant="outline" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          {task.subtasks.filter(st => st.completed).length}/{task.subtasks.length} subtasks
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Select
                      value={task.status}
                      onValueChange={(value) => handleStatusUpdate(task.id, value as Task['status'])}
                      disabled={updatingTasks.has(task.id)}
                    >
                      <SelectTrigger className="w-[140px]" onClick={(e) => e.stopPropagation()}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="blocked">Blocked</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(task.id);
                      }}
                      disabled={updatingTasks.has(task.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                
                {task.description && (
                  <CardDescription className="mt-2 line-clamp-2">
                    {task.description}
                  </CardDescription>
                )}
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}