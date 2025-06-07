# テスト計画書

## 1. テスト戦略概要

### 1.1 テストレベル
1. **単体テスト（Unit Tests）**: 個々のコンポーネント・関数のテスト
2. **統合テスト（Integration Tests）**: APIエンドポイントとデータベースの連携テスト
3. **E2Eテスト（End-to-End Tests）**: ユーザーシナリオ全体のテスト
4. **セキュリティテスト**: 脆弱性スキャンとペネトレーションテスト

### 1.2 テストカバレッジ目標
- 単体テスト: 80%以上
- 統合テスト: 主要なAPIエンドポイント100%
- E2Eテスト: クリティカルパス100%

## 2. APIテスト

### 2.1 認証エンドポイントテスト

#### POST /api/v1/auth/signup
```javascript
describe('POST /api/v1/auth/signup', () => {
  it('should create a new user with valid data', async () => {
    const response = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        fullName: 'Test User',
        email: 'test@example.com',
        password: 'SecurePass123!'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.userId).toBeDefined();
  });

  it('should reject duplicate email', async () => {
    // First signup
    await request(app)
      .post('/api/v1/auth/signup')
      .send({
        fullName: 'Test User',
        email: 'duplicate@example.com',
        password: 'SecurePass123!'
      });
    
    // Duplicate attempt
    const response = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        fullName: 'Another User',
        email: 'duplicate@example.com',
        password: 'AnotherPass123!'
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('already registered');
  });

  it('should validate password requirements', async () => {
    const response = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        fullName: 'Test User',
        email: 'test@example.com',
        password: 'weak'
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('password');
  });
});
```

#### POST /api/v1/auth/login
```javascript
describe('POST /api/v1/auth/login', () => {
  beforeEach(async () => {
    // Create test user
    await createTestUser({
      email: 'test@example.com',
      password: 'TestPass123!'
    });
  });

  it('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'TestPass123!'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.data.session.access_token).toBeDefined();
    expect(response.body.data.user.email).toBe('test@example.com');
  });

  it('should reject invalid password', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'WrongPassword'
      });
    
    expect(response.status).toBe(401);
    expect(response.body.error).toContain('Invalid credentials');
  });

  it('should handle rate limiting', async () => {
    // Make 5 failed attempts
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword'
        });
    }
    
    // 6th attempt should be rate limited
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'TestPass123!'
      });
    
    expect(response.status).toBe(429);
    expect(response.body.error).toContain('Too many attempts');
  });
});
```

### 2.2 組織管理エンドポイントテスト

#### POST /api/v1/organizations
```javascript
describe('POST /api/v1/organizations', () => {
  let authToken;
  
  beforeEach(async () => {
    const user = await createTestUser();
    authToken = await getAuthToken(user);
  });

  it('should create organization for authenticated user', async () => {
    const response = await request(app)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Organization'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.data.name).toBe('Test Organization');
    expect(response.body.data.role).toBe('admin');
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .post('/api/v1/organizations')
      .send({
        name: 'Test Organization'
      });
    
    expect(response.status).toBe(401);
  });
});
```

## 3. フロントエンドテスト

### 3.1 コンポーネント単体テスト

#### LoginForm.test.tsx
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from '@/components/auth/LoginForm';
import { useAuth } from '@/hooks/useAuth';

jest.mock('@/hooks/useAuth');

describe('LoginForm', () => {
  const mockSignIn = jest.fn();
  
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({
      signIn: mockSignIn,
    });
  });

  it('should render login form', () => {
    render(<LoginForm />);
    
    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument();
  });

  it('should handle form submission', async () => {
    render(<LoginForm />);
    
    fireEvent.change(screen.getByLabelText('メールアドレス'), {
      target: { value: 'test@example.com' },
    });
    
    fireEvent.change(screen.getByLabelText('パスワード'), {
      target: { value: 'password123' },
    });
    
    fireEvent.click(screen.getByRole('button', { name: 'ログイン' }));
    
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('should display error message on failure', async () => {
    mockSignIn.mockRejectedValueOnce(new Error('Invalid credentials'));
    
    render(<LoginForm />);
    
    fireEvent.change(screen.getByLabelText('メールアドレス'), {
      target: { value: 'test@example.com' },
    });
    
    fireEvent.change(screen.getByLabelText('パスワード'), {
      target: { value: 'wrongpassword' },
    });
    
    fireEvent.click(screen.getByRole('button', { name: 'ログイン' }));
    
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });
});
```

#### AuthContext.test.tsx
```typescript
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { createClient } from '@supabase/supabase-js';

jest.mock('@supabase/supabase-js');

describe('AuthContext', () => {
  const mockSupabase = {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  };

  beforeEach(() => {
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  it('should provide auth methods', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    expect(result.current.signUp).toBeDefined();
    expect(result.current.signIn).toBeDefined();
    expect(result.current.signOut).toBeDefined();
  });

  it('should handle sign up', async () => {
    mockSupabase.auth.signUp.mockResolvedValueOnce({
      data: { user: { id: 'user-id' } },
      error: null,
    });
    
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await act(async () => {
      await result.current.signUp('test@example.com', 'password123', 'Test User');
    });
    
    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      options: {
        data: { full_name: 'Test User' },
      },
    });
  });
});
```

### 3.2 フック単体テスト

#### useRequireAuth.test.ts
```typescript
import { renderHook } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAuth } from '@/hooks/useAuth';

jest.mock('next/navigation');
jest.mock('@/hooks/useAuth');

describe('useRequireAuth', () => {
  const mockPush = jest.fn();
  
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  it('should redirect to login when not authenticated', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      organizations: [],
      loading: false,
    });
    
    renderHook(() => useRequireAuth());
    
    expect(mockPush).toHaveBeenCalledWith('/auth/login');
  });

  it('should redirect to setup when no organization', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user-id' },
      organizations: [],
      loading: false,
    });
    
    renderHook(() => useRequireAuth({ requireOrganization: true }));
    
    expect(mockPush).toHaveBeenCalledWith('/setup-organization');
  });

  it('should not redirect when authenticated with organization', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user-id' },
      organizations: [{ id: 'org-id', name: 'Test Org' }],
      loading: false,
    });
    
    renderHook(() => useRequireAuth());
    
    expect(mockPush).not.toHaveBeenCalled();
  });
});
```

## 4. E2Eテストシナリオ

### 4.1 新規ユーザー登録フロー
```typescript
describe('User Registration Flow', () => {
  it('should complete full registration and organization setup', async () => {
    // 1. サインアップページへアクセス
    await page.goto('/auth/signup');
    
    // 2. 登録フォームに入力
    await page.fill('[name="fullName"]', 'E2E Test User');
    await page.fill('[name="email"]', 'e2e@example.com');
    await page.fill('[name="password"]', 'E2ETestPass123!');
    await page.fill('[name="confirmPassword"]', 'E2ETestPass123!');
    
    // 3. 登録ボタンをクリック
    await page.click('button[type="submit"]');
    
    // 4. 確認メール画面が表示される
    await expect(page).toHaveURL('/auth/confirm-email');
    
    // 5. メール確認（テスト環境では自動確認）
    await confirmEmail('e2e@example.com');
    
    // 6. ログインページへ移動
    await page.goto('/auth/login');
    
    // 7. ログイン
    await page.fill('[name="email"]', 'e2e@example.com');
    await page.fill('[name="password"]', 'E2ETestPass123!');
    await page.click('button[type="submit"]');
    
    // 8. 組織作成画面へリダイレクト
    await expect(page).toHaveURL('/setup-organization');
    
    // 9. 組織作成
    await page.fill('[name="organizationName"]', 'E2E Test Organization');
    await page.click('button[type="submit"]');
    
    // 10. ダッシュボードへリダイレクト
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1')).toContainText('ワークスペース');
  });
});
```

### 4.2 メンバー招待フロー
```typescript
describe('Member Invitation Flow', () => {
  beforeEach(async () => {
    // 管理者ユーザーでログイン
    await loginAsAdmin();
  });

  it('should invite and add existing user', async () => {
    // 1. メンバー管理ページへ
    await page.goto('/settings/members');
    
    // 2. 招待ボタンをクリック
    await page.click('button:has-text("メンバーを招待")');
    
    // 3. メールアドレス入力
    await page.fill('[name="email"]', 'existing@example.com');
    
    // 4. 招待送信
    await page.click('button:has-text("招待を送信")');
    
    // 5. 成功メッセージ確認
    await expect(page.locator('.toast')).toContainText('メンバーを追加しました');
    
    // 6. メンバーリストに追加されたことを確認
    await expect(page.locator('[data-testid="member-list"]')).toContainText('existing@example.com');
  });
});
```

## 5. セキュリティテスト

### 5.1 認証バイパステスト
```javascript
describe('Security: Authentication Bypass', () => {
  it('should not access protected endpoints without token', async () => {
    const endpoints = [
      '/api/v1/organizations',
      '/api/v1/projects',
      '/api/v1/tasks',
    ];
    
    for (const endpoint of endpoints) {
      const response = await request(app).get(endpoint);
      expect(response.status).toBe(401);
    }
  });

  it('should not access with invalid token', async () => {
    const response = await request(app)
      .get('/api/v1/organizations')
      .set('Authorization', 'Bearer invalid-token');
    
    expect(response.status).toBe(401);
  });

  it('should not access with expired token', async () => {
    const expiredToken = generateExpiredToken();
    
    const response = await request(app)
      .get('/api/v1/organizations')
      .set('Authorization', `Bearer ${expiredToken}`);
    
    expect(response.status).toBe(401);
  });
});
```

### 5.2 権限昇格テスト
```javascript
describe('Security: Privilege Escalation', () => {
  let memberToken;
  let adminToken;
  
  beforeEach(async () => {
    const org = await createTestOrganization();
    memberToken = await createMemberToken(org);
    adminToken = await createAdminToken(org);
  });

  it('should prevent member from changing roles', async () => {
    const response = await request(app)
      .put(`/api/v1/organizations/${org.id}/members/${userId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ role: 'admin' });
    
    expect(response.status).toBe(403);
  });

  it('should prevent member from removing others', async () => {
    const response = await request(app)
      .delete(`/api/v1/organizations/${org.id}/members/${otherUserId}`)
      .set('Authorization', `Bearer ${memberToken}`);
    
    expect(response.status).toBe(403);
  });
});
```

## 6. パフォーマンステスト

### 6.1 負荷テスト
```javascript
describe('Performance: Load Testing', () => {
  it('should handle concurrent logins', async () => {
    const promises = [];
    const startTime = Date.now();
    
    // 100 concurrent login attempts
    for (let i = 0; i < 100; i++) {
      promises.push(
        request(app)
          .post('/api/v1/auth/login')
          .send({
            email: `user${i}@example.com`,
            password: 'TestPass123!'
          })
      );
    }
    
    const results = await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // All requests should succeed
    results.forEach(res => {
      expect(res.status).toBe(200);
    });
    
    // Should complete within 5 seconds
    expect(duration).toBeLessThan(5000);
  });
});
```

## 7. テスト実行と自動化

### 7.1 テストスクリプト
```json
{
  "scripts": {
    "test": "npm run test:unit && npm run test:integration && npm run test:e2e",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration --runInBand",
    "test:e2e": "playwright test",
    "test:security": "npm audit && npm run test:owasp",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch"
  }
}
```

### 7.2 CI/CD統合
```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```