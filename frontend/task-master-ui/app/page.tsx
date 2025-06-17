'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { ProjectItem } from '@/components/dashboard/ProjectItem';
import { api, Project } from '@/lib/api';
import { withAuth } from '@/lib/auth';

function DashboardPage() {
	const router = useRouter();
	const [projects, setProjects] = useState<Project[]>([]);
	const [loading, setLoading] = useState(true);

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

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<Spinner size="lg" />
			</div>
		);
	}

	return (
		<div className="min-h-screen">
			<div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-3xl font-bold text-gray-900 dark:text-white">プロジェクト</h1>
							<p className="mt-2 text-sm text-gray-600 dark:text-gray-400">タスクを管理し、チームの進捗を追跡しましょう</p>
						</div>
						<Button asChild variant="gradient" size="lg" className="shadow-md hover:shadow-lg transition-all duration-300">
							<Link href="/projects/new">
								<Plus className="h-5 w-5 mr-2" />
								新規プロジェクト
							</Link>
						</Button>
					</div>
				</div>
			</div>

			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
							onClick: () => router.push('/projects/new')
						}}
					/>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{projects.map((project) => (
							<div key={project.id} className="animate-fade-in">
								<ProjectItem
									project={project}
									onProjectClick={handleProjectClick}
								/>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

export default withAuth(DashboardPage);
