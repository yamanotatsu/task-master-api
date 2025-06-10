import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ProjectCardProps {
	id: string;
	name: string;
	createdAt: string;
	progress: number;
	completedTasks: number;
	totalTasks: number;
	assignees: Array<{ id: string; name: string; avatar?: string }>;
	deadline?: string;
	className?: string;
}

export function ProjectCard({
	id,
	name,
	createdAt,
	progress,
	completedTasks,
	totalTasks,
	assignees,
	deadline,
	className
}: ProjectCardProps) {
	const isOverdue = deadline && new Date(deadline) < new Date();

	return (
		<Link href={`/projects/${id}`}>
			<Card className={cn('card-hover cursor-pointer', className)}>
				<CardHeader className="pb-4">
					<CardTitle className="text-lg font-bold line-clamp-2">
						{name}
					</CardTitle>
					<p className="text-sm text-muted-foreground">作成日: {createdAt}</p>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">進捗</span>
							<span className="font-medium">{Math.round(progress)}%</span>
						</div>
						<Progress value={progress} className="h-2" />
					</div>

					<div className="flex items-center justify-between">
						<span className="text-sm text-muted-foreground">
							{completedTasks}/{totalTasks} 完了
						</span>
						{deadline && (
							<span
								className={cn(
									'text-sm',
									isOverdue
										? 'text-red-500 font-medium'
										: 'text-muted-foreground'
								)}
							>
								期限: {deadline}
							</span>
						)}
					</div>

					<div className="flex items-center">
						<div className="flex -space-x-2">
							{assignees.slice(0, 3).map((assignee) => (
								<div
									key={assignee.id}
									className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center"
									title={assignee.name}
								>
									<span className="text-xs font-medium">
										{assignee.name.charAt(0)}
									</span>
								</div>
							))}
						</div>
						{assignees.length > 3 && (
							<span className="ml-2 text-sm text-muted-foreground">
								+{assignees.length - 3}
							</span>
						)}
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}
