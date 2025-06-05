#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const requiredKeys = [
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY', 
  'GOOGLE_API_KEY',
  'PERPLEXITY_API_KEY',
  'XAI_API_KEY',
  'OPENROUTER_API_KEY'
];

const availableKeys = requiredKeys.filter(key => process.env[key]);

if (availableKeys.length === 0) {
  console.error(chalk.red('❌ Error: No API keys found in environment variables.'));
  console.error(chalk.yellow('Please set at least one of the following API keys:'));
  requiredKeys.forEach(key => {
    console.error(chalk.gray(`  - ${key}`));
  });
  console.error(chalk.yellow('\nYou can set them in a .env file or as environment variables.'));
  process.exit(1);
}

// API keys validated

import('./server-db.js').catch(error => {
  console.error(chalk.red('❌ Failed to start server:'), error);
  process.exit(1);
});