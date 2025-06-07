# 認証機能テスト計画書

## 1. テスト概要

### 1.1 テスト目的
- 認証・認可機能の正確性を確認
- セキュリティ要件の充足を検証
- パフォーマンス要件の達成を確認
- ユーザビリティの検証

### 1.2 テスト範囲
- 認証API（サインアップ、ログイン、ログアウト）
- 組織管理機能
- メンバー管理機能
- フロントエンド認証フロー
- セキュリティ機能（レート制限、入力検証等）

### 1.3 テスト環境
- 開発環境：ローカルSupabase
- ステージング環境：Supabaseクラウド（専用プロジェクト）
- テストデータ：専用のシードデータ

## 2. 単体テスト

### 2.1 認証ミドルウェアテスト

```javascript
// tests/unit/middleware/auth.test.js
describe('Auth Middleware', () => {
  describe('authMiddleware', () => {
    it('should reject requests without token', async () => {
      const req = { headers: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: { code: 'AUTH_TOKEN_MISSING', message: 'Authentication required' }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid token format', async () => {
      const req = { headers: { authorization: 'Bearer invalid-token' } };
      // ... テスト実装
    });

    it('should accept valid token and set user', async () => {
      const validToken = 'valid.jwt.token';
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      
      // Supabaseモック設定
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      const req = { headers: { authorization: `Bearer ${validToken}` } };
      const res = {};
      const next = jest.fn();

      await authMiddleware(req, res, next);

      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should reject non-admin users for admin endpoints', async () => {
      // ... テスト実装
    });

    it('should allow admin users to access admin endpoints', async () => {
      // ... テスト実装
    });
  });
});
```

### 2.2 APIエンドポイントテスト

```javascript
// tests/unit/routes/auth.test.js
describe('Auth Routes', () => {
  describe('POST /auth/signup', () => {
    it('should create new user with valid data', async () => {
      const userData = {
        fullName: 'Test User',
        email: 'test@example.com',
        password: 'SecurePass123!'
      };

      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
    });

    it('should validate email format', async () => {
      const userData = {
        fullName: 'Test User',
        email: 'invalid-email',
        password: 'SecurePass123!'
      };

      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should enforce password complexity', async () => {
      const userData = {
        fullName: 'Test User',
        email: 'test@example.com',
        password: 'weak'
      };

      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error.details).toContainEqual(
        expect.objectContaining({
          field: 'password',
          message: expect.stringContaining('8文字以上')
        })
      );
    });

    it('should prevent duplicate email registration', async () => {
      // 既存ユーザーのモック
      supabase.auth.signUp.mockResolvedValue({
        data: null,
        error: { message: 'User already registered' }
      });

      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          fullName: 'Test User',
          email: 'existing@example.com',
          password: 'SecurePass123!'
        });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('AUTH_EMAIL_EXISTS');
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      // ... テスト実装
    });

    it('should reject invalid credentials', async () => {
      // ... テスト実装
    });

    it('should handle unverified email', async () => {
      // ... テスト実装
    });
  });
});
```

### 2.3 フロントエンドコンポーネントテスト

```typescript
// tests/unit/components/auth/LoginForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from '@/components/auth/LoginForm';
import { AuthProvider } from '@/contexts/AuthContext';

const renderWithAuth = (component: React.ReactElement) => {
  return render(
    <AuthProvider>
      {component}
    </AuthProvider>
  );
};

describe('LoginForm', () => {
  it('should render login form fields', () => {
    renderWithAuth(<LoginForm />);
    
    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument();
  });

  it('should show validation errors on empty submit', async () => {
    renderWithAuth(<LoginForm />);
    
    const submitButton = screen.getByRole('button', { name: 'ログイン' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('有効なメールアドレスを入力してください')).toBeInTheDocument();
      expect(screen.getByText('パスワードを入力してください')).toBeInTheDocument();
    });
  });

  it('should call login function with form data', async () => {
    const mockLogin = jest.fn();
    jest.spyOn(require('@/contexts/AuthContext'), 'useAuth').mockReturnValue({
      login: mockLogin,
      // ... 他のモック値
    });

    renderWithAuth(<LoginForm />);
    
    fireEvent.change(screen.getByLabelText('メールアドレス'), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText('パスワード'), {
      target: { value: 'password123' }
    });
    
    fireEvent.click(screen.getByRole('button', { name: 'ログイン' }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });
});
```

## 3. 統合テスト

### 3.1 認証フロー統合テスト

```javascript
// tests/integration/auth-flow.test.js
describe('Authentication Flow', () => {
  let testUser;

  beforeEach(async () => {
    // テストユーザーのクリーンアップ
    await cleanupTestData();
    
    testUser = {
      fullName: 'Integration Test User',
      email: `test-${Date.now()}@example.com`,
      password: 'TestPass123!'
    };
  });

  it('should complete full authentication flow', async () => {
    // 1. サインアップ
    const signupResponse = await request(app)
      .post('/api/v1/auth/signup')
      .send(testUser);

    expect(signupResponse.status).toBe(201);
    const userId = signupResponse.body.data.user.id;

    // 2. メール確認（テスト環境では自動確認）
    await confirmEmailForTest(userId);

    // 3. ログイン
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(loginResponse.status).toBe(200);
    const { accessToken, refreshToken } = loginResponse.body.data.tokens;

    // 4. 認証が必要なエンドポイントへのアクセス
    const profileResponse = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body.data.profile.email).toBe(testUser.email);

    // 5. トークンリフレッシュ
    const refreshResponse = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.data.tokens.accessToken).toBeDefined();

    // 6. ログアウト
    const logoutResponse = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(logoutResponse.status).toBe(200);

    // 7. ログアウト後のアクセス確認
    const afterLogoutResponse = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(afterLogoutResponse.status).toBe(401);
  });
});
```

### 3.2 組織管理フロー統合テスト

```javascript
// tests/integration/organization-flow.test.js
describe('Organization Management Flow', () => {
  let adminUser, memberUser;
  let adminToken, memberToken;
  let organizationId;

  beforeAll(async () => {
    // テストユーザーの作成とログイン
    adminUser = await createTestUser('admin');
    memberUser = await createTestUser('member');
    
    adminToken = await loginTestUser(adminUser);
    memberToken = await loginTestUser(memberUser);
  });

  it('should complete organization management flow', async () => {
    // 1. 組織作成
    const createOrgResponse = await request(app)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Organization',
        description: 'Integration test organization'
      });

    expect(createOrgResponse.status).toBe(201);
    organizationId = createOrgResponse.body.data.organization.id;

    // 2. メンバー招待
    const inviteResponse = await request(app)
      .post(`/api/v1/organizations/${organizationId}/invites`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: memberUser.email,
        role: 'member'
      });

    expect(inviteResponse.status).toBe(201);

    // 3. メンバー一覧確認
    const membersResponse = await request(app)
      .get(`/api/v1/organizations/${organizationId}/members`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(membersResponse.status).toBe(200);
    expect(membersResponse.body.data.members).toHaveLength(2);

    // 4. メンバーのロール更新
    const memberProfileId = membersResponse.body.data.members
      .find(m => m.email === memberUser.email).id;

    const updateRoleResponse = await request(app)
      .put(`/api/v1/organizations/${organizationId}/members/${memberProfileId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'admin' });

    expect(updateRoleResponse.status).toBe(200);

    // 5. 権限昇格後の動作確認
    const newAdminActionResponse = await request(app)
      .put(`/api/v1/organizations/${organizationId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ name: 'Updated by New Admin' });

    expect(newAdminActionResponse.status).toBe(200);
  });
});
```

## 4. E2Eテスト

### 4.1 認証フローE2Eテスト

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication E2E', () => {
  test('should complete signup and login flow', async ({ page }) => {
    // 1. サインアップページへ移動
    await page.goto('/signup');
    
    // 2. フォーム入力
    await page.fill('input[name="fullName"]', 'E2E Test User');
    await page.fill('input[name="email"]', `e2e-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'E2EPass123!');
    await page.fill('input[name="confirmPassword"]', 'E2EPass123!');
    
    // 3. サインアップ実行
    await page.click('button[type="submit"]');
    
    // 4. 成功ページの確認
    await expect(page).toHaveURL('/signup-success');
    await expect(page.locator('h1')).toContainText('登録が完了しました');
    
    // 5. メール確認（テスト環境では自動確認）
    // ... 
    
    // 6. ログインページへ移動
    await page.goto('/login');
    
    // 7. ログイン実行
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'E2EPass123!');
    await page.click('button[type="submit"]');
    
    // 8. 組織セットアップページの確認
    await expect(page).toHaveURL('/setup-organization');
    
    // 9. 組織作成
    await page.fill('input[name="name"]', 'E2E Test Organization');
    await page.click('button:has-text("作成する")');
    
    // 10. ダッシュボードへの遷移確認
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="user-menu"]')).toContainText('E2E Test User');
  });

  test('should handle authentication errors', async ({ page }) => {
    await page.goto('/login');
    
    // 無効な認証情報でログイン試行
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // エラーメッセージの確認
    await expect(page.locator('[role="alert"]')).toContainText(
      'メールアドレスまたはパスワードが正しくありません'
    );
  });

  test('should protect authenticated routes', async ({ page }) => {
    // 未認証でダッシュボードアクセス
    await page.goto('/dashboard');
    
    // ログインページへのリダイレクト確認
    await expect(page).toHaveURL('/login');
  });
});
```

### 4.2 組織管理E2Eテスト

```typescript
// tests/e2e/organization.spec.ts
test.describe('Organization Management E2E', () => {
  test.use({ storageState: 'tests/e2e/.auth/admin.json' });

  test('should manage organization members', async ({ page }) => {
    // 1. メンバー管理ページへ移動
    await page.goto('/settings/members');
    
    // 2. メンバー招待
    await page.click('button:has-text("メンバーを招待")');
    await page.fill('input[name="email"]', 'newmember@example.com');
    await page.selectOption('select[name="role"]', 'member');
    await page.click('button:has-text("招待を送信")');
    
    // 3. 成功通知の確認
    await expect(page.locator('[role="status"]')).toContainText(
      '招待を送信しました'
    );
    
    // 4. メンバーリストの更新確認
    await expect(page.locator('table tbody tr')).toHaveCount(
      await page.locator('table tbody tr').count() + 1
    );
    
    // 5. ロール変更
    const memberRow = page.locator('tr:has-text("newmember@example.com")');
    await memberRow.locator('button:has-text("役割を変更")').click();
    await page.selectOption('select[name="role"]', 'admin');
    await page.click('button:has-text("保存")');
    
    // 6. 変更の確認
    await expect(memberRow).toContainText('管理者');
  });
});
```

## 5. セキュリティテスト

### 5.1 レート制限テスト

```javascript
// tests/security/rate-limit.test.js
describe('Rate Limiting', () => {
  it('should enforce rate limits on auth endpoints', async () => {
    const requests = [];
    
    // 制限値を超えるリクエストを送信
    for (let i = 0; i < 10; i++) {
      requests.push(
        request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'test@example.com', password: 'wrong' })
      );
    }
    
    const responses = await Promise.all(requests);
    
    // 最初の5つは通過、それ以降は429エラー
    expect(responses.slice(0, 5).every(r => r.status !== 429)).toBe(true);
    expect(responses.slice(5).every(r => r.status === 429)).toBe(true);
  });
});
```

### 5.2 入力検証テスト

```javascript
// tests/security/input-validation.test.js
describe('Input Validation Security', () => {
  it('should prevent XSS attacks', async () => {
    const xssPayload = '<script>alert("XSS")</script>';
    
    const response = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        fullName: xssPayload,
        email: 'test@example.com',
        password: 'SecurePass123!'
      });
    
    // XSSペイロードがサニタイズされることを確認
    expect(response.body).not.toContain('<script>');
  });

  it('should prevent SQL injection', async () => {
    const sqlInjectionPayload = "test@example.com'; DROP TABLE users; --";
    
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: sqlInjectionPayload,
        password: 'password'
      });
    
    // エラーレスポンスが返されることを確認（データベースエラーではない）
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
```

## 6. パフォーマンステスト

### 6.1 レスポンスタイムテスト

```javascript
// tests/performance/response-time.test.js
describe('Performance Requirements', () => {
  it('should respond within 500ms for auth endpoints', async () => {
    const startTime = Date.now();
    
    await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'TestPass123!'
      });
    
    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(500);
  });
});
```

### 6.2 負荷テスト

```javascript
// tests/performance/load-test.js
import { check } from 'k6';
import http from 'k6/http';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // 100ユーザーまで増加
    { duration: '5m', target: 100 }, // 100ユーザーを維持
    { duration: '2m', target: 0 },   // 0まで減少
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95%のリクエストが500ms以内
    http_req_failed: ['rate<0.1'],    // エラー率10%未満
  },
};

export default function () {
  const payload = JSON.stringify({
    email: `user${Math.random()}@example.com`,
    password: 'TestPass123!',
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const response = http.post(
    'http://localhost:8080/api/v1/auth/login',
    payload,
    params
  );

  check(response, {
    'status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

## 7. テストデータ管理

### 7.1 テストデータシード

```javascript
// tests/fixtures/seed-auth-data.js
const seedAuthData = async () => {
  // テスト組織
  const organizations = [
    { id: 'test-org-1', name: 'Test Organization 1' },
    { id: 'test-org-2', name: 'Test Organization 2' },
  ];

  // テストユーザー
  const users = [
    {
      email: 'admin@test.com',
      password: 'AdminPass123!',
      fullName: 'Test Admin',
      role: 'admin',
      organizationId: 'test-org-1',
    },
    {
      email: 'member@test.com',
      password: 'MemberPass123!',
      fullName: 'Test Member',
      role: 'member',
      organizationId: 'test-org-1',
    },
  ];

  // データ投入
  for (const org of organizations) {
    await supabase.from('organizations').insert(org);
  }

  for (const user of users) {
    const { data: authUser } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { full_name: user.fullName },
    });

    await supabase.from('organization_members').insert({
      organization_id: user.organizationId,
      profile_id: authUser.user.id,
      role: user.role,
    });
  }
};
```

## 8. テスト実行計画

### 8.1 CI/CDパイプライン

```yaml
# .github/workflows/test-auth.yml
name: Authentication Tests

on:
  pull_request:
    paths:
      - 'api/routes/auth.js'
      - 'api/routes/organizations.js'
      - 'api/middleware/**'
      - 'frontend/components/auth/**'
      - 'frontend/contexts/AuthContext.tsx'

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run unit tests
        run: npm run test:unit -- --coverage

  integration-tests:
    runs-on: ubuntu-latest
    services:
      supabase:
        image: supabase/supabase:latest
        env:
          POSTGRES_PASSWORD: test
    steps:
      - uses: actions/checkout@v3
      - name: Setup test database
        run: npm run db:test:setup
      - name: Run integration tests
        run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Playwright
        run: npx playwright install --with-deps
      - name: Run E2E tests
        run: npm run test:e2e
```

### 8.2 テスト実行コマンド

```json
// package.json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=tests/unit",
    "test:integration": "jest --testPathPattern=tests/integration --runInBand",
    "test:e2e": "playwright test",
    "test:security": "jest --testPathPattern=tests/security",
    "test:performance": "k6 run tests/performance/load-test.js",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch"
  }
}
```

## 9. テスト完了基準

### 9.1 カバレッジ目標
- 単体テスト：80%以上
- 統合テスト：主要フローの100%カバー
- E2Eテスト：ユーザーストーリーの100%カバー

### 9.2 品質基準
- すべてのセキュリティテストが合格
- パフォーマンステストが要件を満たす
- 既知のバグがゼロ（Critical/High）

### 9.3 受け入れ基準
- プロダクトオーナーによる機能確認完了
- セキュリティレビュー合格
- ドキュメント完備