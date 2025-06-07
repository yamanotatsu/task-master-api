'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2, Building } from 'lucide-react';

export function OrganizationSetup() {
  const [organizationName, setOrganizationName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session, refreshOrganizations } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/v1/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ name: organizationName }),
      });

      if (!response.ok) {
        throw new Error('組織の作成に失敗しました');
      }

      await refreshOrganizations();
      router.push('/');
    } catch (err: any) {
      setError(err.message || '組織の作成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">組織を作成</CardTitle>
        <CardDescription>
          Task Masterを使用するために組織を作成してください
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="organizationName" className="text-sm font-medium">
              組織名
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="organizationName"
                type="text"
                placeholder="例: 株式会社サンプル"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                className="pl-10"
                required
                disabled={isLoading}
                maxLength={100}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              後から変更することができます
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !organizationName.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                作成中...
              </>
            ) : (
              '組織を作成'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}