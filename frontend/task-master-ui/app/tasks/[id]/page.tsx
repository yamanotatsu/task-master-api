'use client';

import { useEffect, useState } from 'react';
import { api, Task, ComplexityAnalysis } from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  ArrowLeft,
  Brain,
  Expand,
  Trash2,
  Plus,
  X,
  CheckCircle2,
  Circle,
  GitBranch,
  Clock,
  AlertTriangle,
  Sparkles,
  User,
  Calendar,
  Info,
  ChevronRight,
  Loader2
} from 'lucide-react';

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = parseInt(params.id as string);
  
  const [task, setTask] = useState<Task | null>(null);
  const [complexity, setComplexity] = useState<ComplexityAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpanding, setIsExpanding] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [newDependencyId, setNewDependencyId] = useState('');
  const [isAddingDependency, setIsAddingDependency] = useState(false);
  const [updatingSubtasks, setUpdatingSubtasks] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadTask();
  }, [taskId]);

  const loadTask = async () => {
    try {
      setLoading(true);
      const taskData = await api.getTask(taskId);
      setTask(taskData);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load task');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeComplexity = async () => {
    setIsAnalyzing(true);
    try {
      const analysis = await api.analyzeTaskComplexity(taskId);
      setComplexity(analysis);
      toast.success('Complexity analysis completed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to analyze complexity');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExpand = async () => {
    setIsExpanding(true);
    try {
      const expandedTask = await api.expandTask(taskId, { numSubtasks: 5 });
      setTask(expandedTask);
      toast.success('Task expanded successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to expand task');
    } finally {
      setIsExpanding(false);
    }
  };

  const handleClearSubtasks = async () => {
    if (!confirm('Are you sure you want to clear all subtasks?')) return;
    
    try {
      const clearedTask = await api.clearSubtasks(taskId);
      setTask(clearedTask);
      toast.success('Subtasks cleared successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to clear subtasks');
    }
  };

  const handleSubtaskToggle = async (subtaskId: number, completed: boolean) => {
    if (!task) return;
    
    setUpdatingSubtasks(prev => new Set(prev).add(subtaskId));
    try {
      const updatedTask = await api.updateSubtask(taskId, subtaskId, { completed });
      setTask(updatedTask);
      toast.success(`Subtask ${completed ? 'completed' : 'uncompleted'}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update subtask');
    } finally {
      setUpdatingSubtasks(prev => {
        const next = new Set(prev);
        next.delete(subtaskId);
        return next;
      });
    }
  };

  const handleAddDependency = async () => {
    if (!newDependencyId.trim()) return;
    
    setIsAddingDependency(true);
    try {
      const updatedTask = await api.addDependency(taskId, parseInt(newDependencyId));
      setTask(updatedTask);
      setNewDependencyId('');
      toast.success('Dependency added successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add dependency');
    } finally {
      setIsAddingDependency(false);
    }
  };

  const handleRemoveDependency = async (depId: number) => {
    try {
      const updatedTask = await api.removeDependency(taskId, depId);
      setTask(updatedTask);
      toast.success('Dependency removed successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove dependency');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-32" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="text-center py-12">
          <CardContent>
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Task not found</p>
            <Button asChild className="mt-4">
              <Link href="/tasks">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Tasks
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4" />;
      case 'in-progress': return <Clock className="h-4 w-4" />;
      case 'blocked': return <X className="h-4 w-4" />;
      default: return <Circle className="h-4 w-4" />;
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

  const getComplexityVariant = (level: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (level) {
      case 'very-high': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <CardTitle className="text-3xl">{task.title}</CardTitle>
              {task.description && (
                <CardDescription className="text-base">{task.description}</CardDescription>
              )}
            </div>
            <Badge variant={getStatusVariant(task.status)} className="gap-1 ml-4">
              {getStatusIcon(task.status)}
              {task.status}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Task Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Priority:</span>
              <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'secondary' : 'outline'}>
                {task.priority}
              </Badge>
            </div>
            
            {task.estimatedEffort && (
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Estimated Effort:</span>
                <span className="text-sm">{task.estimatedEffort}</span>
              </div>
            )}
            
            {task.assignee && (
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Assignee:</span>
                <span className="text-sm">{task.assignee}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={handleAnalyzeComplexity}
              disabled={isAnalyzing}
              variant="outline"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Analyze Complexity
                </>
              )}
            </Button>
            
            <Button 
              onClick={handleExpand}
              disabled={isExpanding}
              variant="outline"
            >
              {isExpanding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Expanding...
                </>
              ) : (
                <>
                  <Expand className="h-4 w-4 mr-2" />
                  Expand Task
                </>
              )}
            </Button>
            
            {task.subtasks.length > 0 && (
              <Button 
                onClick={handleClearSubtasks}
                variant="destructive"
                size="sm"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Subtasks
              </Button>
            )}
          </div>

          {/* Complexity Analysis */}
          {complexity && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Complexity Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Score:</span>
                    <Badge variant={getComplexityVariant(complexity.complexity.level)}>
                      {complexity.complexity.score} - {complexity.complexity.level}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Subtasks:</span>
                    <span className="text-sm">{complexity.complexity.factors.subtaskCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Dependencies:</span>
                    <span className="text-sm">{complexity.complexity.factors.dependencyCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Technical:</span>
                    <Badge variant="outline">{complexity.complexity.factors.hasTechnicalTerms ? 'Yes' : 'No'}</Badge>
                  </div>
                </div>
                
                {complexity.complexity.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-1">
                      <Info className="h-4 w-4" />
                      Recommendations
                    </h4>
                    <ul className="space-y-1">
                      {complexity.complexity.recommendations.map((rec, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground flex items-start">
                          <ChevronRight className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Dependencies */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5" />
                  Dependencies
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Enter task ID"
                  value={newDependencyId}
                  onChange={(e) => setNewDependencyId(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={handleAddDependency}
                  disabled={isAddingDependency || !newDependencyId.trim()}
                  size="sm"
                >
                  {isAddingDependency ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {task.dependencies.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No dependencies
                </p>
              ) : (
                <div className="space-y-2">
                  {task.dependencies.map((depId) => (
                    <div key={depId} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <Link 
                        href={`/tasks/${depId}`} 
                        className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-2"
                      >
                        <GitBranch className="h-3 w-3" />
                        Task #{depId}
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDependency(depId)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subtasks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Subtasks
                {task.subtasks.length > 0 && (
                  <Badge variant="outline" className="ml-2">
                    {task.subtasks.filter(st => st.completed).length}/{task.subtasks.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {task.subtasks.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-4">
                    No subtasks yet. Click "Expand Task" to generate subtasks.
                  </p>
                  <Button onClick={handleExpand} disabled={isExpanding} size="sm">
                    {isExpanding ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Expanding...
                      </>
                    ) : (
                      <>
                        <Expand className="h-4 w-4 mr-2" />
                        Expand Task
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {task.subtasks.map((subtask) => (
                    <div 
                      key={subtask.id} 
                      className={`flex items-start gap-3 p-3 rounded-lg transition-all hover:bg-muted/50 ${
                        updatingSubtasks.has(subtask.id) ? 'opacity-60' : ''
                      }`}
                    >
                      <button
                        onClick={() => handleSubtaskToggle(subtask.id, !subtask.completed)}
                        disabled={updatingSubtasks.has(subtask.id)}
                        className="mt-0.5"
                      >
                        {subtask.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                        )}
                      </button>
                      <div className="flex-1 space-y-1">
                        <p className={`font-medium ${subtask.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {subtask.title}
                        </p>
                        {subtask.description && (
                          <p className="text-sm text-muted-foreground">
                            {subtask.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}