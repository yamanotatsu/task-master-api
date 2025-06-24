import express from 'express';
import { generateTextService } from '../../scripts/modules/ai-services-unified.js';
import { logger } from '../utils/logger.js';
import { PRDAnalyzer } from '../services/prd-analyzer.js';

const router = express.Router();

// POST /api/v1/prd-dialogue/analyze - Analyze PRD and generate response
router.post('/analyze', async (req, res) => {
	try {
		const { prdContent, messages = [], userMessage } = req.body;

		if (!prdContent || !userMessage) {
			return res.status(400).json({
				success: false,
				error: {
					code: 'MISSING_REQUIRED_FIELDS',
					message: 'prdContent and userMessage are required'
				}
			});
		}

		// Analyze current PRD
		const analysis = PRDAnalyzer.analyze(prdContent);

		// Build conversation context
		const conversationContext = messages
			.map((msg) => `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}`)
			.join('\n\n');

		// Generate prompt based on missing requirements
		const prompt = `あなたは、プロダクト要件定義書（PRD）の作成を支援するAIアシスタントです。

現在のPRD:
${prdContent}

これまでの会話:
${conversationContext}

ユーザーの最新メッセージ: ${userMessage}

PRD分析結果:
- 全体的な完成度: ${analysis.overallScore}%
- 不足している項目: ${analysis.missingRequirements.join(', ')}

ユーザーの回答を踏まえて、以下の点に注意して応答してください：
1. ユーザーの回答内容を理解し、PRDに反映すべき情報を整理する
2. まだ不足している情報がある場合は、自然な流れで次の質問をする
3. PRDの品質向上のための具体的な提案をする

応答は親切でプロフェッショナルなトーンで、具体的かつ実用的な内容にしてください。`;

		// Debug: Log prompt
		logger.info('PRD Dialogue - Prompt:', {
			prompt: prompt.substring(0, 500) + '...',
			fullPromptLength: prompt.length
		});

		// Generate AI response
		const response = await generateTextService({
			role: 'chat',
			prompt,
			commandName: 'prd-dialogue',
			outputType: 'api'
		});

		// Debug: Log response
		logger.info('PRD Dialogue - Response:', {
			response: response.mainResult?.substring(0, 500) + '...',
			fullResponseLength: response.mainResult?.length
		});

		// Generate suggested PRD update
		const updatePrompt = `現在のPRD:
${prdContent}

ユーザーからの新しい情報:
${userMessage}

上記の情報を踏まえて、PRDに追加すべき内容を提案してください。
既存の内容は保持し、新しい情報を適切なセクションに追加する形で提案してください。
提案は具体的で、すぐにPRDに組み込める形式にしてください。`;

		// Debug: Log update prompt
		logger.info('PRD Update - Prompt:', {
			prompt: updatePrompt.substring(0, 500) + '...',
			fullPromptLength: updatePrompt.length
		});

		const prdUpdateResponse = await generateTextService({
			role: 'main',
			prompt: updatePrompt,
			commandName: 'prd-update',
			outputType: 'api'
		});

		// Debug: Log update response
		logger.info('PRD Update - Response:', {
			response: prdUpdateResponse.mainResult?.substring(0, 500) + '...',
			fullResponseLength: prdUpdateResponse.mainResult?.length
		});

		res.json({
			success: true,
			data: {
				aiResponse: response.mainResult,
				suggestedPrdUpdate: prdUpdateResponse.mainResult,
				analysis: {
					overallScore: analysis.overallScore,
					sections: analysis.sections,
					missingRequirements: analysis.missingRequirements,
					suggestions: analysis.suggestions
				}
			}
		});
	} catch (error) {
		logger.error('PRD dialogue error:', error);
		res.status(500).json({
			success: false,
			error: {
				code: 'PRD_DIALOGUE_ERROR',
				message: 'Failed to process PRD dialogue',
				details: error.message
			}
		});
	}
});

// POST /api/v1/prd-dialogue/generate-final-prd - Generate final PRD with proper structure
router.post('/generate-final-prd', async (req, res) => {
	try {
		const { prdContent, messages = [] } = req.body;

		if (!prdContent) {
			return res.status(400).json({
				success: false,
				error: {
					code: 'MISSING_REQUIRED_FIELDS',
					message: 'prdContent is required'
				}
			});
		}

		// Build complete conversation context
		const conversationContext = messages
			.map((msg) => `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}`)
			.join('\n\n');

		// Generate final PRD with proper structure
		const prompt = `初期PRD:
${prdContent}

対話履歴:
${conversationContext}

上記の初期PRDと対話履歴を基に、以下の形式で完成度の高いPRDをマークダウン形式で作成してください：

## ✅ **概要セクション**

### Overview（概要）
プロジェクトの目的、背景、解決したい問題、価値提案を簡潔に記述

### Core Features（主要機能）
主要な機能を箇条書きで列挙し、各機能の簡単な説明を含める

### User Experience（ユーザー体験）
ユーザーがシステムをどのように使用するか、主要なユーザーフローを記述

## ✅ **技術仕様セクション**

### Technical Architecture（技術アーキテクチャ）

#### System Components（システム構成）
システムの主要コンポーネントとその役割

#### Data Model（データモデル）
主要なデータエンティティとその関係性

#### APIs & Integrations（APIと統合）
必要なAPIエンドポイントと外部サービスとの統合

#### Infrastructure（インフラ）
デプロイ環境、スケーラビリティ要件

#### Libraries（使用ライブラリ）
使用する主要なライブラリとフレームワーク

## ✅ **開発ロードマップ**

### Development Roadmap（開発手順・MVP要件）
MVP（最小実行可能製品）の要件と段階的な開発計画

### Future Enhancements（将来の拡張）
将来的に追加を検討する機能や改善点

## ✅ **論理的依存関係**

### Logical Dependency Chain（実装順の依存関係）
機能間の依存関係と推奨される実装順序

## ✅ **リスクと対策**

### Risks and Mitigations（リスクとその軽減策）
想定されるリスクとその対策

## ✅ **付録**

### Appendix（補足情報）
データストア構造の例、API仕様の詳細など、補足的な技術情報

---

対話で得られた情報をすべて統合し、実装可能で明確なPRDを作成してください。各セクションは具体的で実用的な内容にしてください。`;

		const response = await generateTextService({
			role: 'chat',
			prompt,
			commandName: 'prd-finalize',
			outputType: 'api'
		});

		res.json({
			success: true,
			data: {
				finalPrd: response.mainResult
			}
		});
	} catch (error) {
		logger.error('PRD finalize error:', error);
		res.status(500).json({
			success: false,
			error: {
				code: 'PRD_FINALIZE_ERROR',
				message: 'Failed to finalize PRD',
				details: error.message
			}
		});
	}
});

export default router;
