import { generateTextService } from '../../scripts/modules/ai-services-unified.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// PRD sections that need to be filled
const PRD_SECTIONS = {
	overview: {
		name: '概要セクション',
		subsections: [
			'Overview（概要）',
			'Core Features（主要機能）',
			'User Experience（ユーザー体験）'
		],
		weight: 0.2
	},
	technical: {
		name: '技術仕様セクション',
		subsections: [
			'Technical Architecture（技術アーキテクチャ）',
			'System Components（システム構成）',
			'Data Model（データモデル）',
			'APIs & Integrations（APIと統合）',
			'Infrastructure（インフラ）',
			'Libraries（使用ライブラリ）'
		],
		weight: 0.25
	},
	roadmap: {
		name: '開発ロードマップ',
		subsections: [
			'Development Roadmap（開発手順・MVP要件）',
			'Future Enhancements（将来の拡張）'
		],
		weight: 0.2
	},
	dependencies: {
		name: '論理的依存関係',
		subsections: ['Logical Dependency Chain（実装順の依存関係）'],
		weight: 0.15
	},
	risks: {
		name: 'リスクと対策',
		subsections: ['Risks and Mitigations（リスクとその軽減策）'],
		weight: 0.1
	},
	appendix: {
		name: '付録',
		subsections: ['Appendix（補足情報：例としてのデータストア構造）'],
		weight: 0.1
	}
};

/**
 * Analyze PRD content completeness and quality
 * @param {string} prdContent - Current PRD content
 * @param {Array} messages - Conversation history
 * @returns {Object} Analysis result with quality score and missing sections
 */
export async function analyzePRDQuality(prdContent, messages = []) {
	// Combine initial PRD with conversation context
	let fullContext = prdContent;

	// Add relevant conversation context
	for (const msg of messages) {
		if (msg.role === 'user') {
			fullContext += `\n\n追加情報: ${msg.content}`;
		}
	}

	const systemPrompt = `あなたはPRD（製品要求仕様書）の品質を評価する専門家です。
以下のPRD内容を分析し、各セクションの充実度を評価してください。

評価基準:
1. 各セクションが具体的で詳細に記載されているか
2. タスク分割に必要な情報が含まれているか
3. 技術的な実装に必要な情報が明確か
4. 依存関係やリスクが適切に記載されているか

各セクションについて0-100のスコアを付け、不足している具体的な情報を指摘してください。`;

	const userPrompt = `以下のPRD内容を評価してください：

${fullContext}

以下の形式でJSONレスポンスを返してください：
{
  "sectionScores": {
    "overview": { "score": 数値, "missing": ["不足項目1", "不足項目2"] },
    "technical": { "score": 数値, "missing": ["不足項目1", "不足項目2"] },
    "roadmap": { "score": 数値, "missing": ["不足項目1", "不足項目2"] },
    "dependencies": { "score": 数値, "missing": ["不足項目1", "不足項目2"] },
    "risks": { "score": 数値, "missing": ["不足項目1", "不足項目2"] },
    "appendix": { "score": 数値, "missing": ["不足項目1", "不足項目2"] }
  },
  "overallScore": 数値,
  "criticalMissing": ["最も重要な不足情報1", "最も重要な不足情報2"]
}`;

	try {
		const response = await generateTextService({
			role: 'chat',
			systemPrompt,
			prompt: userPrompt,
			commandName: 'analyze-prd-quality',
			outputType: 'api'
		});

		const analysis = JSON.parse(response.mainResult);

		// Calculate weighted overall score
		let weightedScore = 0;
		for (const [section, data] of Object.entries(PRD_SECTIONS)) {
			const sectionScore = analysis.sectionScores[section]?.score || 0;
			weightedScore += sectionScore * data.weight;
		}

		return {
			sectionScores: analysis.sectionScores,
			overallScore: Math.round(weightedScore),
			criticalMissing: analysis.criticalMissing || [],
			missingRequirements: getMissingRequirements(analysis.sectionScores)
		};
	} catch (error) {
		console.error('Error analyzing PRD quality:', error);
		return {
			sectionScores: {},
			overallScore: 0,
			criticalMissing: [],
			missingRequirements: ['分析エラーが発生しました']
		};
	}
}

/**
 * Generate AI response for PRD dialogue
 * @param {Object} params - Parameters for dialogue
 * @returns {Object} AI response and updated quality score
 */
export async function generatePRDDialogueResponse(params) {
	const {
		message,
		mode = 'interactive',
		messages = [],
		initialPRD = ''
	} = params;

	// First analyze current PRD quality
	const qualityAnalysis = await analyzePRDQuality(initialPRD, messages);

	// Build conversation context
	let conversationContext = '';
	for (const msg of messages.slice(-10)) {
		// Last 10 messages for context
		conversationContext += `${msg.role === 'user' ? 'ユーザー' : 'AI'}: ${msg.content}\n\n`;
	}

	// Generate appropriate response based on mode
	let systemPrompt, userPrompt;

	if (mode === 'guided') {
		// Guided mode: Ask specific questions to fill missing sections
		systemPrompt = `あなたは優秀なプロダクトマネージャーです。
ユーザーがプロジェクトのPRDを作成するのを支援してください。
以下の不足情報を埋めるために、具体的で答えやすい質問をしてください。

現在の品質スコア: ${qualityAnalysis.overallScore}%
最も不足している情報: ${qualityAnalysis.criticalMissing.join(', ')}

質問は以下の点に注意してください：
1. 一度に1-2個の具体的な質問に絞る
2. 技術的すぎない、理解しやすい質問にする
3. 例を示して回答しやすくする
4. 進捗を認識させ、励ましの言葉を含める`;

		userPrompt = `これまでの会話:
${conversationContext}

ユーザーの最新メッセージ: ${message}

最も改善が必要なセクション: ${getWeakestSection(qualityAnalysis.sectionScores)}

適切な質問を日本語で生成してください。`;
	} else {
		// Interactive mode: Natural conversation
		systemPrompt = `あなたは優秀なプロダクトマネージャーです。
ユーザーとの自然な対話を通じて、プロジェクトのPRDを充実させてください。
ユーザーの入力から重要な情報を理解し、さらなる詳細化のためのフォローアップを行ってください。

現在の品質スコア: ${qualityAnalysis.overallScore}%`;

		userPrompt = `これまでの会話:
${conversationContext}

ユーザーの最新メッセージ: ${message}

ユーザーのメッセージに適切に応答し、PRDの品質向上につながる情報を引き出してください。`;
	}

	try {
		const response = await generateTextService({
			role: 'chat',
			systemPrompt,
			prompt: userPrompt,
			commandName: 'prd-dialogue',
			outputType: 'api'
		});

		return {
			aiResponse: response.mainResult,
			prdQualityScore: qualityAnalysis.overallScore,
			missingRequirements: qualityAnalysis.missingRequirements,
			sectionScores: qualityAnalysis.sectionScores,
			telemetry: response.telemetryData
		};
	} catch (error) {
		console.error('Error generating dialogue response:', error);
		throw error;
	}
}

/**
 * Generate final PRD in Markdown format
 * @param {string} initialPRD - Initial PRD content
 * @param {Array} messages - Conversation history
 * @returns {string} Complete PRD in Markdown format
 */
export async function generateFinalPRD(initialPRD, messages) {
	// Collect all information from conversation
	let collectedInfo = {
		initial: initialPRD,
		additions: []
	};

	for (const msg of messages) {
		if (msg.role === 'user') {
			collectedInfo.additions.push(msg.content);
		}
	}

	const systemPrompt = `あなたは優秀な技術文書作成者です。
提供された情報を基に、完全で詳細なPRD（製品要求仕様書）をMarkdown形式で作成してください。

以下の構造に従ってください：
1. 概要セクション (Overview, Core Features, User Experience)
2. 技術仕様セクション (Technical Architecture, System Components, Data Model, APIs & Integrations, Infrastructure, Libraries)
3. 開発ロードマップ (Development Roadmap, Future Enhancements)
4. 論理的依存関係 (Logical Dependency Chain)
5. リスクと対策 (Risks and Mitigations)
6. 付録 (Appendix)

各セクションは具体的で、実装に必要な詳細を含めてください。`;

	const userPrompt = `以下の情報を基に、完全なPRDをMarkdown形式で作成してください：

初期PRD:
${collectedInfo.initial}

追加情報:
${collectedInfo.additions.join('\n\n')}

タスク分割に適した、詳細で実装可能なPRDを生成してください。`;

	try {
		const response = await generateTextService({
			role: 'chat',
			systemPrompt,
			prompt: userPrompt,
			commandName: 'generate-final-prd',
			outputType: 'api'
		});

		return response.mainResult;
	} catch (error) {
		console.error('Error generating final PRD:', error);
		throw error;
	}
}

// Helper functions
function getMissingRequirements(sectionScores) {
	const missing = [];
	for (const [section, data] of Object.entries(sectionScores)) {
		if (data.score < 70 && data.missing) {
			missing.push(...data.missing);
		}
	}
	return missing;
}

function getWeakestSection(sectionScores) {
	let weakest = null;
	let lowestScore = 100;

	for (const [section, data] of Object.entries(sectionScores)) {
		if (data.score < lowestScore) {
			lowestScore = data.score;
			weakest = PRD_SECTIONS[section]?.name || PRD_SECTIONS[section] || section;
		}
	}

	return weakest;
}
