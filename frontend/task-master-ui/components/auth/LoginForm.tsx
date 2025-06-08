'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import Link from 'next/link';
import { toast } from 'sonner';

export function LoginForm() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [rememberMe, setRememberMe] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [errors, setErrors] = useState<{ email?: string; password?: string }>(
		{}
	);

	const { login } = useAuth();
	const router = useRouter();

	// Load remembered email on mount
	useEffect(() => {
		// ブラウザ環境でのみlocalStorageにアクセス
		if (typeof window !== 'undefined') {
			const rememberedEmail = localStorage.getItem('rememberedEmail');
			if (rememberedEmail) {
				setEmail(rememberedEmail);
				setRememberMe(true);
			}
		}
	}, []);

	const validateForm = () => {
		const newErrors: { email?: string; password?: string } = {};

		if (!email) {
			newErrors.email = 'メールアドレスを入力してください';
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			newErrors.email = '有効なメールアドレスを入力してください';
		}

		if (!password) {
			newErrors.password = 'パスワードを入力してください';
		} else if (password.length < 6) {
			newErrors.password = 'パスワードは6文字以上で入力してください';
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validateForm()) return;

		setIsLoading(true);
		setErrors({});

		try {
			await login(email, password);

			// Handle remember me - ブラウザ環境でのみlocalStorageにアクセス
			if (typeof window !== 'undefined') {
				if (rememberMe) {
					localStorage.setItem('rememberedEmail', email);
				} else {
					localStorage.removeItem('rememberedEmail');
				}
			}

			toast.success('ログインしました');
		} catch (error) {
			console.error('Login error:', error);
			toast.error(
				'ログインに失敗しました。メールアドレスとパスワードを確認してください。'
			);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Card className="w-full max-w-md">
			<CardHeader className="space-y-1">
				<CardTitle className="text-2xl font-bold">ログイン</CardTitle>
				<CardDescription>
					アカウントにログインしてタスク管理を開始しましょう
				</CardDescription>
			</CardHeader>
			<form onSubmit={handleSubmit}>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="email">メールアドレス</Label>
						<Input
							id="email"
							type="email"
							placeholder="example@company.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							disabled={isLoading}
							className={errors.email ? 'border-red-500' : ''}
						/>
						{errors.email && (
							<p className="text-sm text-red-500 mt-1">{errors.email}</p>
						)}
					</div>

					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label htmlFor="password">パスワード</Label>
							<Link
								href="/forgot-password"
								className="text-sm text-primary hover:underline"
							>
								パスワードを忘れた方
							</Link>
						</div>
						<Input
							id="password"
							type="password"
							placeholder="••••••••"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							disabled={isLoading}
							className={errors.password ? 'border-red-500' : ''}
						/>
						{errors.password && (
							<p className="text-sm text-red-500 mt-1">{errors.password}</p>
						)}
					</div>

					<div className="flex items-center space-x-2">
						<Checkbox
							id="remember"
							checked={rememberMe}
							onCheckedChange={(checked) => setRememberMe(checked as boolean)}
							disabled={isLoading}
						/>
						<Label
							htmlFor="remember"
							className="text-sm font-normal cursor-pointer"
						>
							メールアドレスを記憶する
						</Label>
					</div>
				</CardContent>

				<CardFooter className="flex flex-col space-y-4">
					<Button type="submit" className="w-full" disabled={isLoading}>
						{isLoading ? (
							<>
								<Spinner className="mr-2 h-4 w-4" />
								ログイン中...
							</>
						) : (
							'ログイン'
						)}
					</Button>

					<div className="text-center text-sm">
						アカウントをお持ちでない方は{' '}
						<Link href="/signup" className="text-primary hover:underline">
							新規登録
						</Link>
					</div>
				</CardFooter>
			</form>
		</Card>
	);
}
