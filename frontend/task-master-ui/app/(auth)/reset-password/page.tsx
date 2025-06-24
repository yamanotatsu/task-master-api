'use client';

import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { Spinner } from '@/components/ui/spinner';

function ResetPasswordContent() {
	const searchParams = useSearchParams();
	const token = searchParams.get('token');

	if (!token) {
		return (
			<div className="text-center">
				<h2 className="text-2xl font-bold text-gray-900 mb-4">無効なリンク</h2>
				<p className="text-gray-600 mb-6">
					パスワードリセットリンクが無効です。もう一度お試しください。
				</p>
				<Link
					href="/forgot-password"
					className="text-primary hover:text-primary/90 font-medium"
				>
					パスワードリセットをリクエスト
				</Link>
			</div>
		);
	}

	return <ResetPasswordForm />;
}

export default function ResetPasswordPage() {
	return (
		<div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
			<div className="w-full max-w-md space-y-8">
				{/* Logo and Title */}
				<div className="text-center">
					<Link href="/" className="inline-flex items-center space-x-2">
						<div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
							<span className="text-white font-bold text-2xl">T</span>
						</div>
						<span className="text-3xl font-bold text-gray-900">
							Task Master
						</span>
					</Link>
					<h1 className="mt-6 text-2xl font-bold text-gray-900">
						新しいパスワードを設定
					</h1>
					<p className="mt-2 text-sm text-gray-600">
						アカウントの新しいパスワードを入力してください
					</p>
				</div>

				{/* Reset Password Form with Suspense */}
				<Suspense
					fallback={
						<div className="flex justify-center">
							<Spinner size="lg" />
						</div>
					}
				>
					<ResetPasswordContent />
				</Suspense>

				{/* Back to Login Link */}
				<div className="text-center">
					<Link
						href="/login"
						className="text-sm font-medium text-primary hover:text-primary/90"
					>
						← ログイン画面に戻る
					</Link>
				</div>
			</div>
		</div>
	);
}
