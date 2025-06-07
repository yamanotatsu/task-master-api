import { useState, useEffect, useCallback } from 'react'
import { ViewType } from '@/components/dashboard/ViewTabs'

const VIEW_PREFERENCE_KEY = 'task-master-view-preference'

interface ViewPreferences {
  [projectId: string]: ViewType
}

export const useViewPreference = (projectId: string) => {
  const [viewType, setViewType] = useState<ViewType>('list')

  useEffect(() => {
    // Load saved preference
    const savedPreferences = localStorage.getItem(VIEW_PREFERENCE_KEY)
    if (savedPreferences) {
      try {
        const preferences: ViewPreferences = JSON.parse(savedPreferences)
        const savedView = preferences[projectId]
        if (savedView) {
          setViewType(savedView)
        }
      } catch (error) {
        console.error('Failed to load view preference:', error)
      }
    }
  }, [projectId])

  const saveViewPreference = useCallback((view: ViewType) => {
    setViewType(view)
    
    try {
      const savedPreferences = localStorage.getItem(VIEW_PREFERENCE_KEY)
      const preferences: ViewPreferences = savedPreferences 
        ? JSON.parse(savedPreferences) 
        : {}
      
      preferences[projectId] = view
      localStorage.setItem(VIEW_PREFERENCE_KEY, JSON.stringify(preferences))
    } catch (error) {
      console.error('Failed to save view preference:', error)
    }
  }, [projectId])

  return {
    viewType,
    setViewType: saveViewPreference
  }
}