# フロントエンド統合ガイド

## 1. 概要

このドキュメントでは、React/Next.jsアプリケーションに認証機能を統合する方法を説明します。

### 必要なパッケージ

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "@tanstack/react-query": "^5.0.0",
    "js-cookie": "^3.0.5",
    "react-hook-form": "^7.48.0",
    "zod": "^3.22.0"
  }
}
```

## 2. 認証コンテキストの実装

### 2.1 AuthContext.tsx

```typescript
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // 初期認証状態の確認
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const accessToken = Cookies.get('access_token');
      if (!accessToken) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/v1/auth/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.ok) {
        const { data } = await response.json();
        setUser(data.user);
        setSession(data.session);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message);
    }

    const { data } = await response.json();
    
    // トークンをCookieに保存
    Cookies.set('access_token', data.session.access_token, {
      expires: new Date(Date.now() + data.session.expires_in * 1000),
      secure: true,
      sameSite: 'strict'
    });
    Cookies.set('refresh_token', data.session.refresh_token, {
      expires: 7, // 7日間
      secure: true,
      sameSite: 'strict'
    });

    setUser(data.user);
    setSession(data.session);

    // 組織確認
    const orgsResponse = await fetch('/api/v1/organizations', {
      headers: {
        'Authorization': `Bearer ${data.session.access_token}`
      }
    });

    const { data: orgs } = await orgsResponse.json();
    
    if (orgs.length === 0) {
      router.push('/setup-organization');
    } else {
      router.push('/dashboard');
    }
  };

  const signup = async (fullName: string, email: string, password: string) => {
    const response = await fetch('/api/v1/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message);
    }

    // サインアップ成功後、確認メール送信画面へ
    router.push('/auth/verify-email');
  };

  const logout = async () => {
    const accessToken = Cookies.get('access_token');
    
    if (accessToken) {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
    }

    // クリーンアップ
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    setUser(null);
    setSession(null);
    
    router.push('/login');
  };

  const refreshToken = async () => {
    const refreshToken = Cookies.get('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token');
    }

    const response = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken })
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const { data } = await response.json();
    
    Cookies.set('access_token', data.access_token, {
      expires: new Date(Date.now() + data.expires_in * 1000),
      secure: true,
      sameSite: 'strict'
    });
    Cookies.set('refresh_token', data.refresh_token, {
      expires: 7,
      secure: true,
      sameSite: 'strict'
    });

    setSession(data);
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        session, 
        loading, 
        login, 
        signup, 
        logout, 
        refreshToken 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

## 3. 認証コンポーネント

### 3.1 ログインフォーム

```typescript
// components/auth/LoginForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/useToast';

const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上である必要があります')
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      toast({
        title: 'ログインしました',
        variant: 'success'
      });
    } catch (error) {
      toast({
        title: 'ログインに失敗しました',
        description: error instanceof Error ? error.message : 'エラーが発生しました',
        variant: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-2">
          メールアドレス
        </label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          placeholder="your@email.com"
          className={errors.email ? 'border-red-500' : ''}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-2">
          パスワード
        </label>
        <Input
          id="password"
          type="password"
          {...register('password')}
          placeholder="••••••••"
          className={errors.password ? 'border-red-500' : ''}
        />
        {errors.password && (
          <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? 'ログイン中...' : 'ログイン'}
      </Button>
    </form>
  );
}
```

### 3.2 サインアップフォーム

```typescript
// components/auth/SignupForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/useToast';

const signupSchema = z.object({
  fullName: z.string().min(1, '氏名を入力してください'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string()
    .min(8, 'パスワードは8文字以上である必要があります')
    .regex(/[A-Z]/, '大文字を含む必要があります')
    .regex(/[a-z]/, '小文字を含む必要があります')
    .regex(/[0-9]/, '数字を含む必要があります'),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: 'パスワードが一致しません',
  path: ['confirmPassword']
});

type SignupFormData = z.infer<typeof signupSchema>;

export function SignupForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = useAuth();
  const { toast } = useToast();
  
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema)
  });

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    try {
      await signup(data.fullName, data.email, data.password);
      toast({
        title: 'アカウントを作成しました',
        description: 'メールアドレスに確認メールを送信しました',
        variant: 'success'
      });
    } catch (error) {
      toast({
        title: 'アカウント作成に失敗しました',
        description: error instanceof Error ? error.message : 'エラーが発生しました',
        variant: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium mb-2">
          氏名
        </label>
        <Input
          id="fullName"
          type="text"
          {...register('fullName')}
          placeholder="山田太郎"
          className={errors.fullName ? 'border-red-500' : ''}
        />
        {errors.fullName && (
          <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-2">
          メールアドレス
        </label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          placeholder="your@email.com"
          className={errors.email ? 'border-red-500' : ''}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-2">
          パスワード
        </label>
        <Input
          id="password"
          type="password"
          {...register('password')}
          placeholder="••••••••"
          className={errors.password ? 'border-red-500' : ''}
        />
        {errors.password && (
          <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
          パスワード（確認）
        </label>
        <Input
          id="confirmPassword"
          type="password"
          {...register('confirmPassword')}
          placeholder="••••••••"
          className={errors.confirmPassword ? 'border-red-500' : ''}
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? 'アカウント作成中...' : 'アカウントを作成'}
      </Button>
    </form>
  );
}
```

## 4. 保護されたルートの実装

### 4.1 ProtectedRoute コンポーネント

```typescript
// components/auth/ProtectedRoute.tsx
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Spinner } from '@/components/ui/spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOrganization?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requireOrganization = true 
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
```

### 4.2 レイアウトでの使用例

```typescript
// app/(authenticated)/layout.tsx
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function AuthenticatedLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* ナビゲーションバーなど */}
        <main>{children}</main>
      </div>
    </ProtectedRoute>
  );
}
```

## 5. 組織管理コンポーネント

### 5.1 組織作成フォーム

```typescript
// components/organization/CreateOrganizationForm.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/useToast';
import { api } from '@/lib/api';

const createOrgSchema = z.object({
  name: z.string().min(1, '組織名を入力してください').max(100, '組織名は100文字以内で入力してください')
});

type CreateOrgFormData = z.infer<typeof createOrgSchema>;

export function CreateOrganizationForm() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<CreateOrgFormData>({
    resolver: zodResolver(createOrgSchema)
  });

  const onSubmit = async (data: CreateOrgFormData) => {
    setIsLoading(true);
    try {
      await api.post('/organizations', data);
      toast({
        title: '組織を作成しました',
        variant: 'success'
      });
      router.push('/dashboard');
    } catch (error) {
      toast({
        title: '組織の作成に失敗しました',
        description: 'もう一度お試しください',
        variant: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">組織を作成</h2>
        <p className="text-gray-600">
          プロジェクトやタスクを管理するための組織を作成します
        </p>
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-2">
          組織名
        </label>
        <Input
          id="name"
          type="text"
          {...register('name')}
          placeholder="株式会社サンプル"
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? '作成中...' : '組織を作成'}
      </Button>
    </form>
  );
}
```

### 5.2 組織選択コンポーネント

```typescript
// components/organization/OrganizationSelector.tsx
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { useOrganization } from '@/contexts/OrganizationContext';

interface Organization {
  id: string;
  name: string;
  role: 'admin' | 'member';
}

export function OrganizationSelector() {
  const { currentOrganization, setCurrentOrganization } = useOrganization();
  
  const { data: organizations, isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const response = await api.get('/organizations');
      return response.data.data as Organization[];
    }
  });

  const handleChange = (orgId: string) => {
    const org = organizations?.find(o => o.id === orgId);
    if (org) {
      setCurrentOrganization(org);
      // LocalStorageに保存
      localStorage.setItem('current_organization', JSON.stringify(org));
    }
  };

  if (isLoading) {
    return <div className="animate-pulse h-10 w-48 bg-gray-200 rounded" />;
  }

  return (
    <Select value={currentOrganization?.id} onValueChange={handleChange}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="組織を選択" />
      </SelectTrigger>
      <SelectContent>
        {organizations?.map(org => (
          <SelectItem key={org.id} value={org.id}>
            <div className="flex items-center gap-2">
              <span>{org.name}</span>
              {org.role === 'admin' && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                  管理者
                </span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

## 6. APIクライアントの設定

### 6.1 Axiosインターセプター

```typescript
// lib/api.ts
import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// リクエストインターセプター
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// レスポンスインターセプター
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = Cookies.get('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { refresh_token: refreshToken }
        );

        const { access_token, refresh_token: newRefreshToken } = response.data.data;

        Cookies.set('access_token', access_token);
        Cookies.set('refresh_token', newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // リフレッシュ失敗時はログイン画面へ
        Cookies.remove('access_token');
        Cookies.remove('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

## 7. React Queryの設定

### 7.1 Query Client設定

```typescript
// lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5分
      gcTime: 1000 * 60 * 10, // 10分（旧cacheTime）
      retry: (failureCount, error: any) => {
        // 401エラーの場合はリトライしない
        if (error?.response?.status === 401) {
          return false;
        }
        return failureCount < 3;
      }
    }
  }
});
```

### 7.2 カスタムフック例

```typescript
// hooks/useOrganizations.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useOrganizations() {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const response = await api.get('/organizations');
      return response.data.data;
    }
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { name: string }) => {
      const response = await api.post('/organizations', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    }
  });
}

export function useOrganizationMembers(orgId: string) {
  return useQuery({
    queryKey: ['organizations', orgId, 'members'],
    queryFn: async () => {
      const response = await api.get(`/organizations/${orgId}/members`);
      return response.data.data;
    },
    enabled: !!orgId
  });
}
```

## 8. 統合チェックリスト

### 実装前の準備
- [ ] 必要なパッケージのインストール
- [ ] 環境変数の設定（API_URL等）
- [ ] TypeScript型定義の準備

### 認証機能
- [ ] AuthContextの実装
- [ ] ログイン/サインアップフォームの実装
- [ ] 保護されたルートの設定
- [ ] トークン管理の実装

### API統合
- [ ] APIクライアントの設定
- [ ] インターセプターの実装
- [ ] エラーハンドリング

### 組織管理
- [ ] 組織作成フローの実装
- [ ] 組織選択機能の実装
- [ ] メンバー管理UIの実装

### テスト
- [ ] 認証フローのE2Eテスト
- [ ] APIモックの作成
- [ ] エラーケースのテスト