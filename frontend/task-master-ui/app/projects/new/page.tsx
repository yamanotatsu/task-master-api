'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
	ArrowLeft,
	ArrowRight,
	Check,
	MessageSquare,
	FileText,
	Settings2,
	ListChecks,
	Bot
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
import { TaskCandidateEditor } from '@/components/project/TaskCandidateEditor';
import { taskCandidateStorage } from '@/lib/localStorage';
import type { TaskCandidate } from '@/components/project/TaskCandidateCard';

type Step = 1 | 2 | 3 | 4;
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
	console.log('currentStep', currentStep);
	const [loading, setLoading] = useState(false);
	const [sessionId] = useState(() => `session_${Date.now()}_${Math.random()}`);

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

	// Step 4 State
	const [taskCandidates, setTaskCandidates] = useState<TaskCandidate[]>([]);

	// Initialize from localStorage on mount
	useEffect(() => {
		// Clear old sessions when starting new project
		taskCandidateStorage.clearOldSessions();
	}, []);


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

	const handleNextStep = async () => {
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

		if (currentStep === 3) {
			console.log('hey generate tasks');
			// Generate task candidates
			try {
				setLoading(true);
				// APIメソッドの直前にログ追加
				console.log('About to call API with:', {
					prd_content: prdContent,
					target_task_count: taskCount,
					use_research_mode: includeResearch,
					projectName
				});
				const result = await api.generateTasksPreview({
					prd_content: prdContent,
					target_task_count: taskCount,
					use_research_mode: includeResearch,
					projectName
				});

				if (result && result.tasks) {
					setTaskCandidates(result.tasks);
					setCurrentStep(4);
				} else {
					throw new Error('Invalid response structure');
				}
			} catch (error) {
				console.error('Failed to generate tasks:', error);
				toast.error('タスクの生成に失敗しました');
			} finally {
				setLoading(false);
			}
		} else if (currentStep < 4) {
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

	const handleConfirmTasks = async (finalTasks: TaskCandidate[]) => {
		try {
			setLoading(true);

			// Create project and tasks in batch
			const result = await api.createProjectWithTasks({
				projectName,
				projectDescription: '',
				prdContent,
				deadline: undefined,
				tasks: finalTasks.map((task) => ({
					tempId: task.tempId,
					title: task.title,
					description: task.description,
					details: task.details,
					test_strategy: task.test_strategy,
					priority: task.priority,
					order: task.order
				}))
			});

			// Clear localStorage after successful creation
			taskCandidateStorage.remove(sessionId);

			toast.success('プロジェクトが作成されました');
			router.push(`/projects/${result.project.id}`);
		} catch (error) {
			console.error('Failed to create project:', error);
			toast.error('プロジェクトの作成に失敗しました');
		} finally {
			setLoading(false);
		}
	};

	const stepConfig = {
		1: {
			title: 'PRDを入力',
			icon: FileText,
			description: 'プロジェクトの要件を記入'
		},
		2: {
			title: 'AIと対話',
			icon: MessageSquare,
			description: 'AIが詳細を確認'
		},
		3: {
			title: '設定確認',
			icon: Settings2,
			description: 'タスク数を調整'
		},
		4: {
			title: 'タスク編集',
			icon: ListChecks,
			description: '生成タスクを確認'
		}
	};

	return (
		<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
			{loading && (
				<LoadingOverlay
					message={
						currentStep === 3 ? 'タスクを生成中...' : 'プロジェクトを作成中...'
					}
				/>
			)}

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

				<h1 className="text-2xl font-bold mb-6">新規プロジェクト</h1>

				{/* Step Indicator - Simplified */}
				<div className="flex items-center justify-center gap-2 mb-8">
					{[1, 2, 3, 4].map((step) => {
						const config = stepConfig[step as Step];
						const Icon = config.icon;
						const isActive = step === currentStep;
						const isCompleted = step < currentStep;

						return (
							<div key={step} className="flex items-center">
								<div
									className={cn(
										'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300',
										isActive && 'bg-primary text-white scale-110',
										isCompleted && 'bg-green-500 text-white',
										!isActive && !isCompleted && 'bg-gray-100 text-gray-400'
									)}
								>
									{isCompleted ? (
										<Check className="h-6 w-6" />
									) : (
										<Icon className="h-6 w-6" />
									)}
								</div>
								{step < 4 && (
									<div
										className={cn(
											'w-12 h-0.5 transition-all duration-300',
											step < currentStep ? 'bg-green-500' : 'bg-gray-200'
										)}
									/>
								)}
							</div>
						);
					})}
				</div>
				
				{/* Current Step Title */}
				<div className="text-center mb-8">
					<h2 className="text-2xl font-bold mb-2">{stepConfig[currentStep].title}</h2>
					<p className="text-gray-500">{stepConfig[currentStep].description}</p>
				</div>
			</div>

			{/* Step Content */}
			{currentStep === 1 && (
				<div className="max-w-2xl mx-auto">
					<Card className="border-2">
						<CardContent className="pt-6 space-y-6">
							{/* Visual Icon */}
							<div className="flex justify-center mb-6">
								<div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
									<FileText className="w-10 h-10 text-primary" />
								</div>
							</div>
							
							<div>
								<label className="block text-sm font-medium mb-2">
									プロジェクト名
								</label>
								<Input
									value={projectName}
									onChange={(e) => setProjectName(e.target.value)}
									placeholder="例: ECサイトリニューアル"
									className="w-full text-lg"
									autoFocus
								/>
							</div>

							<div>
								<label className="block text-sm font-medium mb-2">
									PRD（要件）
								</label>
								<Textarea
									value={prdContent}
									onChange={(e) => {
										setPrdContent(e.target.value);
										checkPRDQuality(e.target.value);
									}}
									placeholder="プロジェクトの要件を記入してください..."
									className="min-h-[300px] text-sm"
								/>
								{prdContent && (
									<div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
										<Check className="w-3 h-3 text-green-500" />
										{prdContent.length}文字入力済み
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			{currentStep === 2 && (
				<div className="max-w-3xl mx-auto">
					<Card className="border-2">
						<CardContent className="pt-6">
							{/* Visual Icon */}
							<div className="flex justify-center mb-6">
								<div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
									<MessageSquare className="w-10 h-10 text-primary" />
								</div>
							</div>
							
							{/* Chat Interface */}
							<div className="space-y-4">
								<div className="h-[400px] overflow-y-auto space-y-3 p-4 bg-gray-50 rounded-lg">
									{messages.length === 0 ? (
										<div className="text-center text-gray-500 mt-16">
											<Bot className="w-12 h-12 mx-auto mb-4 text-gray-300" />
											<p>AIがPRDを分析中...</p>
										</div>
									) : (
										messages.map((message) => (
											<div
												key={message.id}
												className={cn(
													'flex',
													message.role === 'user' ? 'justify-end' : 'justify-start'
												)}
											>
												<div
													className={cn(
														'max-w-[80%] px-4 py-3 rounded-2xl',
														message.role === 'user'
															? 'bg-primary text-white'
															: 'bg-white border shadow-sm'
													)}
												>
													<p className="text-sm whitespace-pre-wrap">{message.content}</p>
												</div>
											</div>
										))
									)}
								</div>
								
								<div className="flex gap-2">
									<Input
										value={inputMessage}
										onChange={(e) => setInputMessage(e.target.value)}
										onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
										placeholder="質問を入力..."
										className="flex-1"
									/>
									<Button onClick={handleSendMessage} size="icon">
										<ArrowRight className="h-4 w-4" />
									</Button>
								</div>
								
								{/* Simple Quality Indicator */}
								{prdQuality.score > 0 && (
									<div className="mt-4 p-3 bg-gray-50 rounded-lg">
										<div className="flex items-center justify-between mb-2">
											<span className="text-sm text-gray-600">PRD品質</span>
											<span className="text-sm font-bold text-primary">{prdQuality.score}%</span>
										</div>
										<div className="w-full bg-gray-200 rounded-full h-2">
											<div
												className={cn(
													'h-2 rounded-full transition-all duration-500',
													prdQuality.score >= 75 ? 'bg-green-500' :
													prdQuality.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
												)}
												style={{ width: `${prdQuality.score}%` }}
											/>
										</div>
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			{currentStep === 3 && (
				<div className="max-w-xl mx-auto">
					<Card className="border-2">
						<CardContent className="pt-6">
							{/* Visual Icon */}
							<div className="flex justify-center mb-6">
								<div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
									<Settings2 className="w-10 h-10 text-primary animate-spin-slow" />
								</div>
							</div>
							
							{/* Task Count - Big Visual */}
							<div className="text-center mb-8">
								<p className="text-sm text-gray-500 mb-2">タスク数</p>
								<div className="text-6xl font-bold text-primary mb-4">
									{taskCount}
								</div>
								<Slider
									value={[taskCount]}
									onValueChange={(value) => {
										setTaskCount(value[0]);
									}}
									min={5}
									max={20}
									step={1}
									className="w-full"
								/>
							</div>
							
							{/* Research Option */}
							<div className="flex items-center justify-center space-x-2">
								<Checkbox
									id="research"
									checked={includeResearch}
									onCheckedChange={(checked) => setIncludeResearch(checked as boolean)}
								/>
								<label htmlFor="research" className="text-sm cursor-pointer">
									最新技術を調査
								</label>
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Step 4: Task Candidate Editor */}
			{currentStep === 4 && (
				<TaskCandidateEditor
					sessionId={sessionId}
					projectName={projectName}
					projectDescription=""
					prdContent={prdContent}
					deadline={undefined}
					initialTasks={taskCandidates}
					onConfirm={handleConfirmTasks}
					onBack={() => setCurrentStep(3)}
				/>
			)}

			{/* Navigation Buttons */}
			{currentStep < 4 && (
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
							onClick={handleNextStep}
							disabled={loading}
							className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
						>
							タスクを生成
							<ArrowRight className="ml-2 h-4 w-4" />
						</Button>
					)}
				</div>
			)}
		</div>
	);
}

export default withAuth(NewProjectPage);
