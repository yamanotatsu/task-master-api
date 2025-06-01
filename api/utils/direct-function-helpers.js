import path from 'path';
import fs from 'fs';

/**
 * Helper to get the project root path
 */
export function getProjectRoot() {
  return process.env.TASK_PROJECT_ROOT || path.join(process.cwd(), 'projects', 'default');
}

/**
 * Helper to get the tasks.json path
 */
export function getTasksJsonPath() {
  return path.join(getProjectRoot(), 'tasks.json');
}

/**
 * Helper to ensure project directory exists
 */
export function ensureProjectDirectory() {
  const projectRoot = getProjectRoot();
  if (!fs.existsSync(projectRoot)) {
    fs.mkdirSync(projectRoot, { recursive: true });
  }
  
  const tasksPath = getTasksJsonPath();
  if (!fs.existsSync(tasksPath)) {
    fs.writeFileSync(tasksPath, JSON.stringify({
      tasks: [],
      lastTaskId: 0
    }, null, 2));
  }
  
  return projectRoot;
}

/**
 * Prepare arguments for direct functions
 * Maps common API parameters to the expected direct function parameters
 */
export function prepareDirectFunctionArgs(functionName, apiArgs = {}) {
  const projectRoot = getProjectRoot();
  const tasksJsonPath = getTasksJsonPath();
  
  // Common mappings
  const commonArgs = {
    tasksJsonPath,
    projectRoot
  };
  
  // Function-specific argument mappings
  switch (functionName) {
    case 'listTasks':
      return {
        tasksJsonPath,
        status: apiArgs.filter || 'all',
        withSubtasks: apiArgs.withSubtasks || false
      };
      
    case 'showTask':
      return {
        tasksJsonPath,
        id: apiArgs.taskId,
        format: apiArgs.format || 'json',
        projectRoot
      };
      
    case 'addTask':
      return {
        tasksJsonPath,
        title: apiArgs.title,
        description: apiArgs.description,
        priority: apiArgs.priority || 'medium',
        dependencies: apiArgs.dependencies || [],
        details: apiArgs.details,
        testStrategy: apiArgs.testStrategy
      };
      
    case 'updateTaskById':
      return {
        tasksJsonPath,
        id: apiArgs.taskId,
        title: apiArgs.title,
        description: apiArgs.description,
        priority: apiArgs.priority,
        details: apiArgs.details,
        testStrategy: apiArgs.testStrategy,
        projectRoot
      };
      
    case 'removeTask':
      return {
        tasksJsonPath,
        id: apiArgs.taskId,
        projectRoot
      };
      
    case 'setTaskStatus':
      return {
        tasksJsonPath,
        id: apiArgs.taskId,
        status: apiArgs.status,
        projectRoot
      };
      
    case 'expandTask':
      return {
        tasksJsonPath,
        id: apiArgs.id || apiArgs.taskId,  // expandTask expects 'id'
        num: apiArgs.numSubtasks || apiArgs.num || 5,  // expandTask expects 'num'
        research: apiArgs.research || apiArgs.useResearch || false,  // expandTask expects 'research'
        prompt: apiArgs.prompt,
        force: apiArgs.force,
        projectRoot
      };
      
    case 'clearSubtasks':
      return {
        tasksJsonPath,
        taskId: apiArgs.taskId
      };
      
    case 'addSubtask':
      return {
        tasksJsonPath,
        id: apiArgs.parentTaskId,  // addSubtask expects 'id' not 'parentTaskId'
        title: apiArgs.title,
        description: apiArgs.description
      };
      
    case 'updateSubtaskById':
      return {
        tasksJsonPath,
        parentTaskId: apiArgs.parentTaskId,
        subtaskId: apiArgs.subtaskId,
        title: apiArgs.title,
        description: apiArgs.description
      };
      
    case 'removeSubtask':
      return {
        tasksJsonPath,
        parentTaskId: apiArgs.parentTaskId,
        subtaskId: apiArgs.subtaskId
      };
      
    case 'addDependency':
      return {
        tasksJsonPath,
        id: apiArgs.taskId,  // addDependency expects 'id' not 'taskId'
        dependsOn: apiArgs.dependencyId  // expects 'dependsOn' not 'dependencyId'
      };
      
    case 'removeDependency':
      return {
        tasksJsonPath,
        taskId: apiArgs.taskId,
        dependencyId: apiArgs.dependencyId
      };
      
    case 'validateDependencies':
      return {
        tasksJsonPath,
        autoFix: apiArgs.autoFix || false
      };
      
    case 'fixDependencies':
      return {
        tasksJsonPath
      };
      
    case 'nextTask':
      return {
        tasksJsonPath
      };
      
    case 'analyzeTaskComplexity':
      return {
        tasksJsonPath,
        taskId: apiArgs.taskId,
        session: apiArgs.session
      };
      
    case 'complexityReport':
      return {
        tasksJsonPath
      };
      
    case 'generateTaskFiles':
      return {
        tasksJsonPath,
        projectRoot
      };
      
    case 'expandAllTasks':
      return {
        tasksJsonPath,
        session: apiArgs.session
      };
      
    case 'initializeProject':
      return {
        ...apiArgs,
        projectRoot: apiArgs.projectPath || projectRoot
      };
      
    default:
      return { ...commonArgs, ...apiArgs };
  }
}