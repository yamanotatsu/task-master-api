"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  ArrowLeft, Calendar, User, Star, Plus, Check, X,
  Edit2, Trash2, ChevronDown, AlertCircle, Sparkles
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StatusBadge } from "@/components/ui/status-badge"
import { Spinner } from "@/components/ui/spinner"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { api, Task, Member } from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface EditingState {
  title?: boolean
  description?: boolean
  details?: boolean
  subtask?: string
}

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string
  const taskId = params.taskId as string
  
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<EditingState>({})
  const [editValues, setEditValues] = useState<Partial<Task>>({})
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("")
  const [showSubtaskModal, setShowSubtaskModal] = useState(false)
  const [subtaskCount, setSubtaskCount] = useState(5)
  const [members, setMembers] = useState<Member[]>([])
  const [availableTasks, setAvailableTasks] = useState<Task[]>([])
  const [newDependency, setNewDependency] = useState("")
  const [complexityAnalysis, setComplexityAnalysis] = useState<any>(null)

  useEffect(() => {
    loadTaskData()
  }, [taskId])

  const loadTaskData = async () => {
    try {
      setLoading(true)
      const [taskData, membersData, tasksData] = await Promise.all([
        api.getTask(parseInt(taskId)),
        api.getMembers(),
        api.getTasks()
      ])
      
      // Ensure subtasks array exists
      const taskWithSubtasks = {
        ...taskData,
        subtasks: taskData.subtasks || []
      }
      setTask(taskWithSubtasks)
      setEditValues(taskWithSubtasks)
      setMembers(membersData)
      setAvailableTasks(tasksData.tasks.filter(t => t.id !== parseInt(taskId)))
    } catch (error) {
      console.error("Failed to load task:", error)
      toast.error("タスクの読み込みに失敗しました")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateTask = async (field: keyof Task) => {
    if (!task) return
    
    try {
      const updated = await api.updateTask(task.id, {
        [field]: editValues[field]
      })
      setTask(updated)
      setEditing({ ...editing, [field]: false })
      toast.success("更新しました")
    } catch (error) {
      console.error("Failed to update task:", error)
      toast.error("更新に失敗しました")
    }
  }

  const handleStatusChange = async (newStatus: Task['status']) => {
    if (!task) return
    
    try {
      await api.updateTaskStatus(task.id, newStatus)
      setTask({ ...task, status: newStatus })
      toast.success("ステータスを更新しました")
    } catch (error) {
      console.error("Failed to update status:", error)
      toast.error("ステータスの更新に失敗しました")
    }
  }

  const handleAddSubtask = async () => {
    if (!task || !newSubtaskTitle.trim()) return
    
    try {
      const updated = await api.addSubtask(task.id, {
        title: newSubtaskTitle,
        description: ""
      })
      setTask(updated)
      setNewSubtaskTitle("")
      toast.success("サブタスクを追加しました")
    } catch (error) {
      console.error("Failed to add subtask:", error)
      toast.error("サブタスクの追加に失敗しました")
    }
  }

  const handleUpdateSubtask = async (subtaskId: string | number, completed: boolean) => {
    if (!task) return
    
    try {
      const updated = await api.updateSubtask(task.id, Number(subtaskId), {
        status: completed ? 'completed' : 'pending'
      })
      setTask(updated)
    } catch (error) {
      console.error("Failed to update subtask:", error)
      toast.error("サブタスクの更新に失敗しました")
    }
  }

  const handleDeleteSubtask = async (subtaskId: string | number) => {
    if (!task) return
    
    try {
      const updated = await api.removeSubtask(task.id, Number(subtaskId))
      setTask(updated)
      toast.success("サブタスクを削除しました")
    } catch (error) {
      console.error("Failed to delete subtask:", error)
      toast.error("サブタスクの削除に失敗しました")
    }
  }

  const handleAddDependency = async () => {
    if (!task || !newDependency) return
    
    try {
      const updated = await api.addDependency(task.id, parseInt(newDependency))
      setTask(updated)
      setNewDependency("")
      toast.success("依存関係を追加しました")
    } catch (error) {
      console.error("Failed to add dependency:", error)
      toast.error("依存関係の追加に失敗しました")
    }
  }

  const handleRemoveDependency = async (depId: number) => {
    if (!task) return
    
    try {
      const updated = await api.removeDependency(task.id, depId)
      setTask(updated)
      toast.success("依存関係を削除しました")
    } catch (error) {
      console.error("Failed to remove dependency:", error)
      toast.error("依存関係の削除に失敗しました")
    }
  }

  const handleAnalyzeComplexity = async () => {
    if (!task) return
    
    try {
      const analysis = await api.analyzeTaskComplexity(task.id)
      setComplexityAnalysis(analysis)
    } catch (error) {
      console.error("Failed to analyze complexity:", error)
      toast.error("複雑度分析に失敗しました")
    }
  }

  const handleExpandTask = async () => {
    if (!task) return
    
    try {
      const updated = await api.expandTask(task.id, {
        targetSubtasks: subtaskCount
      })
      setTask(updated)
      setShowSubtaskModal(false)
      toast.success(`${subtaskCount}個のサブタスクを生成しました`)
    } catch (error) {
      console.error("Failed to expand task:", error)
      toast.error("タスクの展開に失敗しました")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!task) {
    return (
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p>タスクが見つかりません</p>
      </div>
    )
  }

  const completedSubtasks = (task.subtasks || []).filter(s => s.status === 'completed' || s.completed).length

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push(`/projects/${projectId}`)}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        プロジェクトに戻る
      </Button>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          {/* Task Header */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Title */}
                {editing.title ? (
                  <div className="flex items-start gap-2">
                    <Input
                      value={editValues.title}
                      onChange={(e) => setEditValues({ ...editValues, title: e.target.value })}
                      className="text-2xl font-bold"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={() => handleUpdateTask('title')}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditing({ ...editing, title: false })
                        setEditValues({ ...editValues, title: task.title })
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <h1 
                    className="text-2xl font-bold flex items-center gap-2 cursor-pointer hover:text-primary"
                    onClick={() => setEditing({ ...editing, title: true })}
                  >
                    {task.title}
                    <Edit2 className="h-5 w-5 text-gray-400" />
                  </h1>
                )}

                {/* Status */}
                <div className="flex items-center gap-4">
                  <Select value={task.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">未着手</SelectItem>
                      <SelectItem value="in-progress">進行中</SelectItem>
                      <SelectItem value="completed">完了</SelectItem>
                      <SelectItem value="blocked">ブロック中</SelectItem>
                      <SelectItem value="review">レビュー中</SelectItem>
                      <SelectItem value="deferred">延期</SelectItem>
                      <SelectItem value="cancelled">キャンセル</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">説明</h3>
                  {editing.description ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editValues.description || ""}
                        onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                        className="min-h-[100px]"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleUpdateTask('description')}
                        >
                          保存
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditing({ ...editing, description: false })
                            setEditValues({ ...editValues, description: task.description })
                          }}
                        >
                          キャンセル
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                      onClick={() => setEditing({ ...editing, description: true })}
                    >
                      {task.description || (
                        <span className="text-gray-400">クリックして説明を追加</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Details */}
                {task.details && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">詳細</h3>
                    <div className="p-3 bg-gray-50 rounded-lg whitespace-pre-wrap">
                      {task.details}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Subtasks */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">サブタスク</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  {completedSubtasks}/{(task.subtasks || []).length} 完了
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowSubtaskModal(true)}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                AIで生成
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {(task.subtasks || []).map((subtask) => (
                <div
                  key={subtask.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50"
                >
                  <Checkbox
                    checked={subtask.status === 'completed' || subtask.completed}
                    onCheckedChange={(checked) => 
                      handleUpdateSubtask(subtask.id, checked as boolean)
                    }
                  />
                  <div className="flex-1">
                    <p className={cn(
                      "text-sm",
                      (subtask.status === 'completed' || subtask.completed) && "line-through text-gray-400"
                    )}>
                      {subtask.title}
                    </p>
                    {subtask.description && (
                      <p className="text-xs text-gray-500 mt-1">{subtask.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {subtask.assignee && (
                      <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-xs">
                          {typeof subtask.assignee === 'string' 
                            ? subtask.assignee.charAt(0) 
                            : (subtask.assignee as any).name?.charAt(0) || '?'}
                        </span>
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteSubtask(subtask.id)}
                    >
                      <Trash2 className="h-4 w-4 text-gray-400" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {/* Add Subtask */}
              <div className="flex gap-2 pt-2">
                <Input
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAddSubtask()}
                  placeholder="新しいサブタスクを追加..."
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={handleAddSubtask}
                  disabled={!newSubtaskTitle.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">基本情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">担当者</label>
                <Select 
                  value={task.assignee || "unassigned"}
                  onValueChange={async (value) => {
                    try {
                      const assignee = value === "unassigned" ? null : value;
                      await api.updateTask(task.id, { assignee });
                      setTask({ ...task, assignee });
                      toast.success("担当者を更新しました");
                    } catch (error) {
                      console.error("Failed to update assignee:", error);
                      toast.error("担当者の更新に失敗しました");
                    }
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="未割当" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">未割当</SelectItem>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">期限</label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <Input type="date" className="flex-1" />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">作成日</label>
                <p className="text-sm text-gray-600 mt-1">
                  {task.createdAt ? new Date(task.createdAt).toLocaleDateString("ja-JP") : "-"}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">更新日</label>
                <p className="text-sm text-gray-600 mt-1">
                  {task.updatedAt ? new Date(task.updatedAt).toLocaleDateString("ja-JP") : "-"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Dependencies */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">依存関係</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">先行タスク</label>
                <div className="space-y-2 mt-2">
                  {task.dependencies.map((depId) => {
                    const depTask = availableTasks.find(t => t.id === depId)
                    return (
                      <div key={depId} className="flex items-center justify-between">
                        <span className="text-sm">
                          #{depId} {depTask?.title || ""}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveDependency(depId)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })}
                  {task.dependencies.length === 0 && (
                    <p className="text-sm text-gray-400">なし</p>
                  )}
                </div>
                
                <div className="flex gap-2 mt-3">
                  <Select value={newDependency} onValueChange={setNewDependency}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="タスクを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTasks
                        .filter(t => !task.dependencies.includes(t.id))
                        .map((t) => (
                          <SelectItem key={t.id} value={t.id.toString()}>
                            #{t.id} {t.title}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={handleAddDependency}
                    disabled={!newDependency}
                  >
                    追加
                  </Button>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">後続タスク</label>
                <div className="space-y-2 mt-2">
                  {availableTasks
                    .filter(t => t.dependencies.includes(task.id))
                    .map((t) => (
                      <div key={t.id} className="text-sm">
                        #{t.id} {t.title}
                      </div>
                    ))}
                  {availableTasks.filter(t => t.dependencies.includes(task.id)).length === 0 && (
                    <p className="text-sm text-gray-400">なし</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Complexity Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">複雑度分析</CardTitle>
            </CardHeader>
            <CardContent>
              {complexityAnalysis ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={cn(
                          "h-5 w-5",
                          star <= complexityAnalysis.complexity.score / 20
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-gray-600">
                    推奨サブタスク数: {complexityAnalysis.complexity.recommendations[0]}
                  </p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 mb-4">
                    タスクの複雑度を分析します
                  </p>
                  <Button
                    variant="outline"
                    onClick={handleAnalyzeComplexity}
                  >
                    タスクを分析
                  </Button>
                </div>
              )}
              
              <div className="mt-4 pt-4 border-t">
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => setShowSubtaskModal(true)}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  サブタスクに分解
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Subtask Generation Modal */}
      {showSubtaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>サブタスク生成</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  生成するサブタスク数
                </label>
                <div className="space-y-4">
                  <Slider
                    value={[subtaskCount]}
                    onValueChange={(value) => setSubtaskCount(value[0])}
                    min={3}
                    max={10}
                    step={1}
                  />
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>3タスク</span>
                    <span className="text-lg font-bold text-primary">{subtaskCount}</span>
                    <span>10タスク</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  AIがタスクの内容を分析して、{subtaskCount}個の適切なサブタスクを生成します。
                </p>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowSubtaskModal(false)}
                >
                  キャンセル
                </Button>
                <Button onClick={handleExpandTask}>
                  生成する
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}