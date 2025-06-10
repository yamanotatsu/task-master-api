export const handleRangeSelection = (
	clickedId: number,
	lastSelectedId: number | null,
	allIds: number[],
	currentSelection: number[],
	shiftKey: boolean
): number[] => {
	if (!shiftKey || !lastSelectedId) {
		return currentSelection.includes(clickedId)
			? currentSelection.filter((id) => id !== clickedId)
			: [...currentSelection, clickedId];
	}

	// Shift key is pressed and we have a last selected item
	const clickedIndex = allIds.indexOf(clickedId);
	const lastIndex = allIds.indexOf(lastSelectedId);

	if (clickedIndex === -1 || lastIndex === -1) {
		return currentSelection;
	}

	const start = Math.min(clickedIndex, lastIndex);
	const end = Math.max(clickedIndex, lastIndex);

	const rangeIds = allIds.slice(start, end + 1);
	const newSelection = new Set([...currentSelection, ...rangeIds]);

	return Array.from(newSelection);
};

export const getVisibleTaskIds = (tasks: any[]): number[] => {
	const visibleIds: number[] = [];

	const collectIds = (taskList: any[], parentExpanded: boolean = true) => {
		taskList.forEach((task) => {
			if (parentExpanded) {
				visibleIds.push(task.id);

				if (task.subtasks && task.isExpanded) {
					collectIds(task.subtasks, true);
				}
			}
		});
	};

	collectIds(tasks);
	return visibleIds;
};

export const isAllSelected = (
	visibleIds: number[],
	selectedIds: number[]
): boolean => {
	if (visibleIds.length === 0) return false;
	return visibleIds.every((id) => selectedIds.includes(id));
};

export const isIndeterminate = (
	visibleIds: number[],
	selectedIds: number[]
): boolean => {
	const selectedCount = visibleIds.filter((id) =>
		selectedIds.includes(id)
	).length;
	return selectedCount > 0 && selectedCount < visibleIds.length;
};
