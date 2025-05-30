#!/usr/bin/env node

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

const API_URL = process.env.API_URL || 'http://localhost:3002';

// Sample PRD for testing
const samplePRD = `# E-commerce Platform

## Overview
Build a modern e-commerce platform with user authentication, product catalog, and payment processing.

## Features
- User registration and authentication
- Product browsing and search
- Shopping cart functionality
- Secure payment processing
- Order tracking

## Technical Requirements
- Node.js/Express backend
- React frontend
- PostgreSQL database
- JWT authentication
- Stripe payment integration`;

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
    console.log(chalk.gray('Body:', JSON.stringify(body, null, 2).substring(0, 100) + '...'));
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
      console.log(chalk.gray('Response preview:', JSON.stringify(data.data, null, 2).substring(0, 150) + '...'));
    }
  } else {
    console.log(chalk.red(`❌ Failed (${response.status} - expected ${expectedStatus})`));
    console.log(chalk.red('Error:'), JSON.stringify(data.error, null, 2));
  }
  
  return { success, data };
}

// Main test runner
async function runCompleteTest() {
  console.log(chalk.cyan.bold('🚀 Task Master API - Complete Test Suite\n'));
  console.log(chalk.blue('Testing with real Anthropic API key...'));
  
  let testsPassed = 0;
  let totalTests = 0;
  let createdTaskId = null;
  let generatedTasks = [];

  try {
    // 1. Health check
    console.log(chalk.yellow.bold('\n=== Basic Health Check ==='));
    totalTests++;
    const health = await testEndpoint(
      'Health Check',
      'GET',
      '/health'
    );
    if (health.success) testsPassed++;

    // 2. Generate tasks from PRD (with real API)
    console.log(chalk.yellow.bold('\n=== PRD Task Generation (AI) ==='));
    totalTests++;
    const generateTasks = await testEndpoint(
      'Generate Tasks from PRD',
      'POST',
      '/api/v1/generate-tasks-from-prd',
      {
        prd_content: samplePRD,
        target_task_count: 5,
        use_research_mode: false
      }
    );
    if (generateTasks.success && generateTasks.data?.data?.tasks) {
      testsPassed++;
      generatedTasks = generateTasks.data.data.tasks;
      console.log(chalk.green(`Generated ${generatedTasks.length} tasks from PRD`));
    }

    // 3. List all tasks
    console.log(chalk.yellow.bold('\n=== Task Management ==='));
    totalTests++;
    const listTasks = await testEndpoint(
      'List All Tasks',
      'GET',
      '/api/v1/tasks'
    );
    if (listTasks.success) testsPassed++;

    // 4. Create a manual task
    totalTests++;
    const createTask = await testEndpoint(
      'Create Manual Task',
      'POST',
      '/api/v1/tasks',
      {
        title: 'Setup CI/CD Pipeline',
        description: 'Configure GitHub Actions for automated testing and deployment',
        priority: 'high',
        details: 'Setup workflows for testing, linting, and deployment to staging/production',
        testStrategy: 'Verify workflows trigger correctly on push/PR events'
      },
      201
    );
    if (createTask.success) {
      testsPassed++;
    }

    // 5. List tasks again to get IDs
    totalTests++;
    const listWithTasks = await testEndpoint(
      'List Tasks (After Creation)',
      'GET',
      '/api/v1/tasks'
    );
    if (listWithTasks.success && listWithTasks.data?.data?.tasks?.length > 0) {
      testsPassed++;
      createdTaskId = listWithTasks.data.data.tasks[0].id;
      console.log(chalk.blue(`Using task ID: ${createdTaskId}`));
    }

    if (createdTaskId) {
      // 6. Get specific task
      console.log(chalk.yellow.bold('\n=== Individual Task Operations ==='));
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
          title: 'Setup Advanced CI/CD Pipeline',
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
      console.log(chalk.yellow.bold('\n=== Subtask Management ==='));
      totalTests++;
      const addSubtask = await testEndpoint(
        'Add Subtask',
        'POST',
        `/api/v1/tasks/${createdTaskId}/subtasks`,
        {
          title: 'Configure GitHub Actions',
          description: 'Setup workflow files for CI'
        },
        201
      );
      if (addSubtask.success) testsPassed++;

      // 10. Add dependency
      console.log(chalk.yellow.bold('\n=== Dependency Management ==='));
      if (generatedTasks.length > 1) {
        totalTests++;
        const addDep = await testEndpoint(
          'Add Task Dependency',
          'POST',
          `/api/v1/tasks/${createdTaskId}/dependencies`,
          {
            dependencyId: generatedTasks[0].id
          }
        );
        if (addDep.success) testsPassed++;
      }
    }

    // 11. Validate dependencies
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

    // 12. Get next task
    console.log(chalk.yellow.bold('\n=== Task Analysis ==='));
    totalTests++;
    const nextTask = await testEndpoint(
      'Get Next Task',
      'GET',
      '/api/v1/tasks/next'
    );
    if (nextTask.success) testsPassed++;

    // 13. Test error handling
    console.log(chalk.yellow.bold('\n=== Error Handling ==='));
    totalTests++;
    const invalidGet = await testEndpoint(
      'Get Non-existent Task',
      'GET',
      '/api/v1/tasks/999999',
      null,
      404
    );
    if (invalidGet.success) testsPassed++;

    totalTests++;
    const invalidCreate = await testEndpoint(
      'Invalid Task Creation',
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
  console.log(chalk.cyan.bold('\n📊 Test Summary:'));
  console.log(chalk.white(`Total tests: ${totalTests}`));
  console.log(chalk.green(`Passed: ${testsPassed}`));
  console.log(chalk.red(`Failed: ${totalTests - testsPassed}`));
  
  const passRate = (testsPassed / totalTests * 100).toFixed(1);
  if (testsPassed === totalTests) {
    console.log(chalk.green.bold(`\n🎉 All tests passed! (${passRate}%)`));
    console.log(chalk.green('✨ The API is working perfectly with real AI integration!'));
    return true;
  } else {
    console.log(chalk.yellow.bold(`\n⚠️  Some tests failed (${passRate}% pass rate)`));
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
  
  const success = await runCompleteTest();
  process.exit(success ? 0 : 1);
}

main();