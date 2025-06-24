#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ローカル開発用の環境変数ファイルを読み込む
// 優先順位: .env.local → .env → 環境変数
dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config({ path: path.join(__dirname, '.env') });

const requiredKeys = [
	'ANTHROPIC_API_KEY',
	'OPENAI_API_KEY',
	'GOOGLE_API_KEY',
	'PERPLEXITY_API_KEY',
	'XAI_API_KEY',
	'OPENROUTER_API_KEY'
];

const availableKeys = requiredKeys.filter((key) => process.env[key]);

// 開発環境での情報表示
if (process.env.NODE_ENV === 'development') {
	console.log(chalk.blue('🔧 Development mode - API Keys status:'));
	requiredKeys.forEach((key) => {
		const hasKey = !!process.env[key];
		const status = hasKey ? chalk.green('✅') : chalk.red('❌');
		const value = hasKey
			? process.env[key].includes('test') || process.env[key].includes('dummy')
				? chalk.yellow('(test key)')
				: chalk.green('(configured)')
			: chalk.gray('(not set)');
		console.log(`   ${status} ${key} ${value}`);
	});
	console.log('');
}

if (availableKeys.length === 0) {
	console.warn(
		chalk.yellow('⚠️  Warning: No AI API keys found in environment variables.')
	);
	console.warn(
		chalk.yellow('AI機能（タスク生成、展開、更新など）は利用できません。')
	);
	console.warn(
		chalk.blue(
			'基本機能（表示、ステータス変更、依存関係管理など）のみ利用可能です。'
		)
	);
	console.warn(
		chalk.gray('\nAI機能を使用するには以下のAPIキーを設定してください:')
	);
	requiredKeys.forEach((key) => {
		console.warn(chalk.gray(`  - ${key}`));
	});
	console.warn(
		chalk.gray('\n設定方法: .env.local または .env ファイル、または環境変数')
	);
	console.warn(chalk.blue('\n💡 テスト用クイック設定:'));
	console.warn(
		chalk.gray('   echo "ANTHROPIC_API_KEY=test-key" >> api/.env.local')
	);
	console.warn('');
} else {
	console.log(chalk.green('✅ AI機能が利用可能です'));
	console.log(
		chalk.gray(
			`設定済みプロバイダー: ${availableKeys.length}/${requiredKeys.length}`
		)
	);
	console.log('');
}

// API keys validated

import('./server-db.js').catch((error) => {
	console.error(chalk.red('❌ Failed to start server:'), error);
	process.exit(1);
});
