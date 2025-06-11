import { jest } from '@jest/globals';

// Mock implementation for direct-function-helpers
export const prepareDirectFunctionArgs = jest.fn((action, params) => params);
export const ensureProjectDirectory = jest.fn();
export const getTasksJsonPath = jest.fn(() => '/test/tasks.json');
export const getProjectRoot = jest.fn(() => '/test/project');
