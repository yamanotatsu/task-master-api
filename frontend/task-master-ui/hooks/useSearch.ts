import { useState, useMemo, useCallback } from 'react'
import { Task } from '@/lib/api'

export const useSearch = (items: Task[]) => {
  const [searchQuery, setSearchQuery] = useState('')

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return items

    const query = searchQuery.toLowerCase()
    
    return items.filter(item => {
      // Search in title
      if (item.title.toLowerCase().includes(query)) return true
      
      // Search in description
      if (item.description?.toLowerCase().includes(query)) return true
      
      // Search in subtask titles
      if (item.subtasks?.some(subtask => 
        subtask.title.toLowerCase().includes(query)
      )) return true
      
      // Search in task ID
      if (item.id.toString().includes(query)) return true
      
      // Search in assignee
      if (typeof item.assignee === 'string' && 
          item.assignee.toLowerCase().includes(query)) return true
      
      return false
    })
  }, [items, searchQuery])

  const highlightText = useCallback((text: string) => {
    if (!searchQuery.trim()) return text
    
    const query = searchQuery.toLowerCase()
    const parts = text.split(new RegExp(`(${query})`, 'gi'))
    
    return parts.map((part, index) => 
      part.toLowerCase() === query 
        ? `<mark key=${index} class="bg-yellow-200">${part}</mark>`
        : part
    ).join('')
  }, [searchQuery])

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    highlightText,
    hasResults: searchResults.length > 0,
    resultCount: searchResults.length
  }
}