'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import '@/app/nprogress.css';

// Configure NProgress
NProgress.configure({ 
  showSpinner: false,
  trickleSpeed: 200,
  minimum: 0.3
});

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    const handleStart = () => {
      setIsNavigating(true);
      NProgress.start();
    };

    const handleComplete = () => {
      setIsNavigating(false);
      NProgress.done();
    };

    // Start progress when pathname or search params change
    handleStart();

    // Complete progress after a short delay
    const timer = setTimeout(() => {
      handleComplete();
    }, 100);

    return () => {
      clearTimeout(timer);
      handleComplete();
    };
  }, [pathname, searchParams]);

  return null;
}