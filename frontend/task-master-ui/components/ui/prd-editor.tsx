"use client";

import { useState, useEffect, useCallback } from "react";
import { Sparkles, Save, FileText, AlertCircle, Lightbulb, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PRDEditorProps {
  initialContent?: string;
  onSave?: (content: string) => void;
  onContentChange?: (content: string) => void;
  aiAssistEnabled?: boolean;
  autoSaveInterval?: number; // ミリ秒
  className?: string;
}

interface AIAssistSuggestion {
  id: string;
  type: "improvement" | "missing" | "quality";
  title: string;
  description: string;
  action?: () => void;
}

export function PRDEditor({
  initialContent = "",
  onSave,
  onContentChange,
  aiAssistEnabled = true,
  autoSaveInterval = 30000, // 30秒
  className,
}: PRDEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [lastSavedContent, setLastSavedContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<AIAssistSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // PRDテンプレート
  const prdTemplate = `# プロジェクト名

## 1. 背景と目的
### 1.1 背景
現在の課題や状況を記載

### 1.2 目的
このプロジェクトで達成したいゴール

## 2. 機能要件
### 2.1 主要機能
- 機能1: 説明
- 機能2: 説明
- 機能3: 説明

### 2.2 ユーザーストーリー
- ユーザーとして、〜したい、なぜなら〜だから
- 管理者として、〜したい、なぜなら〜だから

## 3. 非機能要件
### 3.1 パフォーマンス要件
- レスポンス時間: X秒以内
- 同時接続数: X人

### 3.2 セキュリティ要件
- 認証方式
- データ暗号化

### 3.3 可用性要件
- 稼働率: 99.9%
- バックアップ頻度

## 4. 技術要件
### 4.1 技術スタック
- フロントエンド: 
- バックエンド: 
- データベース: 
- インフラ: 

### 4.2 制約事項
- 既存システムとの連携
- 使用可能なリソース

## 5. スケジュール
### 5.1 マイルストーン
- Phase 1: 基本機能実装 (X週間)
- Phase 2: 拡張機能実装 (X週間)
- Phase 3: テスト・改善 (X週間)

## 6. リスクと対策
### 6.1 技術的リスク
- リスク: 対策

### 6.2 ビジネスリスク
- リスク: 対策`;

  // コンテンツ分析
  const analyzeContent = useCallback((text: string) => {
    if (!aiAssistEnabled || !text.trim()) return;

    setIsAnalyzing(true);
    const newSuggestions: AIAssistSuggestion[] = [];

    // 背景・目的のチェック
    if (!text.includes("背景") || text.match(/背景[\s\S]{0,50}(現在|課題|状況)/i) === null) {
      newSuggestions.push({
        id: "bg-missing",
        type: "missing",
        title: "背景情報が不足しています",
        description: "プロジェクトの背景となる課題や現状を追加することをお勧めします",
      });
    }

    // 機能要件のチェック
    if (!text.includes("機能要件") || !text.includes("機能")) {
      newSuggestions.push({
        id: "features-missing",
        type: "missing",
        title: "機能要件が不明確です",
        description: "具体的な機能要件を箇条書きで追加してください",
      });
    }

    // ユーザーストーリーのチェック
    if (!text.match(/ユーザー|user.*story|として.*したい/i)) {
      newSuggestions.push({
        id: "user-story",
        type: "improvement",
        title: "ユーザーストーリーを追加",
        description: "「〜として、〜したい」形式でユーザー視点の要件を追加すると良いでしょう",
      });
    }

    // 技術スタックのチェック
    if (!text.match(/技術|tech.*stack|フロントエンド|バックエンド/i)) {
      newSuggestions.push({
        id: "tech-stack",
        type: "missing",
        title: "技術仕様が不明です",
        description: "使用する技術スタックを明記してください",
      });
    }

    // 品質向上の提案
    if (text.length < 500) {
      newSuggestions.push({
        id: "content-length",
        type: "quality",
        title: "より詳細な記述を推奨",
        description: "PRDが簡潔すぎる可能性があります。各セクションをより詳細に記述することで、タスク生成の精度が向上します",
      });
    }

    setSuggestions(newSuggestions);
    setIsAnalyzing(false);
  }, [aiAssistEnabled]);

  // 内容変更時の処理
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    onContentChange?.(newContent);
    
    // デバウンスして分析
    const timeoutId = setTimeout(() => {
      analyzeContent(newContent);
    }, 1000);

    return () => clearTimeout(timeoutId);
  };

  // 保存処理
  const handleSave = async () => {
    if (content === lastSavedContent) {
      toast.info("変更はありません");
      return;
    }

    setIsSaving(true);
    try {
      await onSave?.(content);
      setLastSavedContent(content);
      toast.success("保存しました");
    } catch (error) {
      toast.error("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  // 自動保存
  useEffect(() => {
    if (!autoSaveInterval || !onSave) return;

    const intervalId = setInterval(() => {
      if (content !== lastSavedContent) {
        handleSave();
      }
    }, autoSaveInterval);

    return () => clearInterval(intervalId);
  }, [content, lastSavedContent, autoSaveInterval]);

  // AI生成機能
  const handleAIGenerate = () => {
    toast.info("AI生成機能は現在開発中です");
  };

  const handleAIImprove = () => {
    toast.info("AI改善提案機能は現在開発中です");
  };

  const insertTemplate = () => {
    setContent(prdTemplate);
    handleContentChange(prdTemplate);
  };

  const hasUnsavedChanges = content !== lastSavedContent;

  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-4 gap-6", className)}>
      {/* エディター本体 */}
      <div className="lg:col-span-3">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>PRD作成</CardTitle>
              <div className="flex items-center gap-2">
                {hasUnsavedChanges && (
                  <span className="text-sm text-muted-foreground">未保存の変更</span>
                )}
                {autoSaveInterval > 0 && (
                  <span className="text-xs text-muted-foreground">
                    自動保存: {autoSaveInterval / 1000}秒ごと
                  </span>
                )}
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !hasUnsavedChanges}
                  size="sm"
                >
                  {isSaving ? (
                    <>
                      <div className="spinner mr-2" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      保存
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* ツールバー */}
              <div className="flex items-center gap-2 pb-2 border-b">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={insertTemplate}
                  disabled={content.length > 0}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  テンプレート挿入
                </Button>
                {aiAssistEnabled && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAIGenerate}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      AIで生成
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAIImprove}
                      disabled={!content.trim()}
                    >
                      <Lightbulb className="mr-2 h-4 w-4" />
                      改善提案
                    </Button>
                  </>
                )}
              </div>

              {/* エディター */}
              <div className="relative">
                <Textarea
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="PRDを入力してください..."
                  className="min-h-[600px] font-mono text-sm resize-none"
                />
                <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                  {content.length} 文字
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AIアシストパネル */}
      {aiAssistEnabled && (
        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Sparkles className="mr-2 h-5 w-5" />
                AIアシスト
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isAnalyzing ? (
                <div className="text-center py-8">
                  <div className="spinner mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">分析中...</p>
                </div>
              ) : suggestions.length > 0 ? (
                <div className="space-y-3">
                  {suggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-colors",
                        "hover:border-primary",
                        suggestion.type === "missing" && "border-red-200 bg-red-50",
                        suggestion.type === "improvement" && "border-yellow-200 bg-yellow-50",
                        suggestion.type === "quality" && "border-blue-200 bg-blue-50"
                      )}
                      onClick={suggestion.action}
                    >
                      <div className="flex items-start gap-2">
                        {suggestion.type === "missing" && (
                          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                        )}
                        {suggestion.type === "improvement" && (
                          <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5" />
                        )}
                        {suggestion.type === "quality" && (
                          <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium">{suggestion.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {suggestion.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : content.trim() ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="mx-auto h-12 w-12 mb-2 text-green-500" />
                  <p className="text-sm">PRDは良好です</p>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="mx-auto h-12 w-12 mb-2" />
                  <p className="text-sm">PRDを入力すると分析を開始します</p>
                </div>
              )}

              <div className="mt-6 pt-6 border-t">
                <h4 className="text-sm font-medium mb-3">PRD作成のヒント</h4>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li>• 背景と目的を明確に記載</li>
                  <li>• 機能要件は具体的に</li>
                  <li>• ユーザー視点で要件を定義</li>
                  <li>• 技術的な制約を明記</li>
                  <li>• スケジュールとマイルストーン</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}