'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

interface QueryProviderProps {
	children: React.ReactNode;
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
	const [queryClient] = useState(() => new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 60 * 1000, // 1 minute
				gcTime: 5 * 60 * 1000, // 5 minutes
				retry: 3,
				retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
				refetchOnWindowFocus: false
			},
			mutations: {
				retry: 1
			}
		}
	}));

	return (
		<QueryClientProvider client={queryClient}>
			{children}
			{/* ReactQueryDevtools temporarily disabled due to compatibility issues */}
			{/* {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />} */}
		</QueryClientProvider>
	);
};
