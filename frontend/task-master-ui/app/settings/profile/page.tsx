'use client';

import { useState, useEffect } from 'react';
import type { Metadata } from 'next';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useAuth, withAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { User, Lock, Trash2 } from 'lucide-react';

function ProfilePage() {
	const router = useRouter();
	const { user, profile, updateProfile, changePassword, deleteAccount } =
		useAuth();
	const [loading, setLoading] = useState(false);
	const [profileData, setProfileData] = useState({
		fullName: '',
		email: ''
	});
	const [passwordData, setPasswordData] = useState({
		currentPassword: '',
		newPassword: '',
		confirmPassword: ''
	});
	const [deleteData, setDeleteData] = useState({
		password: '',
		confirmText: ''
	});

	useEffect(() => {
		if (user && profile) {
			setProfileData({
				fullName: profile.full_name || '',
				email: user.email || ''
			});
		}
	}, [user, profile]);

	const handleProfileUpdate = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		try {
			// Update user profile via Supabase
			await updateProfile({
				full_name: profileData.fullName
			});

			toast.success('プロフィールを更新しました');
		} catch (error) {
			console.error('Profile update error:', error);
			toast.error('プロフィールの更新に失敗しました');
		} finally {
			setLoading(false);
		}
	};

	const handlePasswordChange = async (e: React.FormEvent) => {
		e.preventDefault();

		if (passwordData.newPassword !== passwordData.confirmPassword) {
			toast.error('新しいパスワードが一致しません');
			return;
		}

		if (passwordData.newPassword.length < 6) {
			toast.error('パスワードは6文字以上で入力してください');
			return;
		}

		setLoading(true);

		try {
			await changePassword(
				passwordData.currentPassword,
				passwordData.newPassword
			);

			// Clear password fields
			setPasswordData({
				currentPassword: '',
				newPassword: '',
				confirmPassword: ''
			});

			toast.success('パスワードを変更しました');
		} catch (error) {
			console.error('Password change error:', error);
			toast.error(
				error instanceof Error
					? error.message
					: 'パスワードの変更に失敗しました。現在のパスワードを確認してください。'
			);
		} finally {
			setLoading(false);
		}
	};

	const handleAccountDelete = async (e: React.FormEvent) => {
		e.preventDefault();

		if (deleteData.confirmText !== 'DELETE') {
			toast.error('確認テキストが正しくありません');
			return;
		}

		setLoading(true);

		try {
			await deleteAccount(deleteData.password);
			toast.success('アカウントを削除しました');
			// router.push will be handled by the deleteAccount function
		} catch (error) {
			console.error('Account deletion error:', error);
			toast.error(
				error instanceof Error
					? error.message
					: 'アカウントの削除に失敗しました'
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="max-w-4xl mx-auto p-6 space-y-6">
			<h1 className="text-3xl font-bold">アカウント設定</h1>

			{/* Profile Settings */}
			<Card>
				<CardHeader>
					<div className="flex items-center space-x-2">
						<User className="h-5 w-5" />
						<CardTitle>プロフィール設定</CardTitle>
					</div>
					<CardDescription>アカウントの基本情報を管理します</CardDescription>
				</CardHeader>
				<form onSubmit={handleProfileUpdate}>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="fullName">氏名</Label>
							<Input
								id="fullName"
								value={profileData.fullName}
								onChange={(e) =>
									setProfileData({ ...profileData, fullName: e.target.value })
								}
								disabled={loading}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="email">メールアドレス</Label>
							<Input
								id="email"
								type="email"
								value={profileData.email}
								onChange={(e) =>
									setProfileData({ ...profileData, email: e.target.value })
								}
								disabled={loading}
							/>
						</div>
						<Button type="submit" disabled={loading}>
							{loading ? (
								<>
									<Spinner className="mr-2 h-4 w-4" />
									更新中...
								</>
							) : (
								'更新'
							)}
						</Button>
					</CardContent>
				</form>
			</Card>

			{/* Password Change */}
			<Card>
				<CardHeader>
					<div className="flex items-center space-x-2">
						<Lock className="h-5 w-5" />
						<CardTitle>パスワード変更</CardTitle>
					</div>
					<CardDescription>
						セキュリティを保つため、定期的にパスワードを変更してください
					</CardDescription>
				</CardHeader>
				<form onSubmit={handlePasswordChange}>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="currentPassword">現在のパスワード</Label>
							<Input
								id="currentPassword"
								type="password"
								value={passwordData.currentPassword}
								onChange={(e) =>
									setPasswordData({
										...passwordData,
										currentPassword: e.target.value
									})
								}
								disabled={loading}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="newPassword">新しいパスワード</Label>
							<Input
								id="newPassword"
								type="password"
								value={passwordData.newPassword}
								onChange={(e) =>
									setPasswordData({
										...passwordData,
										newPassword: e.target.value
									})
								}
								disabled={loading}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="confirmPassword">新しいパスワード（確認）</Label>
							<Input
								id="confirmPassword"
								type="password"
								value={passwordData.confirmPassword}
								onChange={(e) =>
									setPasswordData({
										...passwordData,
										confirmPassword: e.target.value
									})
								}
								disabled={loading}
							/>
						</div>
						<Button type="submit" disabled={loading}>
							{loading ? (
								<>
									<Spinner className="mr-2 h-4 w-4" />
									変更中...
								</>
							) : (
								'パスワードを変更'
							)}
						</Button>
					</CardContent>
				</form>
			</Card>

			{/* Account Deletion */}
			<Card className="border-red-200">
				<CardHeader>
					<div className="flex items-center space-x-2">
						<Trash2 className="h-5 w-5 text-red-600" />
						<CardTitle className="text-red-600">アカウント削除</CardTitle>
					</div>
					<CardDescription>
						この操作は取り消すことができません。すべてのデータが完全に削除されます。
					</CardDescription>
				</CardHeader>
				<form onSubmit={handleAccountDelete}>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="deletePassword">パスワード</Label>
							<Input
								id="deletePassword"
								type="password"
								value={deleteData.password}
								onChange={(e) =>
									setDeleteData({ ...deleteData, password: e.target.value })
								}
								disabled={loading}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="confirmDelete">
								確認のため「DELETE」と入力してください
							</Label>
							<Input
								id="confirmDelete"
								value={deleteData.confirmText}
								onChange={(e) =>
									setDeleteData({ ...deleteData, confirmText: e.target.value })
								}
								placeholder="DELETE"
								disabled={loading}
							/>
						</div>
						<Button
							type="submit"
							variant="destructive"
							disabled={loading || deleteData.confirmText !== 'DELETE'}
						>
							{loading ? (
								<>
									<Spinner className="mr-2 h-4 w-4" />
									削除中...
								</>
							) : (
								'アカウントを削除'
							)}
						</Button>
					</CardContent>
				</form>
			</Card>
		</div>
	);
}

export default withAuth(ProfilePage);
