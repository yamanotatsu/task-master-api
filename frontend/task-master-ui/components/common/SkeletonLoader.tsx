"use client"

import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'

interface SkeletonLoaderProps {
  type: 'project-list' | 'task-table' | 'task-detail' | 'card'
  count?: number
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ type, count = 1 }) => {
  switch (type) {
    case 'project-list':
      return (
        <div className="space-y-2">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="bg-white p-4 rounded-lg border">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-10 w-10 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-1/3" />
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )

    case 'task-table':
      return (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b">
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="divide-y">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="px-4 py-3 flex items-center space-x-4">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-6" />
                <Skeleton className="h-5 flex-1 max-w-md" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      )

    case 'task-detail':
      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-7 w-3/4" />
            <div className="flex items-center space-x-3">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
          
          <div className="space-y-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
          
          <div className="space-y-3">
            <Skeleton className="h-4 w-20" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )

    case 'card':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border p-6 space-y-4">
              <div className="flex items-start justify-between">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-4" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-2 w-full" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <Skeleton key={j} className="h-8 w-8 rounded-full" />
                  ))}
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}
        </div>
      )

    default:
      return null
  }
}