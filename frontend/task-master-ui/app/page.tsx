"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Calendar, CheckCircle, Clock, TrendingUp, Users, FolderOpen, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { api, Project } from "@/lib/api";
import { Breadcrumb } from "@/components/ui/breadcrumb";

interface DashboardStats {
  todayTasks: number;
  inProgressTasks: number;
  completionRate: number;
  totalProjects: number;
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    todayTasks: 0,
    inProgressTasks: 0,
    completionRate: 0,
    totalProjects: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await api.getProjects();
      setProjects(data);
      
      // 統計情報を計算
      const totalTasks = data.reduce((sum, p) => sum + p.totalTasks, 0);
      const completedTasks = data.reduce((sum, p) => sum + p.completedTasks, 0);
      const inProgressProjects = data.filter(p => p.progress > 0 && p.progress < 100);
      
      setStats({
        todayTasks: 12, // 実際のAPIから取得する場合はここを更新
        inProgressTasks: totalTasks - completedTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        totalProjects: data.length,
      });
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // 最近のプロジェクト（最新5件）
  const recentProjects = projects
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <Breadcrumb />
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
        {/* ウェルカムメッセージ */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Welcome back!</h1>
            <p className="text-muted-foreground mt-1">
              今日も素晴らしい一日にしましょう
            </p>
          </div>
          <Button asChild size="lg" className="shadow-lg button-hover w-full sm:w-auto">
            <Link href="/projects/new">
              <Plus className="mr-2 h-5 w-5" />
              新規プロジェクト
            </Link>
          </Button>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">今日のタスク</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayTasks}</div>
              <p className="text-xs text-muted-foreground">
                期限が今日のタスク
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">進行中</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inProgressTasks}</div>
              <p className="text-xs text-muted-foreground">
                作業中のタスク
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">完了率</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completionRate}%</div>
              <Progress value={stats.completionRate} className="h-2 mt-2" />
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">プロジェクト数</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProjects}</div>
              <p className="text-xs text-muted-foreground">
                アクティブなプロジェクト
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 最近のプロジェクトとクイックアクション */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 最近のプロジェクト */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>最近のプロジェクト</span>
                  <Link href="/projects" className="text-sm text-primary hover:underline">
                    すべて見る
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentProjects.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FolderOpen className="mx-auto h-12 w-12 mb-2" />
                    <p>プロジェクトがありません</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentProjects.map((project) => (
                      <Link
                        key={project.id}
                        href={`/projects/${project.id}`}
                        className="block p-4 rounded-lg border hover:border-primary transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{project.name}</h3>
                          <span className={`text-sm px-2 py-1 rounded-full ${
                            project.progress === 100 
                              ? "bg-green-100 text-green-800" 
                              : "bg-blue-100 text-blue-800"
                          }`}>
                            {project.progress === 100 ? "完了" : "進行中"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>進捗: {Math.round(project.progress)}%</span>
                          <span>{project.completedTasks}/{project.totalTasks} タスク</span>
                        </div>
                        <Progress value={project.progress} className="h-2 mt-2" />
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* クイックアクション */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>クイックアクション</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/tasks/new">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    新規タスク作成
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/reports">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    レポートを見る
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/settings/members">
                    <Users className="mr-2 h-4 w-4" />
                    メンバー管理
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* お知らせ */}
            <Card>
              <CardHeader>
                <CardTitle>お知らせ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium">期限間近のタスクがあります</p>
                      <p className="text-muted-foreground">3件のタスクが今週中に期限を迎えます</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}