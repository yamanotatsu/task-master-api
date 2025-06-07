import { useCallback, useRef } from 'react'

// Debounce function for search and other frequent operations
export const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  return useCallback(
    ((...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    }) as T,
    [callback, delay]
  )
}

// Throttle function for scroll and resize events
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastCallRef = useRef<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  return useCallback(
    ((...args) => {
      const now = Date.now()
      const timeSinceLastCall = now - lastCallRef.current

      if (timeSinceLastCall >= delay) {
        lastCallRef.current = now
        callback(...args)
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }

        timeoutRef.current = setTimeout(() => {
          lastCallRef.current = Date.now()
          callback(...args)
        }, delay - timeSinceLastCall)
      }
    }) as T,
    [callback, delay]
  )
}

// Measure performance of components
export const measurePerformance = (componentName: string) => {
  if (typeof window === 'undefined') return

  const startMark = `${componentName}-start`
  const endMark = `${componentName}-end`
  const measureName = `${componentName}-render`

  performance.mark(startMark)

  return () => {
    performance.mark(endMark)
    performance.measure(measureName, startMark, endMark)
    
    const measure = performance.getEntriesByName(measureName)[0]
    if (measure) {
      console.log(`${componentName} render time: ${measure.duration.toFixed(2)}ms`)
    }
    
    // Clean up
    performance.clearMarks(startMark)
    performance.clearMarks(endMark)
    performance.clearMeasures(measureName)
  }
}

// Web Vitals monitoring
export const reportWebVitals = (metric: any) => {
  if (metric.label === 'web-vital') {
    console.log(metric)
    
    // Send to analytics service
    // analytics.track('web-vital', {
    //   name: metric.name,
    //   value: metric.value,
    //   rating: metric.rating,
    // })
  }
}

// Intersection Observer for lazy loading
export const useLazyLoad = (
  ref: React.RefObject<HTMLElement>,
  callback: () => void,
  options?: IntersectionObserverInit
) => {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useCallback(() => {
    if (!ref.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            callbackRef.current()
          }
        })
      },
      options
    )

    observer.observe(ref.current)

    return () => {
      observer.disconnect()
    }
  }, [ref, options])
}

// Memory leak prevention
export const useCleanup = (cleanupFn: () => void) => {
  const cleanupRef = useRef(cleanupFn)
  cleanupRef.current = cleanupFn

  useCallback(() => {
    return () => {
      cleanupRef.current()
    }
  }, [])
}