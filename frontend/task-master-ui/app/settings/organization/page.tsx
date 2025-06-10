'use client';

import { useEffect, useState } from 'react';
import {
	Building2,
	Users,
	FolderOpen,
	AlertTriangle,
	Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { api, Organization } from '@/lib/api';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog';

export default function OrganizationSettingsPage() {
	const [organization, setOrganization] = useState<Organization | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [deleteConfirmation, setDeleteConfirmation] = useState('');
	const [formData, setFormData] = useState({
		name: '',
		description: ''
	});
	const router = useRouter();

	useEffect(() => {
		loadOrganization();
	}, []);

	const loadOrganization = async () => {
		try {
			setLoading(true);
			const orgId = localStorage.getItem('currentOrgId');
			if (!orgId) {
				toast.error('組織が選択されていません');
				router.push('/');
				return;
			}

			const { data } = await api.getOrganizationWrapped(orgId);
			if (data) {
				setOrganization(data);
				setFormData({
					name: data.name,
					description: data.description || ''
				});
			}
		} catch (error) {
			console.error('Failed to load organization:', error);
			toast.error('組織情報の読み込みに失敗しました');
		} finally {
			setLoading(false);
		}
	};

	const handleSave = async () => {
		if (!organization) return;

		try {
			setSaving(true);
			await api.updateOrganization(organization.id, formData);
			toast.success('組織情報を更新しました');
			loadOrganization();
		} catch (error) {
			console.error('Failed to update organization:', error);
			toast.error('組織情報の更新に失敗しました');
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!organization || deleteConfirmation !== organization.name) return;

		try {
			await api.deleteOrganization(organization.id);
			toast.success('組織を削除しました');
			localStorage.removeItem('currentOrgId');
			router.push('/');
		} catch (error) {
			console.error('Failed to delete organization:', error);
			toast.error('組織の削除に失敗しました');
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<Spinner size="lg" />
			</div>
		);
	}

	if (!organization) {
		return null;
	}

	const isAdmin = organization.role === 'admin';
	const hasChanges =
		formData.name !== organization.name ||
		formData.description !== (organization.description || '');

	return (
		<div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
			<div>
				<h1 className="text-3xl font-bold mb-2">組織設定</h1>
				<p className="text-gray-600">組織の基本情報と設定を管理</p>
			</div>

			{/* Organization Info */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Building2 className="h-5 w-5" />
						基本情報
					</CardTitle>
					<CardDescription>組織の名前と説明を設定します</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="name">組織名</Label>
						<Input
							id="name"
							value={formData.name}
							onChange={(e) =>
								setFormData({ ...formData, name: e.target.value })
							}
							placeholder="アクメ株式会社"
							disabled={!isAdmin}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">説明（任意）</Label>
						<Textarea
							id="description"
							value={formData.description}
							onChange={(e) =>
								setFormData({ ...formData, description: e.target.value })
							}
							placeholder="組織の説明を入力..."
							rows={3}
							disabled={!isAdmin}
						/>
					</div>

					{isAdmin && (
						<div className="flex justify-end">
							<Button onClick={handleSave} disabled={!hasChanges || saving}>
								<Save className="mr-2 h-4 w-4" />
								{saving ? '保存中...' : '変更を保存'}
							</Button>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Statistics */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">メンバー数</CardTitle>
						<Users className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{organization.memberCount || 0}
						</div>
						<p className="text-xs text-muted-foreground">
							アクティブなメンバー
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							プロジェクト数
						</CardTitle>
						<FolderOpen className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{organization.projectCount || 0}
						</div>
						<p className="text-xs text-muted-foreground">
							進行中のプロジェクト
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">作成日</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{new Date(organization.createdAt || '').toLocaleDateString(
								'ja-JP',
								{
									year: 'numeric',
									month: 'short',
									day: 'numeric'
								}
							)}
						</div>
						<p className="text-xs text-muted-foreground">組織の作成日</p>
					</CardContent>
				</Card>
			</div>

			{/* Quick Actions */}
			<Card>
				<CardHeader>
					<CardTitle>クイックアクション</CardTitle>
					<CardDescription>よく使う機能へのショートカット</CardDescription>
				</CardHeader>
				<CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<Button
						variant="outline"
						onClick={() => router.push('/settings/members')}
						className="justify-start"
					>
						<Users className="mr-2 h-4 w-4" />
						メンバー管理
					</Button>
					<Button
						variant="outline"
						onClick={() => router.push('/projects/new')}
						className="justify-start"
					>
						<FolderOpen className="mr-2 h-4 w-4" />
						新規プロジェクト作成
					</Button>
				</CardContent>
			</Card>

			{/* Danger Zone */}
			{isAdmin && (
				<Card className="border-red-200">
					<CardHeader>
						<CardTitle className="text-red-600 flex items-center gap-2">
							<AlertTriangle className="h-5 w-5" />
							危険な操作
						</CardTitle>
						<CardDescription>
							これらの操作は取り消すことができません。慎重に実行してください。
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button
							variant="destructive"
							onClick={() => setShowDeleteDialog(true)}
						>
							組織を削除
						</Button>
					</CardContent>
				</Card>
			)}

			{/* Delete Confirmation Dialog */}
			<Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>組織の削除</DialogTitle>
						<DialogDescription>
							この操作は取り消すことができません。組織とすべての関連データが完全に削除されます。
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 py-4">
						<div className="rounded-lg bg-red-50 p-4">
							<p className="text-sm text-red-800">
								<strong>警告:</strong>{' '}
								この操作により以下のデータが削除されます：
							</p>
							<ul className="mt-2 text-sm text-red-700 list-disc list-inside">
								<li>すべてのプロジェクトとタスク</li>
								<li>すべてのメンバーの関連付け</li>
								<li>すべての組織設定</li>
							</ul>
						</div>

						<div className="space-y-2">
							<Label>
								確認のため組織名「<strong>{organization.name}</strong>
								」を入力してください
							</Label>
							<Input
								value={deleteConfirmation}
								onChange={(e) => setDeleteConfirmation(e.target.value)}
								placeholder={organization.name}
							/>
						</div>
					</div>

					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setShowDeleteDialog(false);
								setDeleteConfirmation('');
							}}
						>
							キャンセル
						</Button>
						<Button
							variant="destructive"
							onClick={handleDelete}
							disabled={deleteConfirmation !== organization.name}
						>
							組織を削除
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
