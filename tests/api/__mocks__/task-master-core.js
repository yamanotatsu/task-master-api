import { jest } from '@jest/globals';

// Mock implementation for task-master-core
export const listTasksDirect = jest.fn();
export const showTaskDirect = jest.fn();
export const addTaskDirect = jest.fn();
export const updateTaskByIdDirect = jest.fn();
export const removeTaskDirect = jest.fn();
export const setTaskStatusDirect = jest.fn();
export const expandTaskDirect = jest.fn();
export const expandAllTasksDirect = jest.fn();
export const clearSubtasksDirect = jest.fn();
export const addSubtaskDirect = jest.fn();
export const updateSubtaskByIdDirect = jest.fn();
export const removeSubtaskDirect = jest.fn();
export const addDependencyDirect = jest.fn();
export const removeDependencyDirect = jest.fn();
export const validateDependenciesDirect = jest.fn();
export const fixDependenciesDirect = jest.fn();
export const nextTaskDirect = jest.fn();
export const analyzeTaskComplexityDirect = jest.fn();
export const complexityReportDirect = jest.fn();
export const initializeProjectDirect = jest.fn();
export const generateTaskFilesDirect = jest.fn();
export const parsePrdDirect = jest.fn();