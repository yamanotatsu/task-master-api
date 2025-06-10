import { useState, useMemo, useCallback } from 'react';
import { Task } from '@/lib/api';
import { FilterOptions } from '@/components/dashboard/FilterDropdown';

const initialFilters: FilterOptions = {
	status: [],
	priority: [],
	assignee: [],
	hasSubtasks: null,
	hasDependencies: null
};

export const useFilter = (items: Task[]) => {
	const [filters, setFilters] = useState<FilterOptions>(initialFilters);

	const filteredResults = useMemo(() => {
		let results = [...items];

		// Filter by status
		if (filters.status.length > 0) {
			results = results.filter((item) => filters.status.includes(item.status));
		}

		// Filter by priority
		if (filters.priority.length > 0) {
			results = results.filter((item) =>
				filters.priority.includes(item.priority)
			);
		}

		// Filter by assignee
		if (filters.assignee.length > 0) {
			results = results.filter((item) => {
				if (!item.assignee) return false;
				const assigneeName =
					typeof item.assignee === 'string'
						? item.assignee
						: (item.assignee as any).name || '';
				return filters.assignee.includes(assigneeName);
			});
		}

		// Filter by subtasks
		if (filters.hasSubtasks !== null) {
			results = results.filter((item) => {
				const hasSubtasks = item.subtasks && item.subtasks.length > 0;
				return filters.hasSubtasks ? hasSubtasks : !hasSubtasks;
			});
		}

		// Filter by dependencies
		if (filters.hasDependencies !== null) {
			results = results.filter((item) => {
				const hasDependencies =
					item.dependencies && item.dependencies.length > 0;
				return filters.hasDependencies ? hasDependencies : !hasDependencies;
			});
		}

		return results;
	}, [items, filters]);

	const clearFilters = useCallback(() => {
		setFilters(initialFilters);
	}, []);

	const hasActiveFilters = useMemo(() => {
		return (
			filters.status.length > 0 ||
			filters.priority.length > 0 ||
			filters.assignee.length > 0 ||
			filters.hasSubtasks !== null ||
			filters.hasDependencies !== null
		);
	}, [filters]);

	const activeFilterCount = useMemo(() => {
		return (
			filters.status.length +
			filters.priority.length +
			filters.assignee.length +
			(filters.hasSubtasks !== null ? 1 : 0) +
			(filters.hasDependencies !== null ? 1 : 0)
		);
	}, [filters]);

	return {
		filters,
		setFilters,
		filteredResults,
		clearFilters,
		hasActiveFilters,
		activeFilterCount
	};
};
