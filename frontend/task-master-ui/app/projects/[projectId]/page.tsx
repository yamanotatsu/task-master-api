"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  ArrowLeft, Plus, GripVertical, Eye, GitBranch, 
  BarChart3, Calendar, MoreVertical, ChevronRight,
  Edit2, Trash2, Link, PlayCircle, CheckCircle,
  AlertTriangle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/ui/status-badge"
import { Spinner } from "@/components/ui/spinner"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { api, Project, Task } from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type ViewMode = "list" | "dependencies" | "gantt" | "stats"

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string
  
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [editingName, setEditingName] = useState(false)
  const [projectName, setProjectName] = useState("")
  const [selectedTasks, setSelectedTasks] = useState<number[]>([])
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null)

  useEffect(() => {
    loadProjectData()
  }, [projectId])

  const loadProjectData = async () => {
    try {
      setLoading(true)
      const [projectData, tasksData] = await Promise.all([
        api.getProject(projectId),
        api.getTasks({ projectId })
      ])
      
      setProject(projectData)
      setProjectName(projectData.name)
      setTasks(tasksData.tasks)
    } catch (error) {
      console.error("Failed to load project:", error)
      toast.error("プロジェクトの読み込みに失敗しました")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProjectName = async () => {
    if (!project || projectName === project.name) {
      setEditingName(false)
      return
    }
    
    try {
      const updated = await api.updateProject(projectId, { name: projectName })
      setProject(updated)
      toast.success("プロジェクト名を更新しました")
    } catch (error) {
      console.error("Failed to update project name:", error)
      toast.error("プロジェクト名の更新に失敗しました")
    } finally {
      setEditingName(false)
    }
  }

  const handleTaskStatusChange = async (taskId: number, newStatus: Task['status']) => {
    try {
      await api.updateTaskStatus(taskId, newStatus)
      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ))
      toast.success("ステータスを更新しました")
    } catch (error) {
      console.error("Failed to update task status:", error)
      toast.error("ステータスの更新に失敗しました")
    }
  }

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm("このタスクを削除してもよろしいですか？")) return
    
    try {
      await api.deleteTask(taskId)
      setTasks(tasks.filter(task => task.id !== taskId))
      toast.success("タスクを削除しました")
    } catch (error) {
      console.error("Failed to delete task:", error)
      toast.error("タスクの削除に失敗しました")
    }
  }

  const handleDragStart = (taskId: number) => {
    setDraggedTaskId(taskId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    
    if (draggedTaskId === null) return
    
    const draggedIndex = tasks.findIndex(t => t.id === draggedTaskId)
    if (draggedIndex === targetIndex) return
    
    // Reorder tasks
    const newTasks = [...tasks]
    const [draggedTask] = newTasks.splice(draggedIndex, 1)
    newTasks.splice(targetIndex, 0, draggedTask)
    
    setTasks(newTasks)
    setDraggedTaskId(null)
    
    // Check dependencies
    const hasDependencyIssue = draggedTask.dependencies.some(depId => {
      const depIndex = newTasks.findIndex(t => t.id === depId)
      return depIndex > targetIndex
    })
    
    if (hasDependencyIssue) {
      toast.warning("依存関係の順序に問題があります。依存関係を再計算することをお勧めします。")
    }
  }

  const calculateProgress = () => {
    if (tasks.length === 0) return 0
    const completedTasks = tasks.filter(t => 
      t.status === 'completed' || t.status === 'done'
    ).length
    return Math.round((completedTasks / tasks.length) * 100)
  }

  const getRemainingDays = () => {
    if (!project?.deadline) return null
    const now = new Date()
    const deadline = new Date(project.deadline)
    const diffTime = deadline.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p>プロジェクトが見つかりません</p>
      </div>
    )
  }

  const progress = calculateProgress()
  const remainingDays = getRemainingDays()

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      {/* Project Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          ダッシュボードに戻る
        </Button>
        
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {editingName ? (
              <div className="flex items-center gap-2 max-w-md">
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onBlur={handleUpdateProjectName}
                  onKeyPress={(e) => e.key === "Enter" && handleUpdateProjectName()}
                  className="text-3xl font-bold h-auto py-1"
                  autoFocus
                />
              </div>
            ) : (
              <h1 
                className="text-3xl font-bold flex items-center gap-2 cursor-pointer hover:text-primary"
                onClick={() => setEditingName(true)}
              >
                {project.name}
                <Edit2 className="h-5 w-5 text-gray-400" />
              </h1>
            )}
          </div>
          
          <Card className="w-80">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">進捗情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>進捗率</span>
                  <span className="font-bold">{progress}%</span>
                </div>
                <Progress value={progress} className="h-3" />
              </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500">タスク完了数</p>
                  <p className="text-xl font-bold">
                    {tasks.filter(t => t.status === 'completed' || t.status === 'done').length} / {tasks.length}
                  </p>
                </div>
                
                {project.deadline && (
                  <div className="text-right">
                    <p className="text-sm text-gray-500">期限まで</p>
                    <p className={cn(
                      "text-xl font-bold",
                      remainingDays && remainingDays < 7 && "text-red-500"
                    )}>
                      {remainingDays}日
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* View Tabs */}
      <div className="border-b">
        <nav className="flex space-x-8">
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "py-2 px-1 border-b-2 font-medium text-sm transition-colors",
              viewMode === "list"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            タスク一覧
          </button>
          <button
            onClick={() => setViewMode("dependencies")}
            className={cn(
              "py-2 px-1 border-b-2 font-medium text-sm transition-colors",
              viewMode === "dependencies"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            依存関係図
          </button>
          <button
            onClick={() => setViewMode("gantt")}
            className={cn(
              "py-2 px-1 border-b-2 font-medium text-sm transition-colors",
              viewMode === "gantt"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            ガントチャート
          </button>
          <button
            onClick={() => setViewMode("stats")}
            className={cn(
              "py-2 px-1 border-b-2 font-medium text-sm transition-colors",
              viewMode === "stats"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            統計
          </button>
        </nav>
      </div>

      {/* View Content */}
      {viewMode === "list" && (
        <div>
          {/* Action Bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                タスク追加
              </Button>
              
              {selectedTasks.length > 0 && (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        一括操作 ({selectedTasks.length}件)
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem>ステータス変更</DropdownMenuItem>
                      <DropdownMenuItem>担当者割り当て</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600">
                        削除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTasks([])}
                  >
                    選択解除
                  </Button>
                </>
              )}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  フィルタ
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>すべて</DropdownMenuItem>
                <DropdownMenuItem>未着手</DropdownMenuItem>
                <DropdownMenuItem>進行中</DropdownMenuItem>
                <DropdownMenuItem>完了</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Task Table */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="w-8 px-4 py-3">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTasks(tasks.map(t => t.id))
                        } else {
                          setSelectedTasks([])
                        }
                      }}
                      checked={selectedTasks.length === tasks.length && tasks.length > 0}
                    />
                  </th>
                  <th className="w-12"></th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    番号
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    タスク名
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    担当者
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    期限
                  </th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tasks.map((task, index) => (
                  <tr
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(task.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    className={cn(
                      "hover:bg-gray-50 transition-colors",
                      draggedTaskId === task.id && "opacity-50"
                    )}
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedTasks.includes(task.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTasks([...selectedTasks, task.id])
                          } else {
                            setSelectedTasks(selectedTasks.filter(id => id !== task.id))
                          }
                        }}
                      />
                    </td>
                    <td className="px-2 py-4 cursor-move">
                      <GripVertical className="h-4 w-4 text-gray-400" />
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      #{task.id}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => router.push(`/projects/${projectId}/tasks/${task.id}`)}
                        className="text-sm font-medium text-gray-900 hover:text-primary flex items-center gap-1"
                      >
                        {task.title}
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      {task.dependencies.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <Link className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            依存: {task.dependencies.join(", ")}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="px-4 py-4">
                      {task.assignee ? (
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-xs font-medium">
                              {typeof task.assignee === 'string' 
                                ? task.assignee.charAt(0) 
                                : (task.assignee as any).name?.charAt(0) || '?'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">未割当</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      -
                    </td>
                    <td className="px-4 py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => router.push(`/projects/${projectId}/tasks/${task.id}`)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            詳細表示
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit2 className="mr-2 h-4 w-4" />
                            編集
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleTaskStatusChange(task.id, 'in-progress')}
                          >
                            <PlayCircle className="mr-2 h-4 w-4" />
                            開始
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleTaskStatusChange(task.id, 'completed')}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            完了
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            削除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === "dependencies" && (
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <div className="flex items-center justify-center h-96 text-gray-500">
            <div className="text-center">
              <GitBranch className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">依存関係図</p>
              <p className="text-sm mt-2">タスク間の依存関係を視覚的に表示します</p>
              <p className="text-xs text-gray-400 mt-4">（開発中）</p>
            </div>
          </div>
        </div>
      )}

      {viewMode === "gantt" && (
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <div className="flex items-center justify-center h-96 text-gray-500">
            <div className="text-center">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">ガントチャート</p>
              <p className="text-sm mt-2">タスクのスケジュールを時系列で表示します</p>
              <p className="text-xs text-gray-400 mt-4">（開発中）</p>
            </div>
          </div>
        </div>
      )}

      {viewMode === "stats" && (
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <div className="flex items-center justify-center h-96 text-gray-500">
            <div className="text-center">
              <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">統計情報</p>
              <p className="text-sm mt-2">プロジェクトの各種統計データを表示します</p>
              <p className="text-xs text-gray-400 mt-4">（開発中）</p>
            </div>
          </div>
        </div>
      )}

      {/* Dependency Warning Modal */}
      {false && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-600">
                <AlertTriangle className="h-5 w-5" />
                依存関係の警告
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>タスクの順序を変更すると、依存関係に問題が発生する可能性があります。</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline">キャンセル</Button>
                <Button>依存関係を再計算</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}