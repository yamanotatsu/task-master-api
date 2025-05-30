#!/usr/bin/env node

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

const API_URL = process.env.API_URL || 'http://localhost:3002';
const TEST_PROJECT_PATH = path.join(process.cwd(), 'test-project');

// Sample PRD for testing
const samplePRD = `# Test Project

## Overview
A simple test project for API testing.

## Features
- Basic task management
- User authentication
- Data storage

## Requirements
- Node.js backend
- React frontend
- PostgreSQL database`;

// Test utilities
async function makeRequest(method, endpoint, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, options);
    const data = await response.json();
    return { response, data };
  } catch (error) {
    return { error };
  }
}

async function testEndpoint(name, method, endpoint, body = null, expectedStatus = 200) {
  console.log(chalk.yellow(`\nTesting: ${name}`));
  console.log(chalk.gray(`${method} ${endpoint}`));
  
  const { response, data, error } = await makeRequest(method, endpoint, body);
  
  if (error) {
    console.log(chalk.red('❌ Request failed:'), error.message);
    return false;
  }
  
  const success = response.status === expectedStatus;
  
  if (success) {
    console.log(chalk.green(`✅ Success (${response.status})`));
    if (data.data) {
      console.log(chalk.gray(JSON.stringify(data.data, null, 2).substring(0, 200) + '...'));
    }
  } else {
    console.log(chalk.red(`❌ Failed (${response.status} - expected ${expectedStatus})`));
    console.log(chalk.red('Error:'), data.error);
  }
  
  return { success, data };
}

// Clean up test project if it exists
function cleanupTestProject() {
  if (fs.existsSync(TEST_PROJECT_PATH)) {
    fs.rmSync(TEST_PROJECT_PATH, { recursive: true, force: true });
  }
}

// Main test runner
async function runAllTests() {
  console.log(chalk.cyan('🧪 Task Master API - Comprehensive Test Suite\n'));
  
  let testsPassed = 0;
  let totalTests = 0;
  let createdTaskId = null;
  let projectInitialized = false;

  try {
    // 1. Health check
    totalTests++;
    const health = await testEndpoint(
      'Health Check',
      'GET',
      '/health'
    );
    if (health.success) testsPassed++;

    // 2. Initialize project
    totalTests++;
    cleanupTestProject();
    const initProject = await testEndpoint(
      'Initialize Project',
      'POST',
      '/api/v1/projects/initialize',
      {
        projectName: 'test-project',
        projectPath: TEST_PROJECT_PATH,
        template: 'basic'
      },
      201
    );
    if (initProject.success) {
      testsPassed++;
      projectInitialized = true;
      process.env.TASK_PROJECT_ROOT = TEST_PROJECT_PATH;
    }

    // 3. Generate tasks from PRD
    totalTests++;
    const generateTasks = await testEndpoint(
      'Generate Tasks from PRD',
      'POST',
      '/api/v1/generate-tasks-from-prd',
      {
        prd_content: samplePRD,
        target_task_count: 3,
        use_research_mode: false
      }
    );
    if (generateTasks.success) testsPassed++;

    // 4. List tasks
    totalTests++;
    const listTasks = await testEndpoint(
      'List All Tasks',
      'GET',
      '/api/v1/tasks'
    );
    if (listTasks.success) testsPassed++;

    // 5. Create a new task
    totalTests++;
    const createTask = await testEndpoint(
      'Create New Task',
      'POST',
      '/api/v1/tasks',
      {
        title: 'Test Task',
        description: 'A test task created via API',
        priority: 'high',
        details: 'This is a test task with detailed information',
        testStrategy: 'Manual testing'
      },
      201
    );
    if (createTask.success && createTask.data.data?.task) {
      testsPassed++;
      createdTaskId = createTask.data.data.task.id;
    }

    if (createdTaskId) {
      // 6. Get specific task
      totalTests++;
      const getTask = await testEndpoint(
        'Get Specific Task',
        'GET',
        `/api/v1/tasks/${createdTaskId}`
      );
      if (getTask.success) testsPassed++;

      // 7. Update task
      totalTests++;
      const updateTask = await testEndpoint(
        'Update Task',
        'PUT',
        `/api/v1/tasks/${createdTaskId}`,
        {
          title: 'Updated Test Task',
          priority: 'medium'
        }
      );
      if (updateTask.success) testsPassed++;

      // 8. Update task status
      totalTests++;
      const updateStatus = await testEndpoint(
        'Update Task Status',
        'PATCH',
        `/api/v1/tasks/${createdTaskId}/status`,
        {
          status: 'in-progress'
        }
      );
      if (updateStatus.success) testsPassed++;

      // 9. Add subtask
      totalTests++;
      const addSubtask = await testEndpoint(
        'Add Subtask',
        'POST',
        `/api/v1/tasks/${createdTaskId}/subtasks`,
        {
          title: 'Test Subtask',
          description: 'A test subtask'
        },
        201
      );
      if (addSubtask.success) testsPassed++;

      // 10. Expand task
      totalTests++;
      const expandTask = await testEndpoint(
        'Expand Task into Subtasks',
        'POST',
        `/api/v1/tasks/${createdTaskId}/expand`,
        {
          numSubtasks: 3,
          useResearch: false
        }
      );
      if (expandTask.success) testsPassed++;

      // 11. Add dependency
      totalTests++;
      const addDep = await testEndpoint(
        'Add Task Dependency',
        'POST',
        `/api/v1/tasks/${createdTaskId}/dependencies`,
        {
          dependencyId: 1
        }
      );
      if (addDep.success) testsPassed++;

      // 12. Analyze task complexity
      totalTests++;
      const analyzeComplexity = await testEndpoint(
        'Analyze Task Complexity',
        'POST',
        '/api/v1/tasks/analyze-complexity',
        {
          taskId: createdTaskId
        }
      );
      if (analyzeComplexity.success) testsPassed++;

      // 13. Clear subtasks
      totalTests++;
      const clearSubtasks = await testEndpoint(
        'Clear Subtasks',
        'DELETE',
        `/api/v1/tasks/${createdTaskId}/subtasks`
      );
      if (clearSubtasks.success) testsPassed++;

      // 14. Delete task
      totalTests++;
      const deleteTask = await testEndpoint(
        'Delete Task',
        'DELETE',
        `/api/v1/tasks/${createdTaskId}`
      );
      if (deleteTask.success) testsPassed++;
    }

    // 15. Get next task
    totalTests++;
    const nextTask = await testEndpoint(
      'Get Next Task',
      'GET',
      '/api/v1/tasks/next'
    );
    if (nextTask.success) testsPassed++;

    // 16. Validate dependencies
    totalTests++;
    const validateDeps = await testEndpoint(
      'Validate Dependencies',
      'POST',
      '/api/v1/tasks/validate-dependencies',
      {
        autoFix: false
      }
    );
    if (validateDeps.success) testsPassed++;

    // 17. Get complexity report
    totalTests++;
    const complexityReport = await testEndpoint(
      'Get Complexity Report',
      'GET',
      '/api/v1/tasks/complexity-report'
    );
    if (complexityReport.success) testsPassed++;

    // 18. Generate task files
    totalTests++;
    const generateFiles = await testEndpoint(
      'Generate Task Files',
      'POST',
      '/api/v1/projects/generate-task-files'
    );
    if (generateFiles.success) testsPassed++;

    // 19. Test error handling - Invalid task ID
    totalTests++;
    const invalidGet = await testEndpoint(
      'Error Handling - Invalid Task ID',
      'GET',
      '/api/v1/tasks/999999',
      null,
      404
    );
    if (invalidGet.success) testsPassed++;

    // 20. Test validation - Invalid input
    totalTests++;
    const invalidCreate = await testEndpoint(
      'Error Handling - Invalid Input',
      'POST',
      '/api/v1/tasks',
      {
        // Missing required title
        description: 'No title provided'
      },
      400
    );
    if (invalidCreate.success) testsPassed++;

  } catch (error) {
    console.error(chalk.red('\n❌ Test suite failed:'), error);
  } finally {
    // Cleanup
    if (projectInitialized) {
      cleanupTestProject();
    }
  }

  // Summary
  console.log(chalk.cyan('\n📊 Test Summary:'));
  console.log(chalk.white(`Total tests: ${totalTests}`));
  console.log(chalk.green(`Passed: ${testsPassed}`));
  console.log(chalk.red(`Failed: ${totalTests - testsPassed}`));
  
  const passRate = (testsPassed / totalTests * 100).toFixed(1);
  if (testsPassed === totalTests) {
    console.log(chalk.green.bold(`\n✅ All tests passed! (${passRate}%)`));
  } else {
    console.log(chalk.red.bold(`\n❌ Some tests failed (${passRate}% pass rate)`));
  }
}

// Check if API is running
async function checkAPIHealth() {
  try {
    const response = await fetch(`${API_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

// Main
async function main() {
  const apiHealthy = await checkAPIHealth();
  
  if (!apiHealthy) {
    console.error(chalk.red('❌ API server is not running!'));
    console.error(chalk.yellow('Please start the API server first:'));
    console.error(chalk.gray('  npm run api'));
    process.exit(1);
  }
  
  await runAllTests();
}

main();