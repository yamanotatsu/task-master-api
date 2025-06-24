'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
	ArrowLeft,
	ArrowRight,
	Check,
	MessageSquare,
	FileText,
	ListChecks,
	Bot,
	Loader2
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
import {
	ProjectSessionManager,
	type ProjectSession
} from '@/lib/projectSessionStorage';

type Step = 1 | 2 | 3 | 4;

interface Message {
	id: string;
	role: 'user' | 'ai';
	content: string;
	timestamp: Date;
	isStreaming?: boolean;
}

function NewProjectPage() {
	const router = useRouter();
	const { currentOrganization, session } = useAuth();
	const [loading, setLoading] = useState(false);

	// Load or create project session
	const [projectSession, setProjectSession] = useState<ProjectSession>(() => {
		const existingSession = ProjectSessionManager.load();
		if (existingSession) {
			return existingSession;
		}
		return ProjectSessionManager.createNew();
	});

	// Extract values from session
	const currentStep = projectSession.currentStep as Step;
	const projectName = projectSession.projectName;
	const prdContent = projectSession.prdContent;
	// Don't extract messages as a const - use projectSession.messages directly

	// Local state
	const [inputMessage, setInputMessage] = useState('');
	const [isAIThinking, setIsAIThinking] = useState(false);
	const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
		null
	);
	const [debugMode, setDebugMode] = useState(false); // Debug mode toggle
	const [isGeneratingPRD, setIsGeneratingPRD] = useState(false); // PRD generation state
	const [finalPRD, setFinalPRD] = useState(''); // Final PRD content

	// Step 3 State
	const [taskCount, setTaskCount] = useState(10);
	const [includeResearch, setIncludeResearch] = useState(false);

	// Step 4 State
	const [taskCandidates, setTaskCandidates] = useState<TaskCandidate[]>([]);

	// Helper functions to update session
	const updateProjectName = (name: string) => {
		const updated = { ...projectSession, projectName: name };
		setProjectSession(updated);
		ProjectSessionManager.save(updated);
	};

	const updatePrdContent = (content: string) => {
		const updated = ProjectSessionManager.updatePRD(projectSession, content);
		setProjectSession(updated);
	};

	const updateStep = (step: Step) => {
		const updated = { ...projectSession, currentStep: step };
		setProjectSession(updated);
		ProjectSessionManager.save(updated);
	};

	// Initialize from localStorage on mount
	useEffect(() => {
		// Clear ALL session data when starting new project
		ProjectSessionManager.clearAllSessionData();
		taskCandidateStorage.clearOldSessions();

		// Create a fresh new session
		const newSession = ProjectSessionManager.createNew();
		setProjectSession(newSession);
		// Reset task candidates when starting fresh
		setTaskCandidates([]);
	}, []);

	const handleNextStep = async () => {
		// 既にローディング中の場合は何もしない
		if (loading) {
			return;
		}

		if (currentStep === 1) {
			if (!projectName.trim() || !prdContent.trim()) {
				toast.error('プロジェクト名とPRDを入力してください');
				return;
			}

			// Initialize AI conversation
			const initialMessageContent = `こんにちは！PRDを拝見しました。\n\n${prdContent.substring(0, 200)}${prdContent.length > 200 ? '...' : ''}\n\nこのプロジェクトについて、いくつか確認したいことがあります。まず、メインターゲットユーザーと、彼らが抱えている具体的な課題について詳しく教えていただけますか？`;

			const sessionWithMessage = ProjectSessionManager.addMessage(
				projectSession,
				{
					role: 'ai',
					content: initialMessageContent
				}
			);

			// Update step and session together
			const sessionWithNewStep = { ...sessionWithMessage, currentStep: 2 };
			setProjectSession(sessionWithNewStep);
			ProjectSessionManager.save(sessionWithNewStep);
			return; // Don't continue to the generic step update
		}

		if (currentStep === 3) {
			// タスク生成を別関数として呼び出す
			await handleGenerateTasks();
			return;
		}

		if (currentStep < 4) {
			updateStep((currentStep + 1) as Step);
		}
	};

	const handlePrevStep = () => {
		if (currentStep > 1) {
			updateStep((currentStep - 1) as Step);
		}
	};

	const handleGeneratePRD = async () => {
		setIsGeneratingPRD(true);
		try {
			const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
			const response = await fetch(
				`${apiUrl}/api/v1/prd-dialogue/generate-final-prd`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						prdContent: projectSession.prdContent,
						messages: projectSession.messages
					})
				}
			);

			if (!response.ok) {
				throw new Error('Failed to generate PRD');
			}

			const data = await response.json();
			setFinalPRD(data.data.finalPrd);

			// Add AI message indicating PRD is ready
			const aiMessage = {
				role: 'ai' as const,
				content:
					'PRDを生成しました。次のステップで確認・編集できます。「次へ」ボタンを押してください。'
			};
			const updated = ProjectSessionManager.addMessage(
				projectSession,
				aiMessage
			);
			setProjectSession(updated);
		} catch (error) {
			console.error('Failed to generate PRD:', error);
			toast.error('PRDの生成に失敗しました');
		} finally {
			setIsGeneratingPRD(false);
		}
	};

	const handleGenerateTasks = async () => {
		console.log('🐛 DEBUG: handleGenerateTasks - Start');
		setLoading(true);

		try {
			// Debug projectSession state
			console.log('🐛 DEBUG: projectSession:', projectSession);
			console.log(
				'🐛 DEBUG: projectSession.messages:',
				projectSession.messages
			);
			console.log('🐛 DEBUG: messages type:', typeof projectSession.messages);
			console.log(
				'🐛 DEBUG: is messages array:',
				Array.isArray(projectSession.messages)
			);

			// Debug other parameters
			console.log('🐛 DEBUG: finalPRD:', finalPRD ? 'exists' : 'empty');
			console.log('🐛 DEBUG: prdContent:', prdContent ? 'exists' : 'empty');
			console.log('🐛 DEBUG: projectName:', projectName);
			console.log('🐛 DEBUG: taskCount:', taskCount);

			// Compile conversation history with safety check
			console.log('🐛 DEBUG: About to map conversation history');
			let conversationHistory: Array<{ role: 'user' | 'ai'; content: string }> =
				[];

			if (Array.isArray(projectSession.messages)) {
				conversationHistory = projectSession.messages.map((msg, index) => {
					console.log(`🐛 DEBUG: Processing message ${index}:`, msg);
					return {
						role: msg.role,
						content: msg.content
					};
				});
			} else {
				console.log('🐛 DEBUG: messages is not an array, using empty array');
			}

			console.log(
				'🐛 DEBUG: conversationHistory created:',
				conversationHistory
			);

			// Prepare API call parameters
			const apiParams = {
				prd_content: finalPRD || prdContent,
				target_task_count: taskCount,
				use_research_mode: includeResearch,
				projectName,
				conversation_history: conversationHistory
			};

			console.log('🐛 DEBUG: API parameters:', apiParams);
			console.log('🐛 DEBUG: About to call api.generateTasksPreview');

			const result = await api.generateTasksPreview(apiParams);

			console.log('🐛 DEBUG: API call successful, result:', result);

			if (result && result.tasks) {
				console.log('🐛 DEBUG: Tasks found, updating state');
				setTaskCandidates(result.tasks);
				updateStep(4);
				console.log('🐛 DEBUG: Step updated to 4');
			} else {
				console.log('🐛 DEBUG: Invalid result structure:', result);
				throw new Error('Invalid response structure');
			}
		} catch (error) {
			console.error('🐛 DEBUG: Error in handleGenerateTasks:', error);
			if (error instanceof Error) {
				console.error('🐛 DEBUG: Error stack:', error.stack);
				console.error('🐛 DEBUG: Error message:', error.message);
			}
			toast.error('タスクの生成に失敗しました');
		} finally {
			console.log('🐛 DEBUG: handleGenerateTasks - Finally block');
			setLoading(false);
		}
	};

	const handleSendMessage = async () => {
		if (!inputMessage.trim() || isAIThinking) return;

		// Add user message to session
		const userMessage: Message = {
			id: Date.now().toString(),
			role: 'user',
			content: inputMessage,
			timestamp: new Date()
		};

		const updatedSession = ProjectSessionManager.addMessage(
			projectSession,
			userMessage
		);
		setProjectSession(updatedSession);
		setInputMessage('');
		setIsAIThinking(true);

		try {
			// Call stateless PRD dialogue API
			const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
			const requestBody = {
				prdContent: updatedSession.prdContent,
				messages: updatedSession.messages.slice(0, -1), // Exclude the just-added message
				userMessage: inputMessage
			};

			if (debugMode) {
				console.log(
					'🔧 DEBUG - Full Request Body:',
					JSON.stringify(requestBody, null, 2)
				);
			}

			const response = await fetch(`${apiUrl}/api/v1/prd-dialogue/analyze`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(requestBody)
			});

			if (!response.ok) {
				const errorData = await response.text();
				throw new Error(
					`Failed to send message: ${response.status} ${errorData}`
				);
			}

			// Parse response
			const data = await response.json();

			if (debugMode) {
				console.log('🔧 DEBUG - Full AI Response:', data.data.aiResponse);
				console.log(
					'🔧 DEBUG - Suggested PRD Update:',
					data.data.suggestedPrdUpdate
				);
			}

			// Add AI response to session
			const aiMessage: Message = {
				id: (Date.now() + 1).toString(),
				role: 'ai',
				content: data.data.aiResponse,
				timestamp: new Date()
			};

			const sessionWithAI = ProjectSessionManager.addMessage(
				updatedSession,
				aiMessage
			);

			// Update PRD if suggested
			if (data.data.suggestedPrdUpdate) {
				// Show the suggested update to user (could be a modal or inline)
			}

			// Update completeness status
			if (data.data.analysis) {
				const completeness = {
					overview: data.data.analysis.sections.overview.isComplete,
					features: data.data.analysis.sections.features.isComplete,
					technical: data.data.analysis.sections.technical.isComplete,
					metrics: data.data.analysis.sections.metrics.isComplete,
					timeline: data.data.analysis.sections.timeline.isComplete,
					overall: data.data.analysis.overallScore
				};
				const finalSession = ProjectSessionManager.updateCompleteness(
					sessionWithAI,
					completeness
				);
				setProjectSession(finalSession);
			} else {
				setProjectSession(sessionWithAI);
			}
		} catch (error) {
			if (error instanceof TypeError && error.message === 'Failed to fetch') {
				toast.error(
					'APIサーバーに接続できません。サーバーが起動していることを確認してください。'
				);
			} else {
				toast.error(
					`メッセージの送信に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`
				);
			}
		} finally {
			setIsAIThinking(false);
			setStreamingMessageId(null);
		}
	};

	const handleConfirmTasks = async (finalTasks: TaskCandidate[]) => {
		try {
			setLoading(true);

			const result = await api.createProjectWithTasks({
				projectName,
				projectDescription: '',
				prdContent: finalPRD || prdContent,
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

			// Clear ALL localStorage data after successful creation
			ProjectSessionManager.clearAllSessionData();
			taskCandidateStorage.clearOldSessions();

			toast.success('プロジェクトが作成されました');
			router.push(`/projects/${result.project.id}`);
		} catch (error) {
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
			title: 'PRD確認',
			icon: FileText,
			description: '最終PRDを確認・編集'
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
					<h2 className="text-2xl font-bold mb-2">
						{stepConfig[currentStep].title}
					</h2>
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
									onChange={(e) => updateProjectName(e.target.value)}
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
									onChange={(e) => updatePrdContent(e.target.value)}
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
				<div className="w-full max-w-5xl mx-auto px-4">
					<div className="h-[calc(100vh-280px)]">
						<Card className="h-full flex flex-col">
							<CardHeader className="pb-4">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
											<Bot className="w-5 h-5 text-primary" />
										</div>
										<div>
											<CardTitle>AI アシスタント</CardTitle>
											<CardDescription>
												PRDの改善をサポートします
											</CardDescription>
										</div>
									</div>
									{/* Debug Toggle */}
									<label className="flex items-center gap-2 text-sm text-gray-600">
										<input
											type="checkbox"
											checked={debugMode}
											onChange={(e) => setDebugMode(e.target.checked)}
											className="rounded"
										/>
										Debug
									</label>
								</div>
							</CardHeader>
							<CardContent className="flex-1 flex flex-col p-6">
								{/* Messages Area */}
								<div className="flex-1 overflow-y-auto space-y-4 mb-4">
									{projectSession.messages.map((message) => (
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
													'max-w-[80%] px-4 py-3 rounded-lg',
													message.role === 'user'
														? 'bg-primary text-white'
														: 'bg-gray-100'
												)}
											>
												<p className="text-sm whitespace-pre-wrap">
													{message.content}
												</p>
											</div>
										</div>
									))}
									{isAIThinking && (
										<div className="flex justify-start">
											<div className="bg-gray-100 px-4 py-3 rounded-lg">
												<div className="flex items-center gap-2">
													<Loader2 className="w-4 h-4 animate-spin" />
													<span className="text-sm">AIが考えています...</span>
												</div>
											</div>
										</div>
									)}
								</div>

								{/* Input Area */}
								<div className="space-y-3">
									<div className="flex gap-3 items-end">
										<Textarea
											value={inputMessage}
											onChange={(e) => setInputMessage(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === 'Enter' && !e.shiftKey && !isAIThinking) {
													e.preventDefault();
													handleSendMessage();
												}
											}}
											placeholder="質問やフィードバックを入力... (Shift+Enterで改行)"
											className="flex-1 min-h-[48px] max-h-[120px] resize-none"
											disabled={isAIThinking || isGeneratingPRD}
										/>
										<Button
											onClick={handleSendMessage}
											size="default"
											className="h-12 px-6"
											disabled={
												isAIThinking || !inputMessage.trim() || isGeneratingPRD
											}
										>
											{isAIThinking ? (
												<Loader2 className="h-4 w-4 animate-spin" />
											) : (
												<>
													送信
													<ArrowRight className="ml-2 h-4 w-4" />
												</>
											)}
										</Button>
									</div>
									<Button
										onClick={handleGeneratePRD}
										variant="outline"
										className="w-full h-12"
										disabled={isGeneratingPRD || isAIThinking}
									>
										{isGeneratingPRD ? (
											<>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												PRDを生成中...
											</>
										) : (
											<>
												<FileText className="mr-2 h-4 w-4" />
												AIでPRD作成
											</>
										)}
									</Button>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Next Step Button */}
					<div className="mt-6 flex justify-center">
						<Button
							onClick={handleNextStep}
							size="lg"
							className="px-8"
							disabled={!finalPRD}
						>
							PRD確認へ進む
							<ArrowRight className="ml-2 h-5 w-5" />
						</Button>
					</div>
				</div>
			)}

			{currentStep === 3 && (
				<div className="w-full max-w-7xl mx-auto">
					<div className="flex flex-col h-[calc(100vh-240px)]">
						{/* Main PRD Display and Edit */}
						<Card className="flex-1 flex flex-col mb-4">
							<CardHeader className="pb-3">
								<div>
									<CardTitle>最終PRDの確認・編集</CardTitle>
									<CardDescription>
										AIが生成したPRDを確認し、必要に応じて編集してください
									</CardDescription>
								</div>
							</CardHeader>
							<CardContent className="flex-1 p-4">
								<Textarea
									value={finalPRD}
									onChange={(e) => setFinalPRD(e.target.value)}
									className="w-full h-full resize-none font-mono text-sm"
									placeholder="PRDがここに表示されます..."
								/>
							</CardContent>
						</Card>
					</div>
				</div>
			)}

			{/* Step 4: Task Candidate Editor */}
			{currentStep === 4 && (
				<TaskCandidateEditor
					sessionId={projectSession.sessionId}
					projectName={projectName}
					projectDescription=""
					prdContent={finalPRD || prdContent}
					deadline={undefined}
					initialTasks={taskCandidates}
					onConfirm={handleConfirmTasks}
					onBack={() => updateStep(3)}
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
						<div className="flex items-center gap-6">
							<div className="flex items-center gap-3">
								<label className="text-sm font-medium">タスク数:</label>
								<div className="flex items-center gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => setTaskCount(Math.max(5, taskCount - 1))}
										disabled={taskCount <= 5}
									>
										-
									</Button>
									<span className="font-bold text-lg w-8 text-center">
										{taskCount}
									</span>
									<Button
										variant="outline"
										size="sm"
										onClick={() => setTaskCount(Math.min(20, taskCount + 1))}
										disabled={taskCount >= 20}
									>
										+
									</Button>
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
								<label htmlFor="research" className="text-sm cursor-pointer">
									最新技術を調査
								</label>
							</div>
							<Button
								onClick={handleNextStep}
								disabled={loading}
								className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
							>
								{loading ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										生成中...
									</>
								) : (
									<>
										タスクを生成
										<ArrowRight className="ml-2 h-4 w-4" />
									</>
								)}
							</Button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

export default withAuth(NewProjectPage);
