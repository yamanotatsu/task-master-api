'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import {
	Building2,
	Users,
	Briefcase,
	Rocket,
	ArrowLeft,
	Mail
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface OrganizationSetupFormProps {
	onComplete?: () => void;
	isFirstSetup?: boolean;
}

export function OrganizationSetupForm({
	onComplete,
	isFirstSetup = true
}: OrganizationSetupFormProps) {
	const [selectedOption, setSelectedOption] = useState<
		'create' | 'join' | null
	>(null);
	const [organizationName, setOrganizationName] = useState('');
	const [description, setDescription] = useState('');
	const [organizationType, setOrganizationType] = useState<
		'personal' | 'team' | 'company'
	>('personal');
	const [isLoading, setIsLoading] = useState(false);
	const [errors, setErrors] = useState<{
		name?: string;
		description?: string;
	}>({});

	const { user } = useAuth();
	const router = useRouter();

	const organizationTypes = [
		{
			value: 'personal',
			label: '個人ワークスペース',
			icon: Users,
			description: '個人的なタスクとプロジェクトを管理'
		},
		{
			value: 'team',
			label: 'チームワークスペース',
			icon: Briefcase,
			description: '小規模チームでのコラボレーション'
		},
		{
			value: 'company',
			label: '企業ワークスペース',
			icon: Building2,
			description: '企業全体でのプロジェクト管理'
		}
	];

	const validateForm = () => {
		const newErrors: typeof errors = {};

		if (!organizationName) {
			newErrors.name = '組織名を入力してください';
		} else if (organizationName.length < 2) {
			newErrors.name = '組織名は2文字以上で入力してください';
		} else if (organizationName.length > 50) {
			newErrors.name = '組織名は50文字以内で入力してください';
		}

		if (description && description.length > 200) {
			newErrors.description = '説明は200文字以内で入力してください';
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
			// Create organization via API
			const result = await api.createOrganization({
				name: organizationName,
				description: description || `${organizationName}のワークスペース`
			});

			const organizationId = result.organization.id;

			// Update user's current_organization_id
			const { error: profileError } = await supabase
				.from('profiles')
				.update({ current_organization_id: organizationId })
				.eq('id', user?.id);

			if (profileError) {
				console.error('Failed to update profile:', profileError);
				// エラーでも組織は作成されているので続行
			}

			toast.success('組織を作成しました');

			if (onComplete) {
				onComplete();
			} else {
				router.push('/');
			}
		} catch (error: any) {
			console.error('Organization setup error:', error);
			toast.error('組織の作成に失敗しました。もう一度お試しください。');
		} finally {
			setIsLoading(false);
		}
	};

	// 選択画面を表示
	if (selectedOption === null) {
		return (
			<Card className="w-full max-w-2xl">
				<CardHeader className="space-y-1">
					<div className="flex items-center space-x-2 mb-2">
						<Rocket className="h-6 w-6 text-primary" />
						<CardTitle className="text-2xl font-bold">
							ワークスペースへの参加方法を選択
						</CardTitle>
					</div>
					<CardDescription>
						新しい組織を作成するか、既存の組織からの招待を受けるかを選択してください
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<button
						type="button"
						onClick={() => setSelectedOption('create')}
						className="w-full p-6 rounded-lg border-2 border-border hover:border-primary/50 text-left transition-all group"
					>
						<div className="flex items-start space-x-4">
							<div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
								<Building2 className="h-6 w-6 text-primary" />
							</div>
							<div className="flex-1 space-y-1">
								<h3 className="font-semibold text-lg">新しい組織を作成する</h3>
								<p className="text-sm text-muted-foreground">
									あなたが管理者となる新しい組織を作成し、メンバーを招待できます
								</p>
							</div>
						</div>
					</button>

					<button
						type="button"
						onClick={() => setSelectedOption('join')}
						className="w-full p-6 rounded-lg border-2 border-border hover:border-primary/50 text-left transition-all group"
					>
						<div className="flex items-start space-x-4">
							<div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
								<Mail className="h-6 w-6 text-primary" />
							</div>
							<div className="flex-1 space-y-1">
								<h3 className="font-semibold text-lg">招待を受ける</h3>
								<p className="text-sm text-muted-foreground">
									既存の組織から招待を受けて参加します
								</p>
							</div>
						</div>
					</button>
				</CardContent>
			</Card>
		);
	}

	// 「招待を受ける」選択時のメッセージ画面
	if (selectedOption === 'join') {
		return (
			<Card className="w-full max-w-2xl">
				<CardHeader className="space-y-1">
					<div className="flex items-center space-x-2 mb-2">
						<Mail className="h-6 w-6 text-primary" />
						<CardTitle className="text-2xl font-bold">
							組織への招待を受ける
						</CardTitle>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="rounded-lg bg-muted p-6 space-y-3">
						<p className="text-base">
							組織の管理者にメールで招待を送ってもらってください。
						</p>
						<p className="text-sm text-muted-foreground">
							招待メールに記載されているリンクから組織に参加できます。
						</p>
					</div>
					<div className="rounded-lg border p-4 space-y-2">
						<h4 className="text-sm font-medium">招待を受ける際の流れ</h4>
						<ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
							<li>組織の管理者があなたのメールアドレスに招待を送信</li>
							<li>受信した招待メールのリンクをクリック</li>
							<li>組織への参加を確認</li>
						</ol>
					</div>
				</CardContent>
				<CardFooter>
					<Button
						type="button"
						variant="outline"
						className="w-full"
						onClick={() => setSelectedOption(null)}
					>
						<ArrowLeft className="mr-2 h-4 w-4" />
						戻る
					</Button>
				</CardFooter>
			</Card>
		);
	}

	// 「新しい組織を作成する」選択時の既存フォーム
	return (
		<Card className="w-full max-w-2xl">
			<CardHeader className="space-y-1">
				<div className="flex items-center justify-between mb-2">
					<div className="flex items-center space-x-2">
						<Rocket className="h-6 w-6 text-primary" />
						<CardTitle className="text-2xl font-bold">
							{isFirstSetup ? 'ワークスペースを作成' : '新しい組織を作成'}
						</CardTitle>
					</div>
					{isFirstSetup && (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => setSelectedOption(null)}
							disabled={isLoading}
						>
							<ArrowLeft className="h-4 w-4" />
						</Button>
					)}
				</div>
				<CardDescription>
					{isFirstSetup
						? 'タスク管理を開始するために、最初のワークスペースを作成しましょう'
						: '新しい組織を作成して、チームでのコラボレーションを始めましょう'}
				</CardDescription>
			</CardHeader>
			<form onSubmit={handleSubmit}>
				<CardContent className="space-y-6">
					{/* Organization Type Selection */}
					<div className="space-y-3">
						<Label>ワークスペースタイプ</Label>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							{organizationTypes.map((type) => {
								const Icon = type.icon;
								return (
									<button
										key={type.value}
										type="button"
										onClick={() => setOrganizationType(type.value as any)}
										className={`p-4 rounded-lg border-2 text-left transition-all ${
											organizationType === type.value
												? 'border-primary bg-primary/5'
												: 'border-border hover:border-primary/50'
										}`}
										disabled={isLoading}
									>
										<Icon
											className={`h-8 w-8 mb-2 ${
												organizationType === type.value
													? 'text-primary'
													: 'text-muted-foreground'
											}`}
										/>
										<h3 className="font-medium text-sm">{type.label}</h3>
										<p className="text-xs text-muted-foreground mt-1">
											{type.description}
										</p>
									</button>
								);
							})}
						</div>
					</div>

					{/* Organization Name */}
					<div className="space-y-2">
						<Label htmlFor="organizationName">組織名 *</Label>
						<Input
							id="organizationName"
							type="text"
							placeholder={
								organizationType === 'personal'
									? '例: 個人のタスク管理'
									: organizationType === 'team'
										? '例: 開発チーム'
										: '例: 株式会社サンプル'
							}
							value={organizationName}
							onChange={(e) => setOrganizationName(e.target.value)}
							disabled={isLoading}
							className={errors.name ? 'border-red-500' : ''}
						/>
						{errors.name && (
							<p className="text-sm text-red-500 mt-1">{errors.name}</p>
						)}
					</div>

					{/* Description */}
					<div className="space-y-2">
						<Label htmlFor="description">説明（任意）</Label>
						<Textarea
							id="description"
							placeholder="このワークスペースの目的や使い方を記載してください"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							disabled={isLoading}
							rows={3}
							className={errors.description ? 'border-red-500' : ''}
						/>
						{errors.description && (
							<p className="text-sm text-red-500 mt-1">{errors.description}</p>
						)}
						<p className="text-xs text-muted-foreground">
							{description.length}/200文字
						</p>
					</div>

					{/* Default Settings Info */}
					<div className="rounded-lg bg-muted p-4 space-y-2">
						<h4 className="text-sm font-medium">デフォルト設定</h4>
						<ul className="text-sm text-muted-foreground space-y-1">
							<li>• あなたは組織の管理者として登録されます</li>
							<li>• 後からメンバーを招待できます</li>
							<li>• 組織の設定はいつでも変更可能です</li>
						</ul>
					</div>
				</CardContent>

				<CardFooter className="flex flex-col space-y-4">
					<Button type="submit" className="w-full" disabled={isLoading}>
						{isLoading ? (
							<>
								<Spinner className="mr-2 h-4 w-4" />
								作成中...
							</>
						) : (
							<>
								<Rocket className="mr-2 h-4 w-4" />
								ワークスペースを作成
							</>
						)}
					</Button>

					{!isFirstSetup && (
						<Button
							type="button"
							variant="outline"
							className="w-full"
							onClick={() => router.back()}
							disabled={isLoading}
						>
							キャンセル
						</Button>
					)}
				</CardFooter>
			</form>
		</Card>
	);
}
