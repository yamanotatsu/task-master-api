'use client';

import { useEffect, useState } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
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
import { CheckCircle, XCircle, Users } from 'lucide-react';
import { JoinOrganizationConfirmation } from '@/components/organization/JoinOrganizationConfirmation';

interface InvitationDetails {
	id: string;
	organizationName: string;
	inviterName: string;
	inviterEmail: string;
	email: string;
	role: string;
	expiresAt: string;
	status: 'pending' | 'accepted' | 'expired';
	requiresConfirmation?: boolean;
	invitationId?: string;
}

export default function InvitationAcceptPage() {
	const router = useRouter();
	const params = useParams();
	const token = params.token as string;
	const { user, loading: authLoading } = useAuth();

	const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
	const [loading, setLoading] = useState(true);
	const [accepting, setAccepting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showConfirmation, setShowConfirmation] = useState(false);

	useEffect(() => {
		if (token) {
			validateInvitation();
		}
	}, [token]);

	const validateInvitation = async () => {
		try {
			setLoading(true);
			const data = await api.validateInvitation(token);
			setInvitation(data);

			// Check if invitation is expired
			if (new Date(data.expiresAt) < new Date()) {
				setError('この招待リンクは有効期限が切れています');
				setInvitation({ ...data, status: 'expired' });
			}
		} catch (err) {
			console.error('Failed to validate invitation:', err);
			setError('無効な招待リンクです');
		} finally {
			setLoading(false);
		}
	};

	const handleAccept = async () => {
		if (!invitation || invitation.status !== 'pending') return;

		setAccepting(true);
		try {
			// If user is not logged in, redirect to signup with invitation token
			if (!user) {
				router.push(`/signup?invitation=${token}`);
				return;
			}

			// If user is logged in, try to accept the invitation
			const response = await api.acceptInvitation(token);
			
			// Check if confirmation is required for existing users
			if (response.requiresConfirmation) {
				setInvitation({
					...invitation,
					requiresConfirmation: true,
					organizationName: response.organizationName,
					invitationId: response.invitationId
				});
				setShowConfirmation(true);
				setAccepting(false);
				return;
			}

			toast.success(`${invitation.organizationName}に参加しました`);
			router.push('/');
		} catch (err) {
			console.error('Failed to accept invitation:', err);
			toast.error('招待の承認に失敗しました');
		} finally {
			setAccepting(false);
		}
	};

	const handleDecline = async () => {
		if (!invitation) return;

		try {
			await api.declineInvitation(token);
			toast.info('招待を辞退しました');
			router.push(user ? '/' : '/login');
		} catch (err) {
			console.error('Failed to decline invitation:', err);
			toast.error('招待の辞退に失敗しました');
		}
	};

	if (loading || authLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<Spinner size="lg" />
			</div>
		);
	}

	// Show confirmation component for existing users
	if (showConfirmation && invitation) {
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

					<JoinOrganizationConfirmation
						organizationName={invitation.organizationName}
						invitationId={invitation.invitationId || invitation.id}
						token={token}
					/>
				</div>
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
									{invitation.inviterName}さんから組織への参加招待が届いています
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
										<p className="text-sm text-gray-500">招待者</p>
										<p className="font-medium">
											{invitation.inviterName} ({invitation.inviterEmail})
										</p>
									</div>
									<div>
										<p className="text-sm text-gray-500">役割</p>
										<p className="font-medium">{invitation.role}</p>
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
								{invitation.status === 'pending' && (
									<div className="space-y-3">
										<Button
											onClick={handleAccept}
											disabled={accepting}
											className="w-full"
										>
											{accepting ? (
												<>
													<Spinner className="mr-2 h-4 w-4" />
													処理中...
												</>
											) : (
												<>
													<CheckCircle className="mr-2 h-4 w-4" />
													招待を承認する
												</>
											)}
										</Button>
										<Button
											variant="outline"
											onClick={handleDecline}
											disabled={accepting}
											className="w-full"
										>
											辞退する
										</Button>
									</div>
								)}

								{invitation.status === 'accepted' && (
									<div className="text-center">
										<p className="text-green-600 font-medium mb-4">
											既にこの招待を承認済みです
										</p>
										<Button
											variant="outline"
											onClick={() => router.push('/')}
											className="w-full"
										>
											ダッシュボードへ
										</Button>
									</div>
								)}

								{invitation.status === 'expired' && (
									<div className="text-center">
										<p className="text-red-600 font-medium mb-4">
											この招待リンクは有効期限が切れています
										</p>
										<Button
											variant="outline"
											onClick={() => router.push(user ? '/' : '/login')}
											className="w-full"
										>
											{user ? 'ダッシュボードへ' : 'ログイン画面へ'}
										</Button>
									</div>
								)}
							</CardContent>
						</>
					) : null}
				</Card>

				{/* Additional Links */}
				{!user && invitation?.status === 'pending' && (
					<div className="text-center text-sm text-gray-600">
						既にアカウントをお持ちですか？
						<Link
							href={`/login?redirect=/invite/${token}`}
							className="ml-1 font-medium text-primary hover:text-primary/90"
						>
							ログインして続ける
						</Link>
					</div>
				)}
			</div>
		</div>
	);
}
