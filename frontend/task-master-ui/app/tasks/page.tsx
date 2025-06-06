"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Filter, SortAsc } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { StatusBadge } from "@/components/ui/status-badge";
import { Spinner } from "@/components/ui/spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { api, Task } from "@/lib/api";

type FilterMode = "all" | "pending" | "in-progress" | "completed";
type SortMode = "updated" | "created" | "priority" | "title";

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [sort, setSort] = useState<SortMode>("updated");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await api.getTasks({});
      setTasks(data.tasks);
    } catch (error) {
      console.error("Failed to load tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  // フィルタリング
  const filteredTasks = tasks.filter(task => {
    // 検索フィルター
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // ステータスフィルター
    if (filter === "all") return true;
    if (filter === "pending") return task.status === "pending" || task.status === "todo";
    if (filter === "in-progress") return task.status === "in-progress";
    if (filter === "completed") return task.status === "completed" || task.status === "done";
    return true;
  });

  // ソート
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    switch (sort) {
      case "updated":
        // API doesn't provide updatedAt, use id as proxy
        return b.id - a.id;
      case "created":
        return a.id - b.id;
      case "priority":
        // Could be based on tags or other criteria
        return 0;
      case "title":
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <Breadcrumb />
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
        {/* ヘッダー */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">マイタスク</h1>
          <p className="text-muted-foreground mt-1">
            すべてのタスクを一覧で確認
          </p>
        </div>

        {/* フィルターバー */}
        <div className="flex flex-col lg:flex-row gap-4 p-4 bg-card rounded-lg border">
          <div className="flex-1 flex flex-col sm:flex-row gap-4">
            {/* 検索 */}
            <Input
              placeholder="タスクを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:max-w-sm"
            />
            
            {/* ステータスフィルター */}
            <Select value={filter} onValueChange={(value) => setFilter(value as FilterMode)}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="pending">未着手</SelectItem>
                <SelectItem value="in-progress">進行中</SelectItem>
                <SelectItem value="completed">完了</SelectItem>
              </SelectContent>
            </Select>

            {/* ソート */}
            <Select value={sort} onValueChange={(value) => setSort(value as SortMode)}>
              <SelectTrigger className="w-full sm:w-40">
                <SortAsc className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated">更新日順</SelectItem>
                <SelectItem value="created">作成日順</SelectItem>
                <SelectItem value="priority">優先度順</SelectItem>
                <SelectItem value="title">タイトル順</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* タスク一覧 */}
        <div className="space-y-4">
          {sortedTasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              タスクが見つかりません
            </div>
          ) : (
            sortedTasks.map((task) => (
              <div
                key={task.id}
                className="bg-card rounded-lg border p-4 hover:border-primary cursor-pointer transition-colors"
                onClick={() => router.push(`/projects/${task.projectId}/tasks/${task.id}`)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium">#{task.id} {task.title}</h3>
                      <StatusBadge status={task.status} />
                    </div>
                    {task.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {task.assignee && (
                        <span>
                          担当: {typeof task.assignee === "string" ? task.assignee : task.assignee.name}
                        </span>
                      )}
                      {task.dependencies && task.dependencies.length > 0 && (
                        <span>依存: {task.dependencies.length}件</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/projects/${task.projectId}`);
                      }}
                    >
                      プロジェクトを表示
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}