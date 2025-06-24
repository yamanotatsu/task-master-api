/**
 * PRD Analyzer
 * Analyzes PRD content to determine completeness
 */

export interface PRDSection {
  name: string;
  description: string;
  keywords: string[];
  weight: number;
  isComplete: boolean;
  missingItems?: string[];
}

export interface PRDAnalysisResult {
  sections: {
    overview: PRDSection;
    features: PRDSection;
    technical: PRDSection;
    metrics: PRDSection;
    timeline: PRDSection;
  };
  overallScore: number;
  missingRequirements: string[];
  suggestions: string[];
}

export class PRDAnalyzer {
  private static sections = {
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
  static analyze(prdContent: string): PRDAnalysisResult {
    const result: PRDAnalysisResult = {
      sections: {} as any,
      overallScore: 0,
      missingRequirements: [],
      suggestions: []
    };

    let totalScore = 0;

    // Analyze each section
    for (const [key, section] of Object.entries(this.sections)) {
      const sectionResult = this.analyzeSection(prdContent, section);
      result.sections[key as keyof typeof result.sections] = {
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

    // Generate suggestions
    result.suggestions = this.generateSuggestions(result);

    return result;
  }

  /**
   * Analyze a single section
   */
  private static analyzeSection(
    content: string, 
    section: typeof PRDAnalyzer.sections.overview
  ): { isComplete: boolean; missingItems?: string[] } {
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
  private static generateSuggestions(analysis: PRDAnalysisResult): string[] {
    const suggestions: string[] = [];

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

  /**
   * Generate next AI question based on analysis
   */
  static generateNextQuestion(analysis: PRDAnalysisResult): string | null {
    // Find the most important incomplete section
    const incompleteSections = Object.entries(analysis.sections)
      .filter(([_, section]) => !section.isComplete)
      .sort((a, b) => b[1].weight - a[1].weight);

    if (incompleteSections.length === 0) {
      return null; // All sections complete
    }

    const [key, section] = incompleteSections[0];

    const questions = {
      overview: 'このプロジェクトの主な目的と、解決したい具体的な問題について教えてください。また、想定されるターゲットユーザーは誰ですか？',
      features: 'このシステムの主要な機能を3-5個挙げていただけますか？それぞれの機能について、ユーザーがどのように使うかも含めて説明してください。',
      technical: '技術的な実装について、使用予定のプログラミング言語、フレームワーク、データベースなどを教えてください。',
      metrics: 'このプロジェクトの成功をどのように測定しますか？具体的なKPIや目標値があれば教えてください。',
      timeline: 'プロジェクトの予定スケジュールを教えてください。主要なマイルストーンやリリース予定日はありますか？'
    };

    return questions[key as keyof typeof questions] || null;
  }
}