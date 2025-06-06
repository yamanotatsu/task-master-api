"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Grid3X3, List, Filter, SortAsc } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/ui/project-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, Project } from "@/lib/api";

type ViewMode = "card" | "list";
type FilterMode = "all" | "in-progress" | "completed";
type SortMode = "updated" | "created" | "progress" | "name";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [sort, setSort] = useState<SortMode>("updated");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await api.getProjects();
      setProjects(data);
    } catch (error) {
      console.error("Failed to load projects:", error);
    } finally {
      setLoading(false);
    }
  };

  // フィルタリング
  const filteredProjects = projects.filter(project => {
    // 検索フィルター
    if (searchQuery && !project.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // ステータスフィルター
    if (filter === "all") return true;
    if (filter === "in-progress") return project.progress > 0 && project.progress < 100;
    if (filter === "completed") return project.progress === 100;
    return true;
  });

  // ソート
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    switch (sort) {
      case "updated":
        return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
      case "created":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "progress":
        return b.progress - a.progress;
      case "name":
        return a.name.localeCompare(b.name);
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">プロジェクト</h1>
            <p className="text-muted-foreground mt-1">
              すべてのプロジェクトを管理
            </p>
          </div>
          <Button asChild size="lg" className="shadow-lg button-hover">
            <Link href="/projects/new">
              <Plus className="mr-2 h-5 w-5" />
              新規プロジェクト
            </Link>
          </Button>
        </div>

        {/* フィルターバー */}
        <div className="flex flex-col lg:flex-row gap-4 p-4 bg-card rounded-lg border">
          <div className="flex-1 flex gap-4">
            {/* 検索 */}
            <Input
              placeholder="プロジェクトを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            
            {/* ステータスフィルター */}
            <Select value={filter} onValueChange={(value) => setFilter(value as FilterMode)}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="in-progress">進行中</SelectItem>
                <SelectItem value="completed">完了</SelectItem>
              </SelectContent>
            </Select>

            {/* ソート */}
            <Select value={sort} onValueChange={(value) => setSort(value as SortMode)}>
              <SelectTrigger className="w-40">
                <SortAsc className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated">更新日順</SelectItem>
                <SelectItem value="created">作成日順</SelectItem>
                <SelectItem value="progress">進捗順</SelectItem>
                <SelectItem value="name">名前順</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ビューモード切替 */}
          <div className="flex items-center bg-muted rounded-lg p-1">
            <button
              onClick={() => setViewMode("card")}
              className={`p-2 rounded transition-colors ${
                viewMode === "card" 
                  ? "bg-background text-primary shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="カード表示"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded transition-colors ${
                viewMode === "list" 
                  ? "bg-background text-primary shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="リスト表示"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* プロジェクト一覧 */}
        {sortedProjects.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                />
              </svg>
            }
            title="プロジェクトが見つかりません"
            description={searchQuery ? "検索条件を変更してください" : "新規プロジェクトを作成して始めましょう"}
            action={{
              label: "プロジェクトを作成",
              onClick: () => window.location.href = "/projects/new"
            }}
          />
        ) : viewMode === "card" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedProjects.map((project) => (
              <ProjectCard
                key={project.id}
                id={project.id}
                name={project.name}
                createdAt={new Date(project.createdAt).toLocaleDateString("ja-JP")}
                progress={project.progress}
                completedTasks={project.completedTasks}
                totalTasks={project.totalTasks}
                assignees={project.assignees}
                deadline={project.deadline ? new Date(project.deadline).toLocaleDateString("ja-JP") : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-lg shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    プロジェクト名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    進捗
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    タスク
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    担当者
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    期限
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    更新日
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sortedProjects.map((project) => (
                  <tr 
                    key={project.id} 
                    className="hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => window.location.href = `/projects/${project.id}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium">{project.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-1 bg-muted rounded-full h-2 mr-2 max-w-[100px]">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {Math.round(project.progress)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {project.completedTasks}/{project.totalTasks}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex -space-x-2">
                        {project.assignees.slice(0, 3).map((assignee) => (
                          <div
                            key={assignee.id}
                            className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center"
                            title={assignee.name}
                          >
                            <span className="text-xs font-medium">
                              {assignee.name.charAt(0)}
                            </span>
                          </div>
                        ))}
                        {project.assignees.length > 3 && (
                          <span className="ml-2 text-sm text-muted-foreground">
                            +{project.assignees.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {project.deadline ? (
                        <span className={
                          new Date(project.deadline) < new Date() 
                            ? "text-destructive font-medium" 
                            : "text-muted-foreground"
                        }>
                          {new Date(project.deadline).toLocaleDateString("ja-JP")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {new Date(project.updatedAt || project.createdAt).toLocaleDateString("ja-JP")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}