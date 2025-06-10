import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function updateTasksInProject(tasks) {
	const projectPath = path.join(
		__dirname,
		'..',
		'..',
		'projects',
		'default',
		'tasks.json'
	);

	// Ensure directory exists
	const projectDir = path.dirname(projectPath);
	if (!fs.existsSync(projectDir)) {
		fs.mkdirSync(projectDir, { recursive: true });
	}

	// Read existing tasks
	let existingData = { tasks: [], lastTaskId: 0 };
	if (fs.existsSync(projectPath)) {
		try {
			const content = fs.readFileSync(projectPath, 'utf8');
			existingData = JSON.parse(content);
		} catch (error) {
			console.error('Error reading existing tasks:', error);
		}
	}

	// Merge new tasks with existing ones
	const existingTasksMap = new Map(existingData.tasks.map((t) => [t.id, t]));

	// Update or add new tasks
	tasks.forEach((task) => {
		existingTasksMap.set(task.id, task);
	});

	// Convert back to array and sort by ID
	const allTasks = Array.from(existingTasksMap.values()).sort(
		(a, b) => a.id - b.id
	);

	// Find the highest ID
	const maxId =
		allTasks.length > 0 ? Math.max(...allTasks.map((t) => t.id)) : 0;

	// Save updated tasks
	const updatedData = {
		tasks: allTasks,
		lastTaskId: maxId
	};

	fs.writeFileSync(projectPath, JSON.stringify(updatedData, null, 2), 'utf8');
	console.log(`[API INFO] Updated ${tasks.length} tasks in ${projectPath}`);

	return updatedData;
}

export async function getTaskById(taskId) {
	const projectPath = path.join(
		__dirname,
		'..',
		'..',
		'projects',
		'default',
		'tasks.json'
	);

	if (!fs.existsSync(projectPath)) {
		return null;
	}

	try {
		const content = fs.readFileSync(projectPath, 'utf8');
		const data = JSON.parse(content);
		return data.tasks.find((t) => t.id === taskId) || null;
	} catch (error) {
		console.error('Error reading tasks:', error);
		return null;
	}
}

export async function deleteTaskById(taskId) {
	const projectPath = path.join(
		__dirname,
		'..',
		'..',
		'projects',
		'default',
		'tasks.json'
	);

	if (!fs.existsSync(projectPath)) {
		return false;
	}

	try {
		const content = fs.readFileSync(projectPath, 'utf8');
		const data = JSON.parse(content);

		const initialLength = data.tasks.length;
		data.tasks = data.tasks.filter((t) => t.id !== taskId);

		if (data.tasks.length < initialLength) {
			fs.writeFileSync(projectPath, JSON.stringify(data, null, 2), 'utf8');
			return true;
		}

		return false;
	} catch (error) {
		console.error('Error deleting task:', error);
		return false;
	}
}
