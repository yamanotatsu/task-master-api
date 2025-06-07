# フロントエンド統合ガイド

## 1. Supabase Client設定

### 環境変数
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### クライアント初期化
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      storage: window.localStorage,
    },
  }
);
```

## 2. 認証コンテキスト実装

### AuthContext構造
```typescript
interface AuthContextType {
  // 状態
  user: User | null;
  session: Session | null;
  organizations: Organization[];
  currentOrganization: Organization | null;
  loading: boolean;
  error: string | null;
  
  // メソッド
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: { fullName?: string }) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  setCurrentOrganization: (org: Organization) => void;
  refreshOrganizations: () => Promise<void>;
}
```

## 3. 認証フロー実装例

### ログインフロー
```typescript
// 1. ログインフォーム送信
const handleLogin = async (email: string, password: string) => {
  try {
    await signIn(email, password);
    // 2. 認証成功後、自動的に組織情報を取得
    // 3. 組織がない場合は /setup-organization へリダイレクト
    // 4. 組織がある場合はダッシュボードへ
  } catch (error) {
    // エラーハンドリング
  }
};
```

### 組織作成フロー
```typescript
// 初回ログイン時
const handleOrganizationSetup = async (name: string) => {
  const response = await fetch('/api/v1/organizations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ name }),
  });
  
  if (response.ok) {
    await refreshOrganizations();
    router.push('/');
  }
};
```

## 4. 保護されたルート

### ルート保護パターン
```typescript
// pages/protected-page.tsx
export default function ProtectedPage() {
  useRequireAuth(); // 認証チェック
  
  return <div>Protected Content</div>;
}

// または

export default function ProtectedPage() {
  return (
    <ProtectedRoute>
      <div>Protected Content</div>
    </ProtectedRoute>
  );
}
```

### 組織必須ページ
```typescript
export default function OrgRequiredPage() {
  useRequireAuth({ requireOrganization: true });
  const { currentOrganization } = useOrganization();
  
  return <div>Organization: {currentOrganization.name}</div>;
}
```

## 5. API通信パターン

### 認証ヘッダー付きリクエスト
```typescript
class ApiClient {
  private getAuthToken(): string | null {
    const supabaseAuth = localStorage.getItem('sb-auth-token');
    if (supabaseAuth) {
      const authData = JSON.parse(supabaseAuth);
      return authData?.access_token || null;
    }
    return null;
  }

  private async fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = this.getAuthToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
    
    // 401エラー時の処理
    if (response.status === 401) {
      // トークンリフレッシュまたは再ログイン
    }
    
    return response.json();
  }
}
```

## 6. UIコンポーネント実装例

### ユーザーメニュー
```tsx
export function UserMenu() {
  const { user, signOut } = useAuth();
  const { organizations, currentOrganization, setCurrentOrganization } = useOrganization();
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Avatar>
          <AvatarFallback>{user?.email?.[0].toUpperCase()}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* 組織切り替え */}
        {organizations.length > 1 && (
          <>
            <DropdownMenuLabel>組織を選択</DropdownMenuLabel>
            {organizations.map(org => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => setCurrentOrganization(org)}
              >
                {org.name} {org.id === currentOrganization?.id && '✓'}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}
        
        <DropdownMenuItem onClick={() => router.push('/settings/profile')}>
          プロファイル設定
        </DropdownMenuItem>
        <DropdownMenuItem onClick={signOut}>
          ログアウト
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

## 7. エラーハンドリング

### グローバルエラーハンドラー
```typescript
// エラー境界コンポーネント
export function AuthErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={<AuthErrorFallback />}
      onError={(error) => {
        if (error.message.includes('401')) {
          // 認証エラー処理
        }
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
```

### API エラー処理
```typescript
const handleApiError = (error: any) => {
  if (error.status === 401) {
    // 認証エラー: 再ログイン
    router.push('/auth/login');
  } else if (error.status === 403) {
    // 権限エラー
    toast.error('この操作を実行する権限がありません');
  } else {
    // その他のエラー
    toast.error(error.message || 'エラーが発生しました');
  }
};
```

## 8. 状態管理ベストプラクティス

### 組織コンテキストの使用
```typescript
// 現在の組織に基づいてデータをフィルタリング
const { currentOrganization } = useOrganization();

const { data: projects } = useQuery({
  queryKey: ['projects', currentOrganization?.id],
  queryFn: () => api.getProjects({ organizationId: currentOrganization?.id }),
  enabled: !!currentOrganization,
});
```

### ローカルストレージ同期
```typescript
// 組織選択の永続化
useEffect(() => {
  if (currentOrganization) {
    localStorage.setItem('currentOrganizationId', currentOrganization.id);
  }
}, [currentOrganization]);
```

## 9. セキュリティ考慮事項

1. **トークン管理**
   - アクセストークンは短期間（1時間）
   - リフレッシュトークンで自動更新
   - ログアウト時は両方のトークンをクリア

2. **クロスサイトスクリプティング（XSS）対策**
   - ユーザー入力は常にサニタイズ
   - dangerouslySetInnerHTMLの使用を避ける

3. **CSRF対策**
   - SameSite Cookieの使用
   - APIリクエストにCSRFトークンを含める