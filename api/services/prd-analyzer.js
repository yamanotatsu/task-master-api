/**
 * PRD Analyzer Service
 * Analyzes PRD content to determine completeness
 */

export class PRDAnalyzer {
	static sections = {
		overview: {
			name: '概要',
			description: 'プロジェクトの目的、問題、ターゲットユーザー',
			keywords: [
				'目的', '目標', 'ゴール', '背景', '問題', '課題', 
				'ターゲット', 'ユーザー', '対象', '価値', 'バリュー'
			],
			weight: 0.2
		},
		features: {
			name: '機能要件',
			description: '主要機能、ユーザーストーリー、受け入れ基準',
			keywords: [
				'機能', '要件', 'ストーリー', '基準', 'フィーチャー',
				'動作', '仕様', 'できる', '可能', '実装'
			],
			weight: 0.25
		},
		technical: {
			name: '技術仕様',
			description: '技術スタック、アーキテクチャ、統合要件',
			keywords: [
				'技術', 'スタック', 'アーキテクチャ', 'API', 'データベース',
				'フレームワーク', 'ライブラリ', '統合', 'インフラ', 'セキュリティ'
			],
			weight: 0.2
		},
		metrics: {
			name: '成功指標',
			description: 'KPI、成功の定義、評価基準',
			keywords: [
				'KPI', '指標', '成功', '評価', '測定',
				'メトリクス', '目標値', 'ベンチマーク', '効果', '成果'
			],
			weight: 0.2
		},
		timeline: {
			name: 'タイムライン',
			description: 'マイルストーン、リリース計画、スケジュール',
			keywords: [
				'スケジュール', 'タイムライン', 'マイルストーン', 'リリース', '期限',
				'工程', 'フェーズ', '計画', '日程', '期間'
			],
			weight: 0.15
		}
	};

	/**
	 * Analyze PRD content
	 */
	static analyze(prdContent) {
		const result = {
			sections: {},
			overallScore: 0,
			missingRequirements: [],
			suggestions: []
		};

		let totalScore = 0;

		// Analyze each section
		for (const [key, section] of Object.entries(this.sections)) {
			const sectionResult = this.analyzeSection(prdContent, section);
			result.sections[key] = {
				...section,
				...sectionResult
			};

			if (sectionResult.isComplete) {
				totalScore += section.weight;
			} else {
				result.missingRequirements.push(`${section.name}: ${sectionResult.missingItems?.join(', ') || '詳細が不足'}`);
			}
		}

		result.overallScore = Math.round(totalScore * 100);
		result.suggestions = this.generateSuggestions(result);

		return result;
	}

	/**
	 * Analyze a single section
	 */
	static analyzeSection(content, section) {
		const lowerContent = content.toLowerCase();
		const foundKeywords = section.keywords.filter(keyword => 
			lowerContent.includes(keyword)
		);

		// Consider complete if at least 40% of keywords are found
		const completionRatio = foundKeywords.length / section.keywords.length;
		const isComplete = completionRatio >= 0.4;

		const missingItems = isComplete ? undefined : 
			[`${section.description}についての詳細が不足しています`];

		return { isComplete, missingItems };
	}

	/**
	 * Generate improvement suggestions
	 */
	static generateSuggestions(analysis) {
		const suggestions = [];

		if (!analysis.sections.overview.isComplete) {
			suggestions.push('プロジェクトの目的とターゲットユーザーを明確に記載してください');
		}

		if (!analysis.sections.features.isComplete) {
			suggestions.push('主要機能とユーザーストーリーを具体的に列挙してください');
		}

		if (!analysis.sections.technical.isComplete) {
			suggestions.push('使用する技術スタックとアーキテクチャを記載してください');
		}

		if (!analysis.sections.metrics.isComplete) {
			suggestions.push('成功を測定するためのKPIを定義してください');
		}

		if (!analysis.sections.timeline.isComplete) {
			suggestions.push('プロジェクトのマイルストーンとリリース計画を追加してください');
		}

		return suggestions;
	}
}