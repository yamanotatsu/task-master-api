#!/usr/bin/env node

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

const API_URL = process.env.API_URL || 'http://localhost:3002';

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
  if (body) {
    console.log(chalk.gray('Body:', JSON.stringify(body, null, 2)));
  }
  
  const { response, data, error } = await makeRequest(method, endpoint, body);
  
  if (error) {
    console.log(chalk.red('❌ Request failed:'), error.message);
    return { success: false };
  }
  
  const success = response.status === expectedStatus;
  
  if (success) {
    console.log(chalk.green(`✅ Success (${response.status})`));
    if (data.data) {
      console.log(chalk.gray('Response:', JSON.stringify(data.data, null, 2)));
    }
  } else {
    console.log(chalk.red(`❌ Failed (${response.status} - expected ${expectedStatus})`));
    console.log(chalk.red('Error:'), JSON.stringify(data.error, null, 2));
  }
  
  return { success, data };
}

// Main test runner
async function runBasicTests() {
  console.log(chalk.cyan('🧪 Task Master API - Basic Features Test\n'));
  
  let testsPassed = 0;
  let totalTests = 0;
  let createdTaskId = null;

  try {
    // 1. Health check
    totalTests++;
    const health = await testEndpoint(
      'Health Check',
      'GET',
      '/health'
    );
    if (health.success) testsPassed++;

    // 2. List tasks (empty)
    totalTests++;
    const listEmpty = await testEndpoint(
      'List Tasks (Empty)',
      'GET',
      '/api/v1/tasks'
    );
    if (listEmpty.success) testsPassed++;

    // 3. Create a new task
    totalTests++;
    const createTask = await testEndpoint(
      'Create New Task',
      'POST',
      '/api/v1/tasks',
      {
        title: 'Implement User Authentication',
        description: 'Add JWT-based authentication to the API',
        priority: 'high',
        details: 'Need to implement login, logout, and token refresh endpoints',
        testStrategy: 'Unit tests for auth logic and integration tests for endpoints'
      },
      201
    );
    if (createTask.success) {
      testsPassed++;
      // Extract task ID from response
      if (createTask.data?.data?.task?.id) {
        createdTaskId = createTask.data.data.task.id;
      } else if (createTask.data?.data?.message) {
        // Try to extract ID from message
        const match = createTask.data.data.message.match(/Task #(\d+)/);
        if (match) {
          createdTaskId = parseInt(match[1]);
        }
      }
    }

    // 4. List tasks (should have one)
    totalTests++;
    const listWithTasks = await testEndpoint(
      'List Tasks (With Tasks)',
      'GET',
      '/api/v1/tasks'
    );
    if (listWithTasks.success && listWithTasks.data?.data?.tasks?.length > 0) {
      testsPassed++;
      // Get the first task ID if we don't have one
      if (!createdTaskId && listWithTasks.data.data.tasks[0]) {
        createdTaskId = listWithTasks.data.data.tasks[0].id;
      }
    }

    if (createdTaskId) {
      console.log(chalk.blue(`\nUsing task ID: ${createdTaskId}`));

      // 5. Get specific task
      totalTests++;
      const getTask = await testEndpoint(
        'Get Specific Task',
        'GET',
        `/api/v1/tasks/${createdTaskId}`
      );
      if (getTask.success) testsPassed++;

      // 6. Update task
      totalTests++;
      const updateTask = await testEndpoint(
        'Update Task',
        'PUT',
        `/api/v1/tasks/${createdTaskId}`,
        {
          title: 'Implement OAuth2 Authentication',
          priority: 'medium'
        }
      );
      if (updateTask.success) testsPassed++;

      // 7. Update task status
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

      // 8. Add subtask
      totalTests++;
      const addSubtask = await testEndpoint(
        'Add Subtask',
        'POST',
        `/api/v1/tasks/${createdTaskId}/subtasks`,
        {
          title: 'Create User Model',
          description: 'Define user schema and database model'
        },
        201
      );
      if (addSubtask.success) testsPassed++;

      // 9. Delete task
      totalTests++;
      const deleteTask = await testEndpoint(
        'Delete Task',
        'DELETE',
        `/api/v1/tasks/${createdTaskId}`
      );
      if (deleteTask.success) testsPassed++;
    }

    // 10. Test validation error
    totalTests++;
    const invalidCreate = await testEndpoint(
      'Test Validation Error',
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
  }

  // Summary
  console.log(chalk.cyan('\n📊 Test Summary:'));
  console.log(chalk.white(`Total tests: ${totalTests}`));
  console.log(chalk.green(`Passed: ${testsPassed}`));
  console.log(chalk.red(`Failed: ${totalTests - testsPassed}`));
  
  const passRate = (testsPassed / totalTests * 100).toFixed(1);
  if (testsPassed === totalTests) {
    console.log(chalk.green.bold(`\n✅ All tests passed! (${passRate}%)`));
    return true;
  } else {
    console.log(chalk.red.bold(`\n❌ Some tests failed (${passRate}% pass rate)`));
    return false;
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
  
  const success = await runBasicTests();
  process.exit(success ? 0 : 1);
}

main();