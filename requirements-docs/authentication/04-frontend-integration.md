# フロントエンド統合ガイド

## 1. 概要

このドキュメントでは、Task Masterフロントエンド（Next.js）に認証機能を統合するための詳細な実装ガイドを提供します。

## 2. 認証状態管理

### 2.1 AuthContext の実装

```typescript
// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (fullName: string, email: string, password: string) => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // トークン管理
  const tokenManager = {
    getAccessToken: () => localStorage.getItem('accessToken'),
    getRefreshToken: () => localStorage.getItem('refreshToken'),
    setTokens: (accessToken: string, refreshToken: string) => {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    },
    clearTokens: () => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  };

  // 初期化時の認証チェック
  useEffect(() => {
    const initAuth = async () => {
      const accessToken = tokenManager.getAccessToken();
      if (accessToken) {
        try {
          const response = await api.get('/users/profile');
          setUser(response.data.profile);
        } catch (error) {
          // トークンが無効な場合はリフレッシュを試行
          try {
            await refreshToken();
          } catch {
            tokenManager.clearTokens();
          }
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    const { user, tokens } = response.data;
    
    tokenManager.setTokens(tokens.accessToken, tokens.refreshToken);
    setUser(user);
    
    // 組織チェック
    const orgsResponse = await api.get('/organizations');
    if (orgsResponse.data.organizations.length === 0) {
      router.push('/setup-organization');
    } else {
      router.push('/dashboard');
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      tokenManager.clearTokens();
      setUser(null);
      router.push('/login');
    }
  };

  const signup = async (fullName: string, email: string, password: string) => {
    await api.post('/auth/signup', { fullName, email, password });
    router.push('/signup-success');
  };

  const refreshToken = async () => {
    const refreshTokenValue = tokenManager.getRefreshToken();
    if (!refreshTokenValue) throw new Error('No refresh token');

    const response = await api.post('/auth/refresh', { 
      refreshToken: refreshTokenValue 
    });
    const { tokens } = response.data;
    
    tokenManager.setTokens(tokens.accessToken, tokens.refreshToken);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      signup,
      refreshToken
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### 2.2 APIクライアントの更新

```typescript
// lib/api.ts
import axios, { AxiosInstance, AxiosError } from 'axios';

interface ApiError {
  code: string;
  message: string;
  details?: any[];
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // リクエストインターセプター
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // レスポンスインターセプター
    this.client.interceptors.response.use(
      (response) => response.data,
      async (error: AxiosError<ApiResponse>) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && originalRequest) {
          if (!this.isRefreshing) {
            this.isRefreshing = true;

            try {
              const refreshToken = localStorage.getItem('refreshToken');
              const response = await this.post('/auth/refresh', { refreshToken });
              const { accessToken, refreshToken: newRefreshToken } = response.data.tokens;
              
              localStorage.setItem('accessToken', accessToken);
              localStorage.setItem('refreshToken', newRefreshToken);
              
              this.onRefreshed(accessToken);
              this.refreshSubscribers = [];
            } catch (refreshError) {
              this.onRefreshFailed();
              window.location.href = '/login';
              return Promise.reject(refreshError);
            } finally {
              this.isRefreshing = false;
            }
          }

          return new Promise((resolve) => {
            this.subscribeTokenRefresh((token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(this.client(originalRequest));
            });
          });
        }

        return Promise.reject(error);
      }
    );
  }

  private subscribeTokenRefresh(cb: (token: string) => void) {
    this.refreshSubscribers.push(cb);
  }

  private onRefreshed(token: string) {
    this.refreshSubscribers.forEach((cb) => cb(token));
  }

  private onRefreshFailed() {
    this.refreshSubscribers = [];
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  // APIメソッド
  async get<T = any>(url: string, params?: any): Promise<ApiResponse<T>> {
    return this.client.get(url, { params });
  }

  async post<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.client.post(url, data);
  }

  async put<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.client.put(url, data);
  }

  async delete<T = any>(url: string): Promise<ApiResponse<T>> {
    return this.client.delete(url);
  }
}

export const api = new ApiClient();
```

## 3. 認証UIコンポーネント

### 3.1 ログインフォーム

```typescript
// components/auth/LoginForm.tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { Spinner } from '@/components/ui/spinner';
import Link from 'next/link';

const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginForm: React.FC = () => {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    setIsLoading(true);

    try {
      await login(data.email, data.password);
    } catch (err: any) {
      if (err.response?.data?.error?.code === 'AUTH_INVALID_CREDENTIALS') {
        setError('メールアドレスまたはパスワードが正しくありません');
      } else if (err.response?.data?.error?.code === 'AUTH_EMAIL_NOT_VERIFIED') {
        setError('メールアドレスの確認が完了していません。確認メールをご確認ください。');
      } else {
        setError('ログインに失敗しました。後でもう一度お試しください。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          メールアドレス
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          {...register('email')}
          className="mt-1"
          disabled={isLoading}
        />
        {errors.email && (
          <ErrorMessage message={errors.email.message} />
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          パスワード
        </label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register('password')}
          className="mt-1"
          disabled={isLoading}
        />
        {errors.password && (
          <ErrorMessage message={errors.password.message} />
        )}
      </div>

      <div className="flex items-center justify-between">
        <Link
          href="/forgot-password"
          className="text-sm text-blue-600 hover:text-blue-500"
        >
          パスワードを忘れた方
        </Link>
      </div>

      {error && (
        <ErrorMessage message={error} />
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? <Spinner /> : 'ログイン'}
      </Button>

      <div className="text-center text-sm">
        アカウントをお持ちでない方は
        <Link href="/signup" className="ml-1 font-medium text-blue-600 hover:text-blue-500">
          新規登録
        </Link>
      </div>
    </form>
  );
};
```

### 3.2 新規登録フォーム

```typescript
// components/auth/SignupForm.tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { Spinner } from '@/components/ui/spinner';

const signupSchema = z.object({
  fullName: z.string()
    .min(1, '氏名を入力してください')
    .max(100, '氏名は100文字以内で入力してください'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string()
    .min(8, 'パスワードは8文字以上で入力してください')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'パスワードは大文字、小文字、数字を含む必要があります'
    ),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'パスワードが一致しません',
  path: ['confirmPassword'],
});

type SignupFormData = z.infer<typeof signupSchema>;

export const SignupForm: React.FC = () => {
  const { signup } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormData) => {
    setError(null);
    setIsLoading(true);

    try {
      await signup(data.fullName, data.email, data.password);
    } catch (err: any) {
      if (err.response?.data?.error?.code === 'AUTH_EMAIL_EXISTS') {
        setError('このメールアドレスは既に登録されています');
      } else {
        setError('登録に失敗しました。後でもう一度お試しください。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // パスワード強度インジケーター
  const [passwordStrength, setPasswordStrength] = useState(0);

  const checkPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;
    setPasswordStrength(strength);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
          氏名
        </label>
        <Input
          id="fullName"
          type="text"
          autoComplete="name"
          {...register('fullName')}
          className="mt-1"
          disabled={isLoading}
        />
        {errors.fullName && (
          <ErrorMessage message={errors.fullName.message} />
        )}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          メールアドレス
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          {...register('email')}
          className="mt-1"
          disabled={isLoading}
        />
        {errors.email && (
          <ErrorMessage message={errors.email.message} />
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          パスワード
        </label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          {...register('password', {
            onChange: (e) => checkPasswordStrength(e.target.value)
          })}
          className="mt-1"
          disabled={isLoading}
        />
        {errors.password && (
          <ErrorMessage message={errors.password.message} />
        )}
        
        {/* パスワード強度表示 */}
        <div className="mt-2">
          <div className="flex space-x-1">
            {[1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={`h-2 flex-1 rounded ${
                  passwordStrength >= level
                    ? level <= 2 ? 'bg-red-500' : level === 3 ? 'bg-yellow-500' : 'bg-green-500'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {passwordStrength === 0 && 'パスワードを入力してください'}
            {passwordStrength === 1 && '弱い'}
            {passwordStrength === 2 && '普通'}
            {passwordStrength === 3 && '強い'}
            {passwordStrength === 4 && 'とても強い'}
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
          パスワード（確認）
        </label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...register('confirmPassword')}
          className="mt-1"
          disabled={isLoading}
        />
        {errors.confirmPassword && (
          <ErrorMessage message={errors.confirmPassword.message} />
        )}
      </div>

      {error && (
        <ErrorMessage message={error} />
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? <Spinner /> : '登録する'}
      </Button>

      <p className="text-xs text-gray-500 text-center">
        登録することで、
        <Link href="/terms" className="text-blue-600 hover:text-blue-500">利用規約</Link>
        と
        <Link href="/privacy" className="text-blue-600 hover:text-blue-500">プライバシーポリシー</Link>
        に同意したものとみなされます。
      </p>
    </form>
  );
};
```

### 3.3 組織セットアップコンポーネント

```typescript
// components/auth/OrganizationSetup.tsx
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { Spinner } from '@/components/ui/spinner';

const organizationSchema = z.object({
  name: z.string()
    .min(1, '組織名を入力してください')
    .max(100, '組織名は100文字以内で入力してください'),
  description: z.string()
    .max(500, '説明は500文字以内で入力してください')
    .optional(),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

export const OrganizationSetup: React.FC = () => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
  });

  const onSubmit = async (data: OrganizationFormData) => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await api.post('/organizations', data);
      router.push('/dashboard');
    } catch (err: any) {
      setError('組織の作成に失敗しました。後でもう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          組織を作成
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          プロジェクトを管理するための組織を作成しましょう
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            組織名 <span className="text-red-500">*</span>
          </label>
          <Input
            id="name"
            type="text"
            {...register('name')}
            className="mt-1"
            placeholder="例: 株式会社サンプル"
            disabled={isLoading}
          />
          {errors.name && (
            <ErrorMessage message={errors.name.message} />
          )}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            説明（任意）
          </label>
          <Textarea
            id="description"
            {...register('description')}
            className="mt-1"
            rows={3}
            placeholder="組織の説明を入力してください"
            disabled={isLoading}
          />
          {errors.description && (
            <ErrorMessage message={errors.description.message} />
          )}
        </div>

        {error && (
          <ErrorMessage message={error} />
        )}

        <div className="flex space-x-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => router.push('/dashboard')}
            disabled={isLoading}
          >
            スキップ
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={isLoading}
          >
            {isLoading ? <Spinner /> : '作成する'}
          </Button>
        </div>
      </form>
    </div>
  );
};
```

## 4. 保護されたルートの実装

### 4.1 ProtectedRoute コンポーネント

```typescript
// components/auth/ProtectedRoute.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  redirectTo = '/login',
}) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && requireAuth && !user) {
      router.push(redirectTo);
    }
  }, [user, loading, requireAuth, redirectTo, router]);

  if (loading) {
    return <SkeletonLoader />;
  }

  if (requireAuth && !user) {
    return null;
  }

  return <>{children}</>;
};
```

### 4.2 レイアウトコンポーネントの更新

```typescript
// app/layout.tsx
import { AuthProvider } from '@/contexts/AuthContext';
import { OrganizationProvider } from '@/contexts/OrganizationContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <AuthProvider>
          <OrganizationProvider>
            {children}
          </OrganizationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
```

### 4.3 ページコンポーネントの例

```typescript
// app/dashboard/page.tsx
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardContent } from '@/components/dashboard/DashboardContent';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
```

## 5. 組織管理コンテキスト

```typescript
// contexts/OrganizationContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from './AuthContext';

interface Organization {
  id: string;
  name: string;
  description?: string;
  role: 'admin' | 'member';
  memberCount: number;
  projectCount: number;
  joinedAt: string;
}

interface OrganizationContextType {
  organizations: Organization[];
  currentOrganization: Organization | null;
  loading: boolean;
  setCurrentOrganization: (org: Organization) => void;
  refreshOrganizations: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadOrganizations();
    } else {
      setOrganizations([]);
      setCurrentOrganization(null);
      setLoading(false);
    }
  }, [user]);

  const loadOrganizations = async () => {
    try {
      const response = await api.get<{ organizations: Organization[] }>('/organizations');
      const orgs = response.data.organizations;
      setOrganizations(orgs);

      // 保存された組織IDまたは最初の組織を選択
      const savedOrgId = localStorage.getItem('currentOrganizationId');
      const savedOrg = orgs.find(org => org.id === savedOrgId);
      setCurrentOrganization(savedOrg || orgs[0] || null);
    } catch (error) {
      console.error('Failed to load organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetCurrentOrganization = (org: Organization) => {
    setCurrentOrganization(org);
    localStorage.setItem('currentOrganizationId', org.id);
  };

  const refreshOrganizations = async () => {
    await loadOrganizations();
  };

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        currentOrganization,
        loading,
        setCurrentOrganization: handleSetCurrentOrganization,
        refreshOrganizations,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};
```

## 6. 組織切り替えUI

```typescript
// components/common/OrganizationSwitcher.tsx
import React from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown, Building2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

export const OrganizationSwitcher: React.FC = () => {
  const { organizations, currentOrganization, setCurrentOrganization } = useOrganization();
  const router = useRouter();

  if (!currentOrganization) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <div className="flex items-center">
            <Building2 className="mr-2 h-4 w-4" />
            <span className="truncate">{currentOrganization.name}</span>
          </div>
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>組織を選択</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => setCurrentOrganization(org)}
            className={org.id === currentOrganization.id ? 'bg-gray-100' : ''}
          >
            <Building2 className="mr-2 h-4 w-4" />
            <div className="flex-1">
              <div className="font-medium">{org.name}</div>
              <div className="text-xs text-gray-500">{org.role}</div>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/organizations/new')}>
          <Plus className="mr-2 h-4 w-4" />
          新しい組織を作成
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
```

## 7. エラーハンドリング

```typescript
// hooks/useErrorHandler.ts
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export const useErrorHandler = () => {
  const router = useRouter();

  const handleError = useCallback((error: any) => {
    const errorCode = error.response?.data?.error?.code;
    const errorMessage = error.response?.data?.error?.message;

    switch (errorCode) {
      case 'AUTH_TOKEN_EXPIRED':
      case 'AUTH_TOKEN_INVALID':
        toast.error('セッションの有効期限が切れました。再度ログインしてください。');
        router.push('/login');
        break;

      case 'AUTHZ_INSUFFICIENT_PERMISSIONS':
        toast.error('この操作を実行する権限がありません。');
        break;

      case 'AUTHZ_NOT_ORGANIZATION_MEMBER':
        toast.error('この組織のメンバーではありません。');
        break;

      case 'RESOURCE_NOT_FOUND':
        toast.error('リソースが見つかりません。');
        break;

      case 'VALIDATION_ERROR':
        const details = error.response?.data?.error?.details;
        if (details && Array.isArray(details)) {
          details.forEach((detail: any) => {
            toast.error(detail.message);
          });
        } else {
          toast.error(errorMessage || '入力内容に誤りがあります。');
        }
        break;

      default:
        toast.error(errorMessage || 'エラーが発生しました。');
    }
  }, [router]);

  return { handleError };
};
```

## 8. セキュリティベストプラクティス

### 8.1 XSS対策
- React の自動エスケープ機能を活用
- dangerouslySetInnerHTML の使用を避ける
- ユーザー入力の適切なサニタイゼーション

### 8.2 CSRF対策
- SameSite Cookie属性の使用
- カスタムヘッダーによる検証

### 8.3 セキュアなトークン管理
- HTTPOnly Cookieの使用検討（将来実装）
- localStorage使用時の注意点
- トークンの適切な有効期限設定

### 8.4 入力検証
- クライアントサイドとサーバーサイドの両方で検証
- zodによる型安全な検証
- SQLインジェクション対策

## 9. パフォーマンス最適化

### 9.1 認証状態のキャッシング
- React Query / SWRの活用
- 適切なキャッシュ戦略

### 9.2 遅延読み込み
- 認証関連コンポーネントの動的インポート
- ルートレベルでのコード分割

### 9.3 最適化されたAPI呼び出し
- バッチリクエストの実装
- 不要なAPI呼び出しの削減

## 10. テスト戦略

### 10.1 単体テスト
```typescript
// __tests__/auth/LoginForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from '@/components/auth/LoginForm';
import { AuthProvider } from '@/contexts/AuthContext';

describe('LoginForm', () => {
  it('should display validation errors for invalid input', async () => {
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );

    const submitButton = screen.getByRole('button', { name: 'ログイン' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('有効なメールアドレスを入力してください')).toBeInTheDocument();
      expect(screen.getByText('パスワードを入力してください')).toBeInTheDocument();
    });
  });
});
```

### 10.2 統合テスト
- 認証フロー全体のE2Eテスト
- APIモックを使用したテスト
- エラーケースのテスト