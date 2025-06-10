'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
	ArrowLeft,
	ArrowRight,
	Check,
	MessageSquare,
	FileText,
	Settings2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadingOverlay } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuth, withAuth } from '@/lib/auth';

type Step = 1 | 2 | 3;
type ConversationMode = 'interactive' | 'guided';

interface Message {
	id: string;
	role: 'user' | 'ai';
	content: string;
	timestamp: Date;
}

interface PRDQuality {
	hasOverview: boolean;
	hasFeatures: boolean;
	hasTechnicalRequirements: boolean;
	hasUserStories: boolean;
	score: number;
}

function NewProjectPage() {
	const router = useRouter();
	const { currentOrganization } = useAuth();
	const [currentStep, setCurrentStep] = useState<Step>(1);
	const [loading, setLoading] = useState(false);

	// Step 1 State
	const [projectName, setProjectName] = useState('');
	const [prdContent, setPrdContent] = useState('');

	// Step 2 State
	const [conversationMode, setConversationMode] =
		useState<ConversationMode>('guided');
	const [messages, setMessages] = useState<Message[]>([]);
	const [inputMessage, setInputMessage] = useState('');
	const [prdQuality, setPrdQuality] = useState<PRDQuality>({
		hasOverview: false,
		hasFeatures: false,
		hasTechnicalRequirements: false,
		hasUserStories: false,
		score: 0
	});
	const [sectionScores, setSectionScores] = useState<{
		[key: string]: { score: number; missing: string[] };
	}>({});

	// Step 3 State
	const [taskCount, setTaskCount] = useState(10);
	const [includeResearch, setIncludeResearch] = useState(false);
	const [estimatedTime, setEstimatedTime] = useState('2-3週間');

	const updateEstimatedTime = (count: number) => {
		if (count <= 5) setEstimatedTime('1週間');
		else if (count <= 10) setEstimatedTime('2-3週間');
		else if (count <= 15) setEstimatedTime('3-4週間');
		else setEstimatedTime('1ヶ月以上');
	};

	const checkPRDQuality = (content: string) => {
		const quality: PRDQuality = {
			hasOverview: /概要|overview|背景|background/i.test(content),
			hasFeatures: /機能|feature|要件|requirement/i.test(content),
			hasTechnicalRequirements:
				/技術|technical|アーキテクチャ|architecture/i.test(content),
			hasUserStories: /ユーザー|user|シナリオ|scenario|story/i.test(content),
			score: 0
		};

		quality.score =
			[
				quality.hasOverview,
				quality.hasFeatures,
				quality.hasTechnicalRequirements,
				quality.hasUserStories
			].filter(Boolean).length * 25;

		setPrdQuality(quality);
	};

	const handleNextStep = () => {
		if (currentStep === 1) {
			if (!projectName.trim() || !prdContent.trim()) {
				toast.error('プロジェクト名とPRDを入力してください');
				return;
			}
			checkPRDQuality(prdContent);

			// Initialize AI conversation
			const initialMessage: Message = {
				id: Date.now().toString(),
				role: 'ai',
				content:
					conversationMode === 'guided'
						? 'PRDを確認しました。いくつか質問させていただきます。\n\n1. このプロジェクトの主要な目標は何ですか？\n2. 想定されるユーザーは誰ですか？\n3. 最も重要な機能を3つ教えてください。'
						: 'PRDを確認しました。プロジェクトについて何か補足情報があれば教えてください。',
				timestamp: new Date()
			};
			setMessages([initialMessage]);
		}

		if (currentStep < 3) {
			setCurrentStep((prev) => (prev + 1) as Step);
		}
	};

	const handlePrevStep = () => {
		if (currentStep > 1) {
			setCurrentStep((prev) => (prev - 1) as Step);
		}
	};

	const handleSendMessage = async () => {
		if (!inputMessage.trim()) return;

		const userMessage: Message = {
			id: Date.now().toString(),
			role: 'user',
			content: inputMessage,
			timestamp: new Date()
		};

		setMessages([...messages, userMessage]);
		setInputMessage('');

		try {
			// Get session ID from storage or create new project first
			let sessionId = sessionStorage.getItem('currentSessionId');

			if (!sessionId) {
				// Create project first if no session exists
				const projectPath = `/tmp/task-master-projects/${Date.now()}`;
				const { projectId, sessionId: newSessionId } = await api.createProject({
					name: projectName,
					projectPath,
					prdContent,
					deadline: undefined,
					organizationId: currentOrganization?.id
				});
				sessionId = newSessionId;
				sessionStorage.setItem('currentSessionId', sessionId);
				sessionStorage.setItem('currentProjectId', projectId);
			}

			// Send message to AI dialogue API
			const {
				aiResponse,
				prdQualityScore,
				missingRequirements,
				sectionScores: scores
			} = await api.sendAIDialogue(sessionId, inputMessage, conversationMode);

			// Update section scores if available
			if (scores) {
				setSectionScores(scores);
			}

			// Update PRD quality
			setPrdQuality({
				...prdQuality,
				score: prdQualityScore,
				hasOverview: !missingRequirements.includes('概要'),
				hasFeatures: !missingRequirements.includes('機能要件'),
				hasTechnicalRequirements: !missingRequirements.includes('技術スタック'),
				hasUserStories: !missingRequirements.includes('ユーザーストーリー')
			});

			const aiMessage: Message = {
				id: (Date.now() + 1).toString(),
				role: 'ai',
				content: aiResponse,
				timestamp: new Date()
			};

			setMessages((prev) => [...prev, aiMessage]);
		} catch (error) {
			console.error('Failed to send message:', error);
			toast.error('メッセージの送信に失敗しました');
		}
	};

	const handleCreateProject = async () => {
		try {
			setLoading(true);

			// Create project with AI dialogue session
			const projectPath = `/tmp/task-master-projects/${Date.now()}`;
			const { projectId, sessionId } = await api.createProject({
				name: projectName,
				projectPath,
				prdContent,
				deadline: undefined,
				organizationId: currentOrganization?.id
			});

			// Store session ID for future use
			sessionStorage.setItem('currentSessionId', sessionId);

			// Generate tasks from PRD
			await api.generateTasksFromPRD({
				prd_content: prdContent,
				target_task_count: taskCount,
				use_research_mode: includeResearch,
				projectId
			});

			toast.success('プロジェクトが作成されました');
			router.push(`/projects/${projectId}`);
		} catch (error) {
			console.error('Failed to create project:', error);
			toast.error('プロジェクトの作成に失敗しました');
		} finally {
			setLoading(false);
		}
	};

	const stepConfig = {
		1: {
			title: 'PRD入力',
			icon: FileText,
			description: 'プロジェクトの要件を入力してください'
		},
		2: {
			title: 'AI対話',
			icon: MessageSquare,
			description: 'AIと対話して要件を詳細化します'
		},
		3: {
			title: '確認・生成',
			icon: Settings2,
			description: 'タスク生成の設定を確認します'
		}
	};

	return (
		<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
			{loading && <LoadingOverlay message="プロジェクトを作成中..." />}

			{/* Header with Steps */}
			<div className="mb-8">
				<Button
					variant="ghost"
					size="sm"
					onClick={() => router.push('/')}
					className="mb-4"
				>
					<ArrowLeft className="mr-2 h-4 w-4" />
					ダッシュボードに戻る
				</Button>

				<h1 className="text-3xl font-bold mb-8">新規プロジェクト作成</h1>

				{/* Step Indicator */}
				<div className="flex items-center justify-between mb-8">
					{[1, 2, 3].map((step) => {
						const config = stepConfig[step as Step];
						const Icon = config.icon;
						const isActive = step === currentStep;
						const isCompleted = step < currentStep;

						return (
							<div key={step} className="flex items-center flex-1">
								<div className="flex items-center">
									<div
										className={cn(
											'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
											isActive && 'bg-primary text-white',
											isCompleted && 'bg-green-500 text-white',
											!isActive && !isCompleted && 'bg-gray-200 text-gray-500'
										)}
									>
										{isCompleted ? (
											<Check className="h-5 w-5" />
										) : (
											<Icon className="h-5 w-5" />
										)}
									</div>
									<div className="ml-3">
										<p
											className={cn(
												'text-sm font-medium',
												isActive && 'text-primary',
												!isActive && 'text-gray-500'
											)}
										>
											Step {step}: {config.title}
										</p>
										<p className="text-xs text-gray-500">
											{config.description}
										</p>
									</div>
								</div>
								{step < 3 && (
									<div
										className={cn(
											'flex-1 h-1 mx-4',
											step < currentStep ? 'bg-green-500' : 'bg-gray-200'
										)}
									/>
								)}
							</div>
						);
					})}
				</div>
			</div>

			{/* Step Content */}
			{currentStep === 1 && (
				<Card>
					<CardHeader>
						<CardTitle>Step 1: PRD入力</CardTitle>
						<CardDescription>
							プロジェクトの名前と要件定義書（PRD）を入力してください
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<div>
							<label className="block text-sm font-medium mb-2">
								プロジェクト名
							</label>
							<Input
								value={projectName}
								onChange={(e) => setProjectName(e.target.value)}
								placeholder="例: ECサイトリニューアル"
								className="w-full"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium mb-2">
								PRD（製品要求仕様書）
							</label>
							<Textarea
								value={prdContent}
								onChange={(e) => {
									setPrdContent(e.target.value);
									checkPRDQuality(e.target.value);
								}}
								placeholder={`# プロジェクト概要

## 背景と目的
現在のシステムの課題と、このプロジェクトで実現したいことを記載してください。

## 機能要件
- 機能1: 説明
- 機能2: 説明
- 機能3: 説明

## 非機能要件
- パフォーマンス要件
- セキュリティ要件
- 可用性要件

## 技術要件
使用する技術スタックや制約事項を記載してください。`}
								className="min-h-[400px] font-mono text-sm"
							/>
							<p className="text-xs text-gray-500 mt-2">
								Markdown形式で記述できます。詳細な要件を記載するほど、より適切なタスクが生成されます。
							</p>
						</div>
					</CardContent>
				</Card>
			)}

			{currentStep === 2 && (
				<div className="grid grid-cols-3 gap-6">
					<div className="col-span-2">
						<Card className="h-full flex flex-col">
							<CardHeader>
								<CardTitle>Step 2: AI対話</CardTitle>
								<CardDescription>
									AIと対話して要件を詳細化します
								</CardDescription>
								<div className="flex gap-4 mt-4">
									<label className="flex items-center">
										<input
											type="radio"
											value="interactive"
											checked={conversationMode === 'interactive'}
											onChange={() => setConversationMode('interactive')}
											className="mr-2"
										/>
										対話型
									</label>
									<label className="flex items-center">
										<input
											type="radio"
											value="guided"
											checked={conversationMode === 'guided'}
											onChange={() => setConversationMode('guided')}
											className="mr-2"
										/>
										ガイド型
									</label>
								</div>
							</CardHeader>
							<CardContent className="flex-1 flex flex-col">
								<div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 bg-gray-50 rounded-lg">
									{messages.map((message) => (
										<div
											key={message.id}
											className={cn(
												'flex',
												message.role === 'user'
													? 'justify-end'
													: 'justify-start'
											)}
										>
											<div
												className={cn(
													'max-w-[80%] px-4 py-2 rounded-lg',
													message.role === 'user'
														? 'bg-primary text-white'
														: 'bg-gray-200 text-gray-800'
												)}
											>
												<p className="text-sm whitespace-pre-wrap">
													{message.content}
												</p>
												<p className="text-xs opacity-70 mt-1">
													{message.timestamp.toLocaleTimeString('ja-JP')}
												</p>
											</div>
										</div>
									))}
								</div>
								<div className="flex gap-2">
									<Input
										value={inputMessage}
										onChange={(e) => setInputMessage(e.target.value)}
										onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
										placeholder="メッセージを入力..."
										className="flex-1"
									/>
									<Button onClick={handleSendMessage}>送信</Button>
								</div>
							</CardContent>
						</Card>
					</div>

					<div className="space-y-4">
						<Card>
							<CardHeader>
								<CardTitle className="text-lg">PRD品質</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								{/* セクション別スコア */}
								{Object.keys(sectionScores).length > 0 ? (
									<>
										{Object.entries({
											overview: '概要セクション',
											technical: '技術仕様',
											roadmap: '開発ロードマップ',
											dependencies: '論理的依存関係',
											risks: 'リスクと対策',
											appendix: '付録'
										}).map(([key, label]) => {
											const sectionData = sectionScores[key];
											if (!sectionData) return null;

											return (
												<div key={key} className="space-y-1">
													<div className="flex items-center justify-between">
														<span className="text-sm">{label}</span>
														<span className="text-sm font-medium">
															{sectionData.score}%
														</span>
													</div>
													<div className="w-full bg-gray-200 rounded-full h-1.5">
														<div
															className={cn(
																'h-1.5 rounded-full transition-all',
																sectionData.score >= 70
																	? 'bg-green-500'
																	: sectionData.score >= 40
																		? 'bg-yellow-500'
																		: 'bg-red-500'
															)}
															style={{ width: `${sectionData.score}%` }}
														/>
													</div>
													{sectionData.missing.length > 0 && (
														<div className="text-xs text-gray-500 mt-1">
															不足: {sectionData.missing.slice(0, 2).join(', ')}
															{sectionData.missing.length > 2 &&
																` 他${sectionData.missing.length - 2}項目`}
														</div>
													)}
												</div>
											);
										})}
									</>
								) : (
									/* 旧来の表示（sectionScoresがない場合） */
									<>
										<div className="flex items-center justify-between">
											<span className="text-sm">概要</span>
											{prdQuality.hasOverview ? (
												<Check className="h-4 w-4 text-green-500" />
											) : (
												<span className="text-xs text-gray-400">未入力</span>
											)}
										</div>
										<div className="flex items-center justify-between">
											<span className="text-sm">機能要件</span>
											{prdQuality.hasFeatures ? (
												<Check className="h-4 w-4 text-green-500" />
											) : (
												<span className="text-xs text-gray-400">未入力</span>
											)}
										</div>
										<div className="flex items-center justify-between">
											<span className="text-sm">技術要件</span>
											{prdQuality.hasTechnicalRequirements ? (
												<Check className="h-4 w-4 text-green-500" />
											) : (
												<span className="text-xs text-gray-400">未入力</span>
											)}
										</div>
										<div className="flex items-center justify-between">
											<span className="text-sm">ユーザーストーリー</span>
											{prdQuality.hasUserStories ? (
												<Check className="h-4 w-4 text-green-500" />
											) : (
												<span className="text-xs text-gray-400">未入力</span>
											)}
										</div>
									</>
								)}

								<div className="pt-3 border-t">
									<div className="flex items-center justify-between mb-2">
										<span className="text-sm font-medium">総合品質スコア</span>
										<span className="text-lg font-bold text-primary">
											{prdQuality.score}%
										</span>
									</div>
									<div className="w-full bg-gray-200 rounded-full h-2">
										<div
											className="bg-primary h-2 rounded-full transition-all"
											style={{ width: `${prdQuality.score}%` }}
										/>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			)}

			{currentStep === 3 && (
				<Card>
					<CardHeader>
						<CardTitle>Step 3: 確認・生成</CardTitle>
						<CardDescription>
							タスク生成の設定を確認してプロジェクトを作成します
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<div>
							<label className="block text-sm font-medium mb-4">
								タスク分割数
							</label>
							<div className="space-y-4">
								<Slider
									value={[taskCount]}
									onValueChange={(value) => {
										setTaskCount(value[0]);
										updateEstimatedTime(value[0]);
									}}
									min={5}
									max={20}
									step={1}
									className="w-full"
								/>
								<div className="flex justify-between text-sm text-gray-500">
									<span>5タスク</span>
									<span className="text-2xl font-bold text-primary">
										{taskCount}
									</span>
									<span>20タスク</span>
								</div>
							</div>
						</div>

						<div className="flex items-center space-x-2">
							<Checkbox
								id="research"
								checked={includeResearch}
								onCheckedChange={(checked) =>
									setIncludeResearch(checked as boolean)
								}
							/>
							<label
								htmlFor="research"
								className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
							>
								最新の技術動向を調査して提案に含める
							</label>
						</div>

						<div className="bg-gray-50 p-4 rounded-lg">
							<h4 className="font-medium mb-2">推定所要時間</h4>
							<p className="text-2xl font-bold text-primary">{estimatedTime}</p>
							<p className="text-sm text-gray-500 mt-1">
								タスク数と複雑度に基づく推定値
							</p>
						</div>

						<div className="bg-blue-50 p-4 rounded-lg">
							<h4 className="font-medium text-blue-900 mb-2">生成される内容</h4>
							<ul className="space-y-1 text-sm text-blue-700">
								<li>• {taskCount}個の実装タスク</li>
								<li>• 各タスクの詳細な実装手順</li>
								<li>• タスク間の依存関係</li>
								<li>• 推奨される実行順序</li>
								{includeResearch && <li>• 最新技術の調査結果と推奨事項</li>}
							</ul>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Navigation Buttons */}
			<div className="flex justify-between mt-8">
				<Button
					variant="outline"
					onClick={handlePrevStep}
					disabled={currentStep === 1}
				>
					<ArrowLeft className="mr-2 h-4 w-4" />
					戻る
				</Button>

				{currentStep < 3 ? (
					<Button onClick={handleNextStep}>
						次へ
						<ArrowRight className="ml-2 h-4 w-4" />
					</Button>
				) : (
					<Button
						onClick={handleCreateProject}
						disabled={loading}
						className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
					>
						プロジェクトを生成
						<Check className="ml-2 h-4 w-4" />
					</Button>
				)}
			</div>
		</div>
	);
}

export default withAuth(NewProjectPage);
