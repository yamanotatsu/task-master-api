"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  ArrowLeft, Plus, Search, Filter, 
  GitBranch, BarChart3, Calendar, List,
  AlertTriangle, X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Progress } from "@/components/ui/progress"
import { SkeletonLoader } from "@/components/common/SkeletonLoader"
import { ErrorMessage } from "@/components/common/ErrorMessage"
import { useErrorHandler } from "@/hooks/useErrorHandler"
import { TaskTable } from "@/components/dashboard/TaskTable"
import { TaskDetailPanel } from "@/components/task-detail/TaskDetailPanel"
import { SearchBar } from "@/components/dashboard/SearchBar"
import { FilterDropdown } from "@/components/dashboard/FilterDropdown"
import { useTaskSelection } from "@/hooks/useTaskSelection"
import { useTaskDetail } from "@/hooks/useTaskDetail"
import { useSearch } from "@/hooks/useSearch"
import { useFilter } from "@/hooks/useFilter"
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
  const { error, handleError, clearError, withErrorHandling } = useErrorHandler()
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const { selectedTasks, setSelectedTasks } = useTaskSelection()
  const { selectedTaskId, isOpen, openTaskDetail, closeTaskDetail } = useTaskDetail()
  const { searchQuery, setSearchQuery, searchResults } = useSearch(tasks)
  const { filters, setFilters, filteredResults, activeFilterCount } = useFilter(searchResults)

  useEffect(() => {
    loadProjectData()
  }, [projectId])

  const loadProjectData = async () => {
    setLoading(true)
    clearError()
    
    await withErrorHandling(
      async () => {
        const [projectData, tasksData] = await Promise.all([
          api.getProject(projectId),
          api.getTasks({ projectId })
        ])
        
        setProject(projectData)
        setTasks(tasksData.tasks)
      },
      {
        customMessage: 'プロジェクトの読み込みに失敗しました'
      }
    )
    
    setLoading(false)
  }

  const handleTaskClick = (taskId: number) => {
    openTaskDetail(taskId)
  }

  const handleTaskUpdateFromPanel = (updatedTask: Task) => {
    setTasks(tasks.map(task => 
      task.id === updatedTask.id ? updatedTask : task
    ))
  }

  const handleTaskStatusChange = async (taskId: number, newStatus: Task['status']) => {
    await withErrorHandling(
      async () => {
        await api.updateTaskStatus(taskId, newStatus)
        setTasks(tasks.map(task => 
          task.id === taskId ? { ...task, status: newStatus } : task
        ))
        toast.success("ステータスを更新しました")
      },
      {
        customMessage: 'ステータスの更新に失敗しました'
      }
    )
  }

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm("このタスクを削除してもよろしいですか？")) return
    
    await withErrorHandling(
      async () => {
        await api.deleteTask(taskId)
        setTasks(tasks.filter(task => task.id !== taskId))
        toast.success("タスクを削除しました")
      },
      {
        customMessage: 'タスクの削除に失敗しました'
      }
    )
  }

  // Final filtered tasks
  const filteredTasks = filteredResults

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
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              戻る
            </Button>
            <div className="h-6 w-px bg-gray-300" />
            <h1 className="text-xl font-semibold text-gray-900">{project?.name}</h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{progress}%</span> 完了
              <span className="mx-2">•</span>
              <span>{tasks.filter(t => t.status === 'completed' || t.status === 'done').length}/{tasks.length} タスク</span>
              {remainingDays !== null && (
                <>
                  <span className="mx-2">•</span>
                  <span className={remainingDays < 7 ? "text-red-500 font-medium" : ""}>
                    残り{remainingDays}日
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sub Header with Search and Actions */}
      <div className="bg-white border-b px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              新規タスク
            </Button>
            
            {selectedTasks.length > 0 && (
              <>
                <div className="h-6 w-px bg-gray-300" />
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    {selectedTasks.length}件選択中
                  </span>
                  <Button variant="outline" size="sm">
                    一括更新
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedTasks([])}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="w-64">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="タスクを検索..."
              />
            </div>
            
            <FilterDropdown
              filters={filters}
              onFilterChange={setFilters}
            />
            
            {(searchQuery || activeFilterCount > 0) && (
              <div className="text-sm text-gray-600">
                {filteredTasks.length}件の結果
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="bg-white border-b px-6">
        <nav className="flex space-x-6">
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2",
              viewMode === "list"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            <List className="h-4 w-4" />
            <span>リスト</span>
          </button>
          <button
            onClick={() => setViewMode("dependencies")}
            className={cn(
              "py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2",
              viewMode === "dependencies"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            <GitBranch className="h-4 w-4" />
            <span>依存関係</span>
          </button>
          <button
            onClick={() => setViewMode("gantt")}
            className={cn(
              "py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2",
              viewMode === "gantt"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            <Calendar className="h-4 w-4" />
            <span>ガント</span>
          </button>
          <button
            onClick={() => setViewMode("stats")}
            className={cn(
              "py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2",
              viewMode === "stats"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            <BarChart3 className="h-4 w-4" />
            <span>統計</span>
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-screen-xl mx-auto px-6 py-6">
          {error.isError ? (
            <ErrorMessage
              message={error.message}
              action={{
                label: '再読み込み',
                onClick: loadProjectData
              }}
            />
          ) : loading ? (
            <SkeletonLoader type="task-table" count={10} />
          ) : viewMode === "list" ? (
            <TaskTable
              tasks={filteredTasks}
              projectId={projectId}
              onTaskClick={handleTaskClick}
              onTaskStatusChange={handleTaskStatusChange}
              onTaskDelete={handleDeleteTask}
              selectedTasks={selectedTasks}
              onTaskSelectionChange={setSelectedTasks}
            />
          ) : null}

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
        </div>
      </div>
      
      {/* Task Detail Panel */}
      <TaskDetailPanel
        taskId={selectedTaskId}
        projectId={projectId}
        isOpen={isOpen}
        onClose={closeTaskDetail}
        onTaskUpdate={handleTaskUpdateFromPanel}
      />
    </div>
  )
}