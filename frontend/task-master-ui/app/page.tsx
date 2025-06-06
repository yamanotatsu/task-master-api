"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Grid3X3, List, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProjectCard } from "@/components/ui/project-card"
import { EmptyState } from "@/components/ui/empty-state"
import { Spinner } from "@/components/ui/spinner"
import { api, Project } from "@/lib/api"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type ViewMode = "card" | "list"
type FilterMode = "all" | "in-progress" | "completed"
type SortMode = "updated" | "created" | "progress" | "name"

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>("card")
  const [filter, setFilter] = useState<FilterMode>("all")
  const [sort, setSort] = useState<SortMode>("updated")

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      setLoading(true)
      const data = await api.getProjects()
      setProjects(data)
    } catch (error) {
      console.error("Failed to load projects:", error)
    } finally {
      setLoading(false)
    }
  }

  // Filter projects
  const filteredProjects = projects.filter(project => {
    if (filter === "all") return true
    if (filter === "in-progress") return project.progress > 0 && project.progress < 100
    if (filter === "completed") return project.progress === 100
    return true
  })

  // Sort projects
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    switch (sort) {
      case "updated":
        return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
      case "created":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case "progress":
        return b.progress - a.progress
      case "name":
        return a.name.localeCompare(b.name)
      default:
        return 0
    }
  })

  const sortLabels: Record<SortMode, string> = {
    updated: "更新日順",
    created: "作成日順",
    progress: "進捗順",
    name: "名前順"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">ダッシュボード</h1>
        <Button asChild size="lg" className="shadow-lg">
          <Link href="/projects/new">
            <Plus className="mr-2 h-5 w-5" />
            新規プロジェクト作成
          </Link>
        </Button>
      </div>

      {/* Control Bar */}
      <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border">
        <div className="flex items-center space-x-4">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode("card")}
              className={`p-2 rounded transition-colors ${
                viewMode === "card" ? "bg-white text-primary shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
              title="カード表示"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded transition-colors ${
                viewMode === "list" ? "bg-white text-primary shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
              title="リスト表示"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">フィルタ:</span>
            <div className="flex rounded-lg bg-gray-100 p-1">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  filter === "all" ? "bg-white text-primary shadow-sm" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                すべて
              </button>
              <button
                onClick={() => setFilter("in-progress")}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  filter === "in-progress" ? "bg-white text-primary shadow-sm" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                進行中
              </button>
              <button
                onClick={() => setFilter("completed")}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  filter === "completed" ? "bg-white text-primary shadow-sm" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                完了
              </button>
            </div>
          </div>
        </div>

        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {sortLabels[sort]}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSort("updated")}>
              更新日順
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSort("created")}>
              作成日順
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSort("progress")}>
              進捗順
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSort("name")}>
              名前順
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Projects Grid/List */}
      {sortedProjects.length === 0 ? (
        <EmptyState
          icon={
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
              />
            </svg>
          }
          title="プロジェクトがありません"
          description="新規プロジェクトを作成して、タスク管理を始めましょう"
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
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  プロジェクト名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  進捗
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  タスク
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  担当者
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  期限
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedProjects.map((project) => (
                <tr 
                  key={project.id} 
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => window.location.href = `/projects/${project.id}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{project.name}</div>
                    <div className="text-xs text-gray-500">
                      作成日: {new Date(project.createdAt).toLocaleDateString("ja-JP")}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">{Math.round(project.progress)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {project.completedTasks}/{project.totalTasks}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex -space-x-2">
                      {project.assignees.slice(0, 3).map((assignee) => (
                        <div
                          key={assignee.id}
                          className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center"
                          title={assignee.name}
                        >
                          <span className="text-xs font-medium">
                            {assignee.name.charAt(0)}
                          </span>
                        </div>
                      ))}
                      {project.assignees.length > 3 && (
                        <span className="ml-2 text-sm text-gray-500">
                          +{project.assignees.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {project.deadline ? (
                      <span className={
                        new Date(project.deadline) < new Date() 
                          ? "text-red-500 font-medium" 
                          : "text-gray-600"
                      }>
                        {new Date(project.deadline).toLocaleDateString("ja-JP")}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}