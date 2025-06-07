"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Search, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/ui/empty-state"
import { Spinner } from "@/components/ui/spinner"
import { ProjectList } from "@/components/dashboard/ProjectList"
import { api, Project } from "@/lib/api"
import { useRequireAuth } from "@/hooks/useRequireAuth"

export default function DashboardPage() {
  useRequireAuth()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

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

  // Filter projects based on search query
  const filteredProjects = projects.filter(project => {
    if (!searchQuery) return true
    return project.name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const handleProjectClick = (projectId: string) => {
    router.push(`/projects/${projectId}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">ワークスペース</h1>
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="mr-2 h-4 w-4" />
              新規プロジェクト
            </Link>
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border-b px-6 py-3">
        <div className="max-w-md relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="プロジェクトを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border-gray-200 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-screen-xl mx-auto px-6 py-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Spinner size="lg" />
            </div>
          ) : filteredProjects.length === 0 ? (
            <EmptyState
              icon={
                <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                  />
                </svg>
              }
              title={searchQuery ? "プロジェクトが見つかりません" : "プロジェクトがありません"}
              description={searchQuery ? "別のキーワードで検索してください" : "新規プロジェクトを作成して、タスク管理を始めましょう"}
              action={!searchQuery ? {
                label: "プロジェクトを作成",
                onClick: () => router.push("/projects/new")
              } : undefined}
            />
          ) : (
            <ProjectList 
              projects={filteredProjects}
              onProjectClick={handleProjectClick}
            />
          )}
        </div>
      </div>
    </div>
  )
}