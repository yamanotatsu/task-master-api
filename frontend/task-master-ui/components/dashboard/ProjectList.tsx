"use client"

import React, { useState } from 'react'
import { Project } from '@/lib/api'
import { ProjectItem } from './ProjectItem'

interface ProjectListProps {
  projects: Project[]
  onProjectClick: (projectId: string) => void
}

export const ProjectList: React.FC<ProjectListProps> = React.memo(({ projects, onProjectClick }) => {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev)
      if (newSet.has(projectId)) {
        newSet.delete(projectId)
      } else {
        newSet.add(projectId)
      }
      return newSet
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="px-6 py-3 border-b bg-gray-50">
        <h2 className="text-sm font-medium text-gray-700">すべてのプロジェクト</h2>
      </div>
      <div className="divide-y divide-gray-200">
        {projects.map((project) => (
          <ProjectItem
            key={project.id}
            project={project}
            isExpanded={expandedProjects.has(project.id)}
            onToggle={() => toggleProject(project.id)}
            onProjectClick={onProjectClick}
          />
        ))}
      </div>
    </div>
  )
})

ProjectList.displayName = 'ProjectList'