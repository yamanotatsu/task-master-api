import type { Metadata } from 'next';
import Link from 'next/link';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export const metadata: Metadata = {
	title: 'パスワードリセット - Task Master',
	description:
		'パスワードをリセットして、Task Masterアカウントへのアクセスを回復します'
};

export default function ForgotPasswordPage() {
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
						パスワードをお忘れですか？
					</h1>
					<p className="mt-2 text-sm text-gray-600">
						ご登録のメールアドレスを入力してください。パスワードリセット用のリンクをお送りします。
					</p>
				</div>

				{/* Forgot Password Form */}
				<ForgotPasswordForm />

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
