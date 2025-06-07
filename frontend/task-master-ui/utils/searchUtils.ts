export const highlightMatch = (text: string, query: string): string => {
  if (!query) return text
  
  const regex = new RegExp(`(${query})`, 'gi')
  return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>')
}

export const fuzzySearch = (text: string, query: string): boolean => {
  const pattern = query.split('').map(char => 
    `(?=.*${char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`
  ).join('')
  
  const regex = new RegExp(pattern, 'i')
  return regex.test(text)
}

export const searchScore = (text: string, query: string): number => {
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  
  // Exact match
  if (lowerText === lowerQuery) return 100
  
  // Starts with query
  if (lowerText.startsWith(lowerQuery)) return 90
  
  // Contains query as a word
  const wordBoundaryRegex = new RegExp(`\\b${lowerQuery}\\b`, 'i')
  if (wordBoundaryRegex.test(text)) return 80
  
  // Contains query
  if (lowerText.includes(lowerQuery)) return 70
  
  // Fuzzy match
  if (fuzzySearch(text, query)) return 50
  
  return 0
}

export const sortBySearchRelevance = <T extends { title: string; description?: string }>(
  items: T[],
  query: string
): T[] => {
  if (!query) return items
  
  return [...items].sort((a, b) => {
    const scoreA = Math.max(
      searchScore(a.title, query),
      searchScore(a.description || '', query)
    )
    const scoreB = Math.max(
      searchScore(b.title, query),
      searchScore(b.description || '', query)
    )
    
    return scoreB - scoreA
  })
}