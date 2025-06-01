'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { FileText, Hash, Microscope, Sparkles, AlertCircle, Loader2, Info } from 'lucide-react';

export default function PRDPage() {
  const [prdContent, setPrdContent] = useState('');
  const [taskCount, setTaskCount] = useState(10);
  const [useResearch, setUseResearch] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await api.generateTasksFromPRD({
        prd_content: prdContent,
        target_task_count: taskCount,
        use_research_mode: useResearch,
      });
      
      toast.success('タスクを正常に生成しました！', {
        description: `${taskCount}個のタスクが作成されました`,
      });
      
      router.push('/tasks');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'エラーが発生しました';
      setError(errorMessage);
      toast.error('タスク生成に失敗しました', {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-5xl mx-auto"
    >
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          PRDからタスクを生成
        </h1>
        <p className="text-muted-foreground">
          製品要件定義書を入力して、AIが自動的にタスクを生成します
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                製品要件定義書 (PRD)
              </CardTitle>
              <CardDescription>
                プロジェクトの要件、目標、機能などを詳細に記述してください
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} id="prd-form">
                <div className="space-y-4">
                  <div>
                    <Textarea
                      id="prd"
                      value={prdContent}
                      onChange={(e) => setPrdContent(e.target.value)}
                      className="min-h-[400px] font-mono text-sm"
                      placeholder="例:\n\n# プロジェクト名: タスク管理アプリケーション\n\n## 概要\nチーム向けのタスク管理アプリケーションを開発する。\n\n## 主な機能\n1. タスクの作成・編集・削除\n2. タスクの優先度設定\n3. 期限管理\n4. チームメンバーへの割り当て\n5. 進捗トラッキング\n\n## 技術要件\n- フロントエンド: React/Next.js\n- バックエンド: Node.js\n- データベース: PostgreSQL\n..."
                      required
                    />
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive"
                    >
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">{error}</span>
                    </motion.div>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                生成設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="taskCount" className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Hash className="h-4 w-4" />
                  生成するタスク数
                </label>
                <Input
                  type="number"
                  id="taskCount"
                  min="1"
                  max="100"
                  value={taskCount}
                  onChange={(e) => setTaskCount(parseInt(e.target.value))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  1〜100個のタスクを生成できます
                </p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer p-3 rounded-lg border hover:bg-accent transition-colors">
                  <input
                    type="checkbox"
                    checked={useResearch}
                    onChange={(e) => setUseResearch(e.target.checked)}
                    className="w-4 h-4 text-primary rounded focus:ring-primary"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Microscope className="h-4 w-4" />
                      <span className="text-sm font-medium">リサーチモード</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      より詳細な分析と提案を行います
                    </p>
                  </div>
                </label>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                form="prd-form"
                disabled={isSubmitting || !prdContent.trim()}
                className="w-full"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    タスクを生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    タスクを生成
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                ヒント
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground space-y-2">
                <p>• 要件は具体的に記述してください</p>
                <p>• 技術スタックを明記すると精度が向上します</p>
                <p>• 優先順位や制約事項も含めてください</p>
                <p>• マークダウン形式で構造化すると効果的です</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}