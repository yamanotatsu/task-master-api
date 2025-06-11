import { useInfiniteQuery } from '@tanstack/react-query';
import { api, Project } from '@/lib/api';

interface ProjectsResponse {
	projects: Project[];
	nextCursor?: string;
	hasMore: boolean;
}

export const useInfiniteProjects = (limit = 20) => {
	return useInfiniteQuery({
		queryKey: ['projects', 'infinite'],
		queryFn: async ({ pageParam = 0 }) => {
			// Since the current API doesn't support pagination,
			// we'll simulate it for demonstration
			const allProjects = await api.getProjects();

			const start = pageParam * limit;
			const end = start + limit;
			const projects = allProjects.slice(start, end);

			return {
				projects,
				nextCursor: end < allProjects.length ? pageParam + 1 : undefined,
				hasMore: end < allProjects.length
			} as ProjectsResponse;
		},
		getNextPageParam: (lastPage) => lastPage.nextCursor,
		initialPageParam: 0,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000 // 10 minutes
	});
};
