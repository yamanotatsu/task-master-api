#!/usr/bin/env node

/**
 * Task Master API 監査ログ使用例
 * このスクリプトは監査ログAPIの使用方法を実演します
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080';
const API_KEY = process.env.API_KEY; // 認証が必要な場合

/**
 * APIリクエストのヘルパー関数
 */
async function apiRequest(endpoint, options = {}) {
	const url = `${API_BASE_URL}${endpoint}`;
	const defaultHeaders = {
		'Content-Type': 'application/json'
	};

	if (API_KEY) {
		defaultHeaders['Authorization'] = `Bearer ${API_KEY}`;
	}

	const response = await fetch(url, {
		headers: { ...defaultHeaders, ...(options.headers || {}) },
		...options
	});

	if (!response.ok) {
		throw new Error(
			`API request failed: ${response.status} ${response.statusText}`
		);
	}

	return await response.json();
}

/**
 * 1. 最近の監査ログを取得
 */
async function getRecentAuditLogs() {
	console.log('\n📋 最近の監査ログを取得中...');

	try {
		const result = await apiRequest('/api/v1/audit/logs?page=1&limit=10');

		console.log(
			`✅ 監査ログ取得成功: ${result.data.logs.length}件のログを取得`
		);
		console.log(`📊 総ログ数: ${result.data.pagination.total}`);

		// 最新のログを数件表示
		result.data.logs.slice(0, 3).forEach((log, index) => {
			console.log(`\n${index + 1}. ${log.event_type}`);
			console.log(`   説明: ${log.description}`);
			console.log(
				`   時刻: ${new Date(log.created_at).toLocaleString('ja-JP')}`
			);
			console.log(`   リスク: ${log.risk_level}`);
			if (log.ip_address) console.log(`   IP: ${log.ip_address}`);
		});

		return result;
	} catch (error) {
		console.error('❌ ログ取得エラー:', error.message);
	}
}

/**
 * 2. 認証関連のログをフィルタリング
 */
async function getAuthenticationLogs() {
	console.log('\n🔐 認証関連ログを取得中...');

	try {
		const result = await apiRequest(
			'/api/v1/audit/logs?eventType=auth.login.success&limit=5'
		);

		console.log(
			`✅ 認証ログ取得成功: ${result.data.logs.length}件のログを取得`
		);

		result.data.logs.forEach((log, index) => {
			const metadata = log.metadata || {};
			console.log(`\n${index + 1}. ログイン成功`);
			console.log(`   ユーザー: ${metadata.email || 'Unknown'}`);
			console.log(
				`   時刻: ${new Date(log.created_at).toLocaleString('ja-JP')}`
			);
			console.log(`   IP: ${log.ip_address || 'Unknown'}`);
		});

		return result;
	} catch (error) {
		console.error('❌ 認証ログ取得エラー:', error.message);
	}
}

/**
 * 3. 高リスクイベントを監視
 */
async function getHighRiskEvents() {
	console.log('\n⚠️ 高リスクイベントを確認中...');

	try {
		const result = await apiRequest(
			'/api/v1/audit/logs?riskLevel=high&riskLevel=critical&limit=10'
		);

		console.log(`🚨 高リスクイベント: ${result.data.logs.length}件発見`);

		if (result.data.logs.length === 0) {
			console.log('✅ 高リスクイベントは見つかりませんでした');
		} else {
			result.data.logs.forEach((log, index) => {
				console.log(
					`\n${index + 1}. [${log.risk_level.toUpperCase()}] ${log.event_type}`
				);
				console.log(`   説明: ${log.description}`);
				console.log(
					`   時刻: ${new Date(log.created_at).toLocaleString('ja-JP')}`
				);
				if (log.ip_address) console.log(`   IP: ${log.ip_address}`);
			});
		}

		return result;
	} catch (error) {
		console.error('❌ 高リスクイベント取得エラー:', error.message);
	}
}

/**
 * 4. 監査ログ統計を取得
 */
async function getAuditStatistics() {
	console.log('\n📊 監査ログ統計を取得中...');

	try {
		const result = await apiRequest('/api/v1/audit/statistics');

		const stats = result.data.statistics;
		console.log('✅ 統計情報取得成功:');
		console.log(`📈 総イベント数: ${stats.totalEvents || 0}`);

		if (stats.eventsByType) {
			console.log('\n📋 イベントタイプ別:');
			Object.entries(stats.eventsByType)
				.sort(([, a], [, b]) => b - a)
				.slice(0, 5)
				.forEach(([type, count]) => {
					console.log(`   ${type}: ${count}件`);
				});
		}

		if (stats.eventsByRiskLevel) {
			console.log('\n⚠️ リスクレベル別:');
			Object.entries(stats.eventsByRiskLevel).forEach(([level, count]) => {
				console.log(`   ${level}: ${count}件`);
			});
		}

		return result;
	} catch (error) {
		console.error('❌ 統計取得エラー:', error.message);
	}
}

/**
 * 5. 利用可能なイベントタイプを取得
 */
async function getAvailableEventTypes() {
	console.log('\n🔍 利用可能なイベントタイプを取得中...');

	try {
		const result = await apiRequest('/api/v1/audit/events');

		console.log('✅ イベントタイプ取得成功:');
		console.log(`📝 総イベントタイプ数: ${result.data.eventTypes.length}`);
		console.log(`⚠️ リスクレベル: ${result.data.riskLevels.join(', ')}`);

		console.log('\n📂 カテゴリ別イベント:');
		Object.entries(result.data.categories).forEach(([category, events]) => {
			console.log(`   ${category}: ${events.length}種類`);
			events.slice(0, 3).forEach((event) => {
				console.log(`     - ${event}`);
			});
			if (events.length > 3) {
				console.log(`     ... および${events.length - 3}種類`);
			}
		});

		return result;
	} catch (error) {
		console.error('❌ イベントタイプ取得エラー:', error.message);
	}
}

/**
 * 6. 特定期間のログを検索
 */
async function searchLogsByDateRange() {
	console.log('\n📅 特定期間のログを検索中...');

	// 過去7日間のログを取得
	const endDate = new Date();
	const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

	try {
		const result = await apiRequest(
			`/api/v1/audit/logs?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&limit=5`
		);

		console.log(
			`✅ 期間検索成功: 過去7日間で${result.data.logs.length}件のログを取得`
		);
		console.log(`📊 総件数: ${result.data.pagination.total}`);

		return result;
	} catch (error) {
		console.error('❌ 期間検索エラー:', error.message);
	}
}

/**
 * 7. キーワード検索
 */
async function searchLogsByKeyword() {
	console.log('\n🔍 キーワード検索を実行中...');

	try {
		// "failed"というキーワードでログを検索
		const result = await apiRequest('/api/v1/audit/logs?search=failed&limit=5');

		console.log(
			`✅ キーワード検索成功: "failed"で${result.data.logs.length}件のログを発見`
		);

		result.data.logs.forEach((log, index) => {
			console.log(`\n${index + 1}. ${log.event_type}`);
			console.log(`   説明: ${log.description}`);
			console.log(
				`   時刻: ${new Date(log.created_at).toLocaleString('ja-JP')}`
			);
		});

		return result;
	} catch (error) {
		console.error('❌ キーワード検索エラー:', error.message);
	}
}

/**
 * メイン実行関数
 */
async function main() {
	console.log('🚀 Task Master 監査ログ使用例デモを開始します...');
	console.log(`🌐 API Base URL: ${API_BASE_URL}`);

	try {
		await getRecentAuditLogs();
		await getAuthenticationLogs();
		await getHighRiskEvents();
		await getAuditStatistics();
		await getAvailableEventTypes();
		await searchLogsByDateRange();
		await searchLogsByKeyword();

		console.log('\n✅ 監査ログデモが完了しました！');
		console.log('\n📖 さらなる使用例:');
		console.log('- CSVエクスポート: GET /api/v1/audit/export?format=csv');
		console.log('- 特定ユーザーのログ: GET /api/v1/audit/logs?userId=USER_ID');
		console.log(
			'- IPアドレス別分析: GET /api/v1/audit/logs?ipAddress=192.168.1.100'
		);
		console.log('- 組織別ログ: GET /api/v1/audit/logs?organizationId=ORG_ID');
	} catch (error) {
		console.error('❌ デモ実行中にエラーが発生しました:', error.message);
		process.exit(1);
	}
}

// スクリプトが直接実行された場合にメイン関数を呼び出し
if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch(console.error);
}

export {
	getRecentAuditLogs,
	getAuthenticationLogs,
	getHighRiskEvents,
	getAuditStatistics,
	getAvailableEventTypes,
	searchLogsByDateRange,
	searchLogsByKeyword
};
