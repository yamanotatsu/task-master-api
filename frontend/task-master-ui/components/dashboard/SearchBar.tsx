"use client"

import React, { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onDebounce?: (value: string) => void
  debounceMs?: number
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = "検索...",
  onDebounce,
  debounceMs = 300
}) => {
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  useEffect(() => {
    if (onDebounce) {
      const timer = setTimeout(() => {
        onDebounce(localValue)
      }, debounceMs)

      return () => clearTimeout(timer)
    }
  }, [localValue, onDebounce, debounceMs])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setLocalValue(newValue)
    onChange(newValue)
  }

  const handleClear = () => {
    setLocalValue('')
    onChange('')
    onDebounce?.('')
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input
        type="text"
        placeholder={placeholder}
        value={localValue}
        onChange={handleChange}
        className="pl-10 pr-10"
      />
      {localValue && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
          onClick={handleClear}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}