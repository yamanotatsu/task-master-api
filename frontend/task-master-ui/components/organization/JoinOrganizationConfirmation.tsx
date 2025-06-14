'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Building2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface JoinOrganizationConfirmationProps {
	organizationName: string;
	invitationId: string;
	token: string;
	organizationId: string;
	onAccept?: () => void;
	onDecline?: () => void;
}

export function JoinOrganizationConfirmation({
	organizationName,
	invitationId,
	token,
	organizationId,
	onAccept,
	onDecline
}: JoinOrganizationConfirmationProps) {
	const [isLoading, setIsLoading] = useState(false);
	const router = useRouter();

	const handleAccept = async () => {
		setIsLoading(true);
		try {
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/api/v1/organizations/${organizationId}/invites/${token}/accept`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					credentials: 'include'
				}
			);

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error?.message || '組織への参加に失敗しました');
			}

			toast.success('組織に参加しました');
			
			if (onAccept) {
				onAccept();
			} else {
				// Redirect to dashboard
				router.push('/');
			}
		} catch (error: any) {
			console.error('Failed to accept invitation:', error);
			toast.error(error.message || '組織への参加に失敗しました');
		} finally {
			setIsLoading(false);
		}
	};

	const handleDecline = () => {
		if (onDecline) {
			onDecline();
		} else {
			router.push('/');
		}
	};

	return (
		<Card className="w-full max-w-md">
			<CardHeader className="text-center space-y-1">
				<div className="mx-auto mb-4 p-4 rounded-full bg-primary/10">
					<Building2 className="h-8 w-8 text-primary" />
				</div>
				<CardTitle className="text-2xl font-bold">組織への参加確認</CardTitle>
				<CardDescription>
					以下の組織に参加しようとしています
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="p-4 rounded-lg bg-muted text-center">
					<p className="text-lg font-medium">{organizationName}</p>
				</div>
				<p className="mt-4 text-sm text-muted-foreground text-center">
					この組織に参加すると、組織のプロジェクトやタスクにアクセスできるようになります。
				</p>
			</CardContent>
			<CardFooter className="flex flex-col gap-3">
				<Button
					onClick={handleAccept}
					disabled={isLoading}
					className="w-full"
					size="lg"
				>
					{isLoading ? (
						<>
							<Spinner className="mr-2 h-4 w-4" />
							参加中...
						</>
					) : (
						<>
							<CheckCircle className="mr-2 h-4 w-4" />
							参加する
						</>
					)}
				</Button>
				<Button
					onClick={handleDecline}
					disabled={isLoading}
					variant="outline"
					className="w-full"
					size="lg"
				>
					<XCircle className="mr-2 h-4 w-4" />
					キャンセル
				</Button>
			</CardFooter>
		</Card>
	);
}