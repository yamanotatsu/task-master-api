'use client';

import { useState } from 'react';
import { Building2 } from 'lucide-react';
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
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function NewOrganizationPage() {
	const [loading, setLoading] = useState(false);
	const [formData, setFormData] = useState({
		name: '',
		description: ''
	});
	const [errors, setErrors] = useState<{
		name?: string;
		description?: string;
	}>({});
	const router = useRouter();
	const { user } = useAuth();

	const validateForm = () => {
		const newErrors: typeof errors = {};

		if (!formData.name.trim()) {
			newErrors.name = '組織名は必須です';
		} else if (formData.name.length < 2) {
			newErrors.name = '組織名は2文字以上で入力してください';
		} else if (formData.name.length > 100) {
			newErrors.name = '組織名は100文字以内で入力してください';
		}

		if (formData.description && formData.description.length > 500) {
			newErrors.description = '説明は500文字以内で入力してください';
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validateForm()) return;

		if (!user) {
			toast.error('ログインが必要です');
			return;
		}

		try {
			setLoading(true);

			// Use the same RPC function as onboarding
			const organizationSlug = `${formData.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
			const { data: result, error: orgError } = await supabase.rpc(
				'create_organization_with_admin',
				{
					org_name: formData.name.trim(),
					org_slug: organizationSlug,
					org_description: formData.description.trim() || null,
					admin_id: user.id
				}
			);

			if (orgError || !result?.[0]?.success) {
				throw new Error(
					orgError?.message ||
						result?.[0]?.message ||
						'組織の作成に失敗しました'
				);
			}

			toast.success('組織を作成しました');
			router.push('/settings/organization');
		} catch (error) {
			console.error('Failed to create organization:', error);
			toast.error(
				error instanceof Error ? error.message : '組織の作成に失敗しました'
			);
		} finally {
			setLoading(false);
		}
	};

	const handleCancel = () => {
		router.back();
	};

	return (
		<div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">新しい組織を作成</h1>
				<p className="text-gray-600">
					組織を作成してチームメンバーと協力しましょう
				</p>
			</div>

			<form onSubmit={handleSubmit}>
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Building2 className="h-5 w-5" />
							組織情報
						</CardTitle>
						<CardDescription>組織の基本情報を入力してください</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="space-y-2">
							<Label htmlFor="name">
								組織名 <span className="text-red-500">*</span>
							</Label>
							<Input
								id="name"
								value={formData.name}
								onChange={(e) => {
									setFormData({ ...formData, name: e.target.value });
									if (errors.name) {
										setErrors({ ...errors, name: undefined });
									}
								}}
								placeholder="アクメ株式会社"
								disabled={loading}
								className={errors.name ? 'border-red-500' : ''}
							/>
							{errors.name && (
								<p className="text-xs text-red-500">{errors.name}</p>
							)}
							<p className="text-xs text-gray-500">
								チームメンバーに表示される組織の名前です
							</p>
						</div>

						<div className="space-y-2">
							<Label htmlFor="description">説明（任意）</Label>
							<Textarea
								id="description"
								value={formData.description}
								onChange={(e) => {
									setFormData({ ...formData, description: e.target.value });
									if (errors.description) {
										setErrors({ ...errors, description: undefined });
									}
								}}
								placeholder="組織の目的や活動内容を入力..."
								rows={4}
								disabled={loading}
								className={errors.description ? 'border-red-500' : ''}
							/>
							{errors.description && (
								<p className="text-xs text-red-500">{errors.description}</p>
							)}
							<p className="text-xs text-gray-500">
								組織の詳細な説明を追加できます（最大500文字）
							</p>
						</div>

						<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
							<h4 className="text-sm font-medium text-blue-900 mb-2">
								組織作成後について
							</h4>
							<ul className="text-xs text-blue-800 space-y-1">
								<li>• あなたは自動的に組織の管理者になります</li>
								<li>• メンバーを招待してチームを構築できます</li>
								<li>• プロジェクトを作成して作業を開始できます</li>
								<li>• 組織の設定はいつでも変更可能です</li>
							</ul>
						</div>
					</CardContent>
				</Card>

				<div className="flex justify-end gap-4 mt-6">
					<Button
						type="button"
						variant="outline"
						onClick={handleCancel}
						disabled={loading}
					>
						キャンセル
					</Button>
					<Button type="submit" disabled={loading}>
						{loading ? '作成中...' : '組織を作成'}
					</Button>
				</div>
			</form>
		</div>
	);
}
