/**
 * Dependency Factory for Production and Testing
 * 本番用とテスト用の依存性を管理
 */

// Production dependencies
import { 
  listTasksDirect,
  showTaskDirect,
  addTaskDirect,
  updateTaskByIdDirect,
  removeTaskDirect,
  setTaskStatusDirect
} from '../../mcp-server/src/core/task-master-core.js';

import { logger } from './logger.js';

import { 
  prepareDirectFunctionArgs, 
  ensureProjectDirectory,
  getTasksJsonPath,
  getProjectRoot
} from './direct-function-helpers.js';

/**
 * Create production dependencies
 * @returns {Object} Production dependencies
 */
export function createProductionDependencies() {
  return {
    listTasksDirect,
    showTaskDirect,
    addTaskDirect,
    updateTaskByIdDirect,
    removeTaskDirect,
    setTaskStatusDirect,
    prepareDirectFunctionArgs,
    ensureProjectDirectory,
    getTasksJsonPath,
    getProjectRoot,
    logger
  };
}

/**
 * Create test dependencies with mocks
 * @param {Object} mockOverrides - Optional mock overrides
 * @param {Object} jestInstance - Jest instance for creating mocks
 * @returns {Object} Test dependencies
 */
export function createTestDependencies(mockOverrides = {}, jestInstance = null) {
  // jestInstance はテストファイルから渡される
  const mockFn = jestInstance ? jestInstance.fn : () => () => {};
  
  const defaultMocks = {
    // Task management
    listTasksDirect: mockFn(),
    showTaskDirect: mockFn(),
    addTaskDirect: mockFn(),
    updateTaskByIdDirect: mockFn(),
    removeTaskDirect: mockFn(),
    setTaskStatusDirect: mockFn(),
    
    // Subtask management
    addSubtaskDirect: mockFn(),
    updateSubtaskByIdDirect: mockFn(),
    removeSubtaskDirect: mockFn(),
    
    // Dependency management
    addDependencyDirect: mockFn(),
    removeDependencyDirect: mockFn(),
    validateDependenciesDirect: mockFn(),
    fixDependenciesDirect: mockFn(),
    
    // Task generation and expansion
    generateTasksFromPrdDirect: mockFn(),
    expandTaskDirect: mockFn(),
    expandAllTasksDirect: mockFn(),
    clearSubtasksDirect: mockFn(),
    
    // Analysis
    analyzeTaskComplexityDirect: mockFn(),
    complexityReportDirect: mockFn(),
    nextTaskDirect: mockFn(),
    
    // Project management
    initializeProjectDirect: mockFn(),
    generateTaskFilesDirect: mockFn(),
    
    // Utilities
    prepareDirectFunctionArgs: mockFn((action, params) => params),
    ensureProjectDirectory: mockFn(),
    getTasksJsonPath: mockFn(() => '/test/tasks.json'),
    getProjectRoot: mockFn(() => '/test/project'),
    logger: {
      info: mockFn(),
      error: mockFn(),
      warn: mockFn(),
      debug: mockFn()
    }
  };

  return {
    ...defaultMocks,
    ...mockOverrides
  };
}