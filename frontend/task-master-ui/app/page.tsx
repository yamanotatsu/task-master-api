'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { ProjectItem } from '@/components/dashboard/ProjectItem';
import { ProjectCreationGuideModal } from '@/components/project-creation-guide-modal';
import { api, Project } from '@/lib/api';
import { withAuth } from '@/lib/auth';

function DashboardPage() {
	const router = useRouter();
	const [projects, setProjects] = useState<Project[]>([]);
	const [loading, setLoading] = useState(true);
	const [showGuideModal, setShowGuideModal] = useState(false);

	useEffect(() => {
		loadProjects();
	}, []);

	const loadProjects = async () => {
		try {
			setLoading(true);
			const data = await api.getProjects();
			setProjects(data);
		} catch (error) {
			console.error('Failed to load projects:', error);
		} finally {
			setLoading(false);
		}
	};


	const handleProjectClick = (projectId: string) => {
		router.push(`/projects/${projectId}`);
	};

	const handleCreateProject = () => {
		setShowGuideModal(true);
	};

	const handleContinueFromModal = () => {
		setShowGuideModal(false);
		router.push('/projects/new');
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<Spinner size="lg" />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-white">
			<div className="border-b">
				<div className="max-w-5xl mx-auto px-8 py-6">
					<div className="flex items-center justify-between">
						<h1 className="text-xl font-medium text-gray-900">
							プロジェクト
						</h1>
						<Button variant="ghost" size="sm" onClick={handleCreateProject}>
							<Plus className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</div>

			<div className="max-w-5xl mx-auto px-8 py-8">
				{loading ? (
					<div className="flex items-center justify-center h-64">
						<Spinner size="lg" />
					</div>
				) : projects.length === 0 ? (
					<EmptyState
						icon={
							<svg
								className="w-16 h-16"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={1.5}
									d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
								/>
							</svg>
						}
						title="プロジェクトがありません"
						description="新規プロジェクトを作成して、タスク管理を始めましょう"
						action={{
							label: 'プロジェクトを作成',
							onClick: handleCreateProject
						}}
					/>
				) : (
					<div className="space-y-1">
						{projects.map((project) => (
							<ProjectItem
								key={project.id}
								project={project}
								onProjectClick={handleProjectClick}
							/>
						))}
					</div>
				)}
			</div>

			<ProjectCreationGuideModal
				open={showGuideModal}
				onOpenChange={(open) => {
					if (!open) {
						// モーダルが閉じられた時（×ボタンやESCキー）も/projects/newへ遷移
						handleContinueFromModal();
					}
				}}
				onContinue={handleContinueFromModal}
			/>
		</div>
	);
}

export default withAuth(DashboardPage);
