interface TaskCandidate {
	tempId: string;
	title: string;
	description: string;
	details: string;
	test_strategy: string;
	priority: 'high' | 'medium' | 'low';
	order: number;
}

interface TaskCandidateData {
	projectName: string;
	projectDescription?: string;
	prdContent: string;
	deadline?: string;
	tasks: TaskCandidate[];
	createdAt: number;
	updatedAt: number;
}

const STORAGE_PREFIX = 'taskCandidates_';

// Debounce helper
export function debounce<T extends (...args: any[]) => any>(
	func: T,
	wait: number
): (...args: Parameters<T>) => void {
	let timeout: NodeJS.Timeout | null = null;

	return (...args: Parameters<T>) => {
		if (timeout) {
			clearTimeout(timeout);
		}

		timeout = setTimeout(() => {
			func(...args);
		}, wait);
	};
}

export const taskCandidateStorage = {
	// Save task candidates to localStorage (async to avoid blocking)
	save(
		sessionId: string,
		data: Omit<TaskCandidateData, 'createdAt' | 'updatedAt'>
	): Promise<void> {
		return new Promise((resolve) => {
			// Use setTimeout to make it async
			setTimeout(() => {
				const now = Date.now();
				const storageData: TaskCandidateData = {
					...data,
					createdAt: this.get(sessionId)?.createdAt || now,
					updatedAt: now
				};

				try {
					localStorage.setItem(
						`${STORAGE_PREFIX}${sessionId}`,
						JSON.stringify(storageData)
					);
				} catch (error) {
					console.error('Failed to save to localStorage:', error);
				}
				resolve();
			}, 0);
		});
	},

	// Get task candidates from localStorage
	get(sessionId: string): TaskCandidateData | null {
		try {
			const item = localStorage.getItem(`${STORAGE_PREFIX}${sessionId}`);
			if (!item) return null;

			const data = JSON.parse(item) as TaskCandidateData;
			return data;
		} catch (error) {
			console.error('Failed to read from localStorage:', error);
			return null;
		}
	},

	// Remove task candidates from localStorage
	remove(sessionId: string): void {
		try {
			localStorage.removeItem(`${STORAGE_PREFIX}${sessionId}`);
		} catch (error) {
			console.error('Failed to remove from localStorage:', error);
		}
	},

	// Clear all old sessions (called when starting a new project)
	clearOldSessions(): void {
		try {
			const keys = Object.keys(localStorage);
			// Remove ALL task candidate sessions, not just old ones
			keys.forEach((key) => {
				if (key.startsWith(STORAGE_PREFIX)) {
					localStorage.removeItem(key);
				}
			});
		} catch (error) {
			console.error('Failed to clear old sessions:', error);
		}
	},

	// Check if a session exists
	exists(sessionId: string): boolean {
		return localStorage.getItem(`${STORAGE_PREFIX}${sessionId}`) !== null;
	},

	// Update only the tasks (returns Promise now)
	updateTasks(sessionId: string, tasks: TaskCandidate[]): Promise<void> {
		const data = this.get(sessionId);
		if (data) {
			return this.save(sessionId, {
				...data,
				tasks
			});
		}
		return Promise.resolve();
	}
};
