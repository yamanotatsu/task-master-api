'use client';

import { useRequireAuth } from '@/hooks/useRequireAuth';
import { ProfileForm } from '@/components/profile/ProfileForm';

export default function ProfilePage() {
  useRequireAuth();

  return (
    <div className="max-w-screen-md mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">プロファイル設定</h1>
        <p className="text-muted-foreground mt-2">
          アカウント情報とセキュリティ設定を管理します
        </p>
      </div>
      <ProfileForm />
    </div>
  );
}