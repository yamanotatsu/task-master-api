'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { Users, CheckCircle, XCircle } from 'lucide-react';

interface JoinOrganizationConfirmationProps {
	organizationName: string;
	invitationId: string;
	token: string;
}

export function JoinOrganizationConfirmation({
	organizationName,
	invitationId,
	token
}: JoinOrganizationConfirmationProps) {
	const router = useRouter();
	const [joining, setJoining] = useState(false);

	const handleJoin = async () => {
		setJoining(true);
		try {
			await api.acceptInvitation(token);
			toast.success(`${organizationName}に参加しました`);
			router.push('/');
		} catch (err) {
			console.error('Failed to join organization:', err);
			toast.error('組織への参加に失敗しました');
		} finally {
			setJoining(false);
		}
	};

	const handleCancel = () => {
		router.push('/');
	};

	return (
		<Card className="w-full max-w-md mx-auto">
			<CardHeader className="text-center">
				<div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
					<Users className="h-6 w-6 text-primary" />
				</div>
				<CardTitle className="text-xl">組織への参加確認</CardTitle>
				<CardDescription>
					以下の組織に参加しようとしています
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				<div className="bg-gray-50 rounded-lg p-4 text-center">
					<p className="text-lg font-medium">{organizationName}</p>
				</div>

				<div className="space-y-3">
					<Button
						onClick={handleJoin}
						disabled={joining}
						className="w-full"
					>
						{joining ? (
							<>
								<Spinner className="mr-2 h-4 w-4" />
								参加中...
							</>
						) : (
							<>
								<CheckCircle className="mr-2 h-4 w-4" />
								{organizationName}に参加する
							</>
						)}
					</Button>
					<Button
						variant="outline"
						onClick={handleCancel}
						disabled={joining}
						className="w-full"
					>
						<XCircle className="mr-2 h-4 w-4" />
						キャンセル
					</Button>
				</div>

				<p className="text-sm text-gray-600 text-center">
					※ 現在の組織設定は変更されません
				</p>
			</CardContent>
		</Card>
	);
}