"use client"

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Target, BarChart3, Link2, Rocket, Sparkles, TrendingUp, Brain, Zap, Shield } from 'lucide-react';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function Home() {
  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative overflow-hidden pb-16 pt-20 md:pb-20 md:pt-28">
        <div className="absolute inset-0 -z-10 mx-0 max-w-none overflow-hidden">
          <div className="absolute left-1/2 top-0 ml-[-38rem] h-[25rem] w-[81.25rem] bg-gradient-conic from-primary via-primary/50 to-background opacity-20 blur-3xl"></div>
        </div>
        <motion.div
          className="container relative"
          initial="initial"
          animate="animate"
          variants={stagger}
        >
          <motion.div className="mx-auto max-w-3xl text-center" variants={fadeInUp}>
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                タスク管理を
              </span>
              <br />
              <span className="text-foreground">
                次のレベルへ
              </span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              AIパワードのタスク管理システムで、プロジェクトを効率的に管理。
              PRDから自動的にタスクを生成し、複雑な依存関係も簡単に追跡。
            </p>
            <motion.div className="mt-10 flex items-center justify-center gap-4" variants={fadeInUp}>
              <Button asChild size="lg">
                <Link href="/tasks">
                  タスクを管理する
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/prd">
                  PRDから始める
                </Link>
              </Button>
            </motion.div>
          </motion.div>

          {/* Feature Cards */}
          <motion.div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2" variants={stagger}>
            <motion.div variants={fadeInUp}>
              <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                <CardHeader>
                  <Brain className="mb-2 h-8 w-8 text-primary" />
                  <CardTitle className="text-2xl">AIタスク管理</CardTitle>
                  <CardDescription>
                    高度なAIがタスクを分析し、最適な実行順序を提案
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="secondary">
                    <Link href="/tasks">
                      詳しく見る
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="relative overflow-hidden border-green-500/20 bg-gradient-to-br from-green-500/5 to-green-500/10">
                <CardHeader>
                  <Zap className="mb-2 h-8 w-8 text-green-500" />
                  <CardTitle className="text-2xl">PRD自動解析</CardTitle>
                  <CardDescription>
                    要件定義書から自動的にタスクを生成・構造化
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="secondary">
                    <Link href="/prd">
                      今すぐ試す
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="border-t py-16 md:py-24">
        <motion.div
          className="container"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={stagger}
        >
          <motion.div className="mx-auto max-w-3xl text-center" variants={fadeInUp}>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              パワフルな機能
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              プロジェクト管理に必要なすべての機能を搭載
            </p>
          </motion.div>

          <motion.div className="mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3" variants={stagger}>
            {[
              {
                icon: Target,
                title: "タスク優先順位付け",
                description: "重要度と緊急度に基づいて、タスクを自動的に優先順位付け",
                color: "text-red-500"
              },
              {
                icon: BarChart3,
                title: "複雑度分析",
                description: "AIがタスクの複雑さを分析し、必要なリソースを見積もり",
                color: "text-blue-500"
              },
              {
                icon: Link2,
                title: "依存関係追跡",
                description: "タスク間の依存関係を視覚的に管理し、ボトルネックを回避",
                color: "text-green-500"
              },
              {
                icon: Rocket,
                title: "タスク自動展開",
                description: "大きなタスクを自動的にサブタスクに分解",
                color: "text-purple-500"
              },
              {
                icon: Sparkles,
                title: "スマートPRD処理",
                description: "要件定義を即座に実行可能なタスクリストに変換",
                color: "text-yellow-500"
              },
              {
                icon: TrendingUp,
                title: "進捗トラッキング",
                description: "リアルタイムでプロジェクトの進捗を可視化",
                color: "text-indigo-500"
              }
            ].map((feature, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <Card className="h-full transition-shadow hover:shadow-lg">
                  <CardHeader>
                    <feature.icon className={`mb-2 h-8 w-8 ${feature.color}`} />
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="border-t py-16 md:py-24">
        <motion.div
          className="container"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <Card className="mx-auto max-w-4xl bg-gradient-to-r from-primary/10 to-primary/5 p-8 text-center md:p-12">
            <Shield className="mx-auto mb-4 h-12 w-12 text-primary" />
            <h3 className="mb-4 text-3xl font-bold">
              プロジェクトを成功に導く
            </h3>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
              Task Masterで、複雑なプロジェクトも効率的に管理。
              今すぐ始めて、生産性を最大化しましょう。
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/tasks">
                  タスク管理を開始
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/prd">
                  PRDを提出
                </Link>
              </Button>
            </div>
          </Card>
        </motion.div>
      </section>
    </div>
  );
}
