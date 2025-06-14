'use client';

import { useEffect, useState } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { JoinOrganizationConfirmation } from '@/components/organization/JoinOrganizationConfirmation';
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
import { CheckCircle, XCircle, Users } from 'lucide-react';

interface InvitationDetails {
	email: string;
	role: string;
	organizationId: string;
	organizationName: string;
	isExistingUser: boolean;
}

export default function InvitationAcceptPage() {
	const router = useRouter();
	const params = useParams();
	const token = params.token as string;
	const { user, loading: authLoading } = useAuth();

	const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showConfirmation, setShowConfirmation] = useState(false);

	useEffect(() => {
		if (token) {
			validateInvitation();
		}
	}, [token]);

	useEffect(() => {
		// Check if user needs to accept the invitation after login
		if (user && invitation && !error) {
			tryAcceptInvitation();
		}
	}, [user, invitation]);

	const validateInvitation = async () => {
		try {
			setLoading(true);
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/api/v1/invitations/${token}/validate`,
				{
					method: 'GET',
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error?.message || 'Invalid invitation');
			}

			setInvitation(data.data.invitation);
		} catch (err: any) {
			console.error('Failed to validate invitation:', err);
			setError(err.message || '無効な招待リンクです');
		} finally {
			setLoading(false);
		}
	};

	const tryAcceptInvitation = async () => {
		try {
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/api/v1/organizations/${invitation!.organizationId}/invites/${token}/accept`,
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
				// Check if user needs to confirm
				if (data.data?.requiresConfirmation) {
					setShowConfirmation(true);
					return;
				}
				throw new Error(data.error?.message || 'Failed to accept invitation');
			}

			// Successfully joined
			toast.success('組織に参加しました');
			router.push('/');
		} catch (err: any) {
			console.error('Failed to accept invitation:', err);
			setError(err.message);
		}
	};

	const handleAccept = async () => {
		if (!invitation) return;

		// If user is not logged in, redirect based on whether they have an account
		if (!user) {
			if (invitation.isExistingUser) {
				router.push(`/login?invite=${token}`);
			} else {
				router.push(`/signup?invite=${token}&email=${encodeURIComponent(invitation.email)}`);
			}
			return;
		}

		// If logged in, show confirmation
		setShowConfirmation(true);
	};

	if (loading || authLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<Spinner size="lg" />
			</div>
		);
	}

	// Show confirmation component if needed
	if (showConfirmation && invitation) {
		return (
			<div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
				<JoinOrganizationConfirmation
					organizationName={invitation.organizationName}
					invitationId=""
					token={token}
					organizationId={invitation.organizationId}
					onDecline={() => router.push('/')}
				/>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
			<div className="w-full max-w-md space-y-8">
				{/* Logo */}
				<div className="text-center">
					<Link href="/" className="inline-flex items-center space-x-2">
						<div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
							<span className="text-white font-bold text-2xl">T</span>
						</div>
						<span className="text-3xl font-bold text-gray-900">
							Task Master
						</span>
					</Link>
				</div>

				{/* Invitation Card */}
				<Card className="w-full">
					{error ? (
						// Error State
						<>
							<CardHeader className="text-center">
								<div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
									<XCircle className="h-6 w-6 text-red-600" />
								</div>
								<CardTitle className="text-xl">招待リンクエラー</CardTitle>
								<CardDescription>{error}</CardDescription>
							</CardHeader>
							<CardContent className="text-center">
								<Button
									variant="outline"
									onClick={() => router.push(user ? '/' : '/login')}
									className="w-full"
								>
									{user ? 'ダッシュボードに戻る' : 'ログイン画面へ'}
								</Button>
							</CardContent>
						</>
					) : invitation ? (
						// Valid Invitation
						<>
							<CardHeader className="text-center">
								<div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
									<Users className="h-6 w-6 text-primary" />
								</div>
								<CardTitle className="text-xl">組織への招待</CardTitle>
								<CardDescription>
									{invitation.organizationName}への参加招待が届いています
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-6">
								{/* Invitation Details */}
								<div className="bg-gray-50 rounded-lg p-4 space-y-3">
									<div>
										<p className="text-sm text-gray-500">組織名</p>
										<p className="font-medium">{invitation.organizationName}</p>
									</div>
									<div>
										<p className="text-sm text-gray-500">役割</p>
										<p className="font-medium">{invitation.role === 'admin' ? '管理者' : 'メンバー'}</p>
									</div>
									{!user && (
										<div>
											<p className="text-sm text-gray-500">
												招待先メールアドレス
											</p>
											<p className="font-medium">{invitation.email}</p>
										</div>
									)}
								</div>

								{/* Action Buttons */}
								<div className="space-y-3">
									<Button
										onClick={handleAccept}
										className="w-full"
									>
										<CheckCircle className="mr-2 h-4 w-4" />
										{user ? '招待を承認する' : invitation.isExistingUser ? 'ログインして参加' : 'アカウントを作成して参加'}
									</Button>
								</div>
							</CardContent>
						</>
					) : null}
				</Card>

				{/* Additional Links */}
				{!user && invitation && (
					<div className="text-center text-sm text-gray-600">
						{invitation.isExistingUser ? (
							<>
								アカウントをお持ちでない場合は
								<Link
									href={`/signup?invite=${token}&email=${encodeURIComponent(invitation.email)}`}
									className="ml-1 font-medium text-primary hover:text-primary/90"
								>
									新規登録
								</Link>
							</>
						) : (
							<>
								既にアカウントをお持ちですか？
								<Link
									href={`/login?invite=${token}`}
									className="ml-1 font-medium text-primary hover:text-primary/90"
								>
									ログインして続ける
								</Link>
							</>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
