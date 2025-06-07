# 認証・組織管理システム テスト計画書

## 1. テスト概要

### 1.1 目的
Task Master認証・組織管理システムの品質を保証し、要件を満たしていることを確認する。

### 1.2 スコープ
- 認証機能（サインアップ、ログイン、ログアウト）
- 組織管理機能
- メンバー管理機能
- セキュリティ機能
- パフォーマンス

### 1.3 テストレベル
1. **ユニットテスト**: 個別の関数・メソッド
2. **統合テスト**: APIエンドポイント、データベース連携
3. **E2Eテスト**: ユーザーシナリオ全体
4. **セキュリティテスト**: 脆弱性チェック
5. **パフォーマンステスト**: 負荷テスト

## 2. ユニットテスト

### 2.1 認証関連

```javascript
// tests/unit/auth/password-validator.test.js
describe('Password Validator', () => {
  test('有効なパスワードを受け入れる', () => {
    const result = validatePassword('SecurePass123!');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('短すぎるパスワードを拒否する', () => {
    const result = validatePassword('Pass1!');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('パスワードは8文字以上である必要があります');
  });

  test('大文字がないパスワードを拒否する', () => {
    const result = validatePassword('password123!');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('大文字を含む必要があります');
  });
});
```

### 2.2 トークン管理

```javascript
// tests/unit/auth/token-manager.test.js
describe('Token Manager', () => {
  let tokenManager;

  beforeEach(() => {
    tokenManager = new TokenManager();
  });

  test('アクセストークンの有効期限が15分であること', () => {
    const token = tokenManager.generateAccessToken({ userId: 'test-user' });
    const decoded = jwt.decode(token);
    const expiresIn = decoded.exp - decoded.iat;
    expect(expiresIn).toBe(900); // 15分 = 900秒
  });

  test('リフレッシュトークンの有効期限が7日であること', () => {
    const token = tokenManager.generateRefreshToken({ userId: 'test-user' });
    const decoded = jwt.decode(token);
    const expiresIn = decoded.exp - decoded.iat;
    expect(expiresIn).toBe(604800); // 7日 = 604800秒
  });
});
```

### 2.3 入力検証

```javascript
// tests/unit/validators/organization.test.js
describe('Organization Validator', () => {
  test('有効な組織名を受け入れる', () => {
    const result = validateOrganizationName('株式会社サンプル');
    expect(result.isValid).toBe(true);
  });

  test('空の組織名を拒否する', () => {
    const result = validateOrganizationName('');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('組織名を入力してください');
  });

  test('101文字以上の組織名を拒否する', () => {
    const longName = 'a'.repeat(101);
    const result = validateOrganizationName(longName);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('組織名は100文字以内で入力してください');
  });
});
```

## 3. 統合テスト

### 3.1 APIエンドポイントテスト

```javascript
// tests/integration/api/auth.test.js
describe('Auth API Endpoints', () => {
  let app;
  let testUser;

  beforeAll(async () => {
    app = await setupTestApp();
    await clearTestDatabase();
  });

  afterAll(async () => {
    await teardownTestApp();
  });

  describe('POST /api/v1/auth/signup', () => {
    test('新規ユーザーを作成できる', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          fullName: 'テストユーザー',
          email: 'test@example.com',
          password: 'TestPass123!'
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toContain('確認メールを送信しました');
      expect(response.body.data.email).toBe('test@example.com');
    });

    test('既存のメールアドレスで登録を拒否する', async () => {
      // 最初のユーザー作成
      await createTestUser('existing@example.com');

      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          fullName: '重複ユーザー',
          email: 'existing@example.com',
          password: 'TestPass123!'
        });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      testUser = await createVerifiedTestUser({
        email: 'login@example.com',
        password: 'TestPass123!'
      });
    });

    test('正しい認証情報でログインできる', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@example.com',
          password: 'TestPass123!'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.user.email).toBe('login@example.com');
      expect(response.body.data.session.access_token).toBeDefined();
      expect(response.body.data.session.refresh_token).toBeDefined();
    });

    test('間違ったパスワードでログインを拒否する', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@example.com',
          password: 'WrongPassword123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTH_FAILED');
    });
  });
});
```

### 3.2 組織管理テスト

```javascript
// tests/integration/api/organizations.test.js
describe('Organizations API', () => {
  let authToken;
  let testUser;

  beforeEach(async () => {
    testUser = await createVerifiedTestUser();
    authToken = await getAuthToken(testUser);
  });

  describe('POST /api/v1/organizations', () => {
    test('認証済みユーザーが組織を作成できる', async () => {
      const response = await request(app)
        .post('/api/v1/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'テスト組織'
        });

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe('テスト組織');
      expect(response.body.data.role).toBe('admin');
    });

    test('未認証ユーザーは組織を作成できない', async () => {
      const response = await request(app)
        .post('/api/v1/organizations')
        .send({
          name: 'テスト組織'
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTH_INVALID_TOKEN');
    });
  });

  describe('GET /api/v1/organizations', () => {
    test('ユーザーが所属する組織一覧を取得できる', async () => {
      // テスト用組織を作成
      await createTestOrganization(testUser.id, 'Organization 1');
      await createTestOrganization(testUser.id, 'Organization 2');

      const response = await request(app)
        .get('/api/v1/organizations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].name).toBe('Organization 1');
      expect(response.body.data[1].name).toBe('Organization 2');
    });
  });
});
```

### 3.3 RLSポリシーテスト

```javascript
// tests/integration/database/rls-policies.test.js
describe('RLS Policies', () => {
  let user1, user2;
  let org1, org2;
  let supabaseUser1, supabaseUser2;

  beforeEach(async () => {
    // ユーザーと組織のセットアップ
    user1 = await createTestUser('user1@example.com');
    user2 = await createTestUser('user2@example.com');
    
    org1 = await createTestOrganization(user1.id, 'Org 1');
    org2 = await createTestOrganization(user2.id, 'Org 2');
    
    // 各ユーザーのSupabaseクライアントを作成
    supabaseUser1 = createSupabaseClient(user1.token);
    supabaseUser2 = createSupabaseClient(user2.token);
  });

  test('ユーザーは自分が所属する組織のみ閲覧できる', async () => {
    const { data: orgs1 } = await supabaseUser1
      .from('organizations')
      .select('*');
    
    expect(orgs1).toHaveLength(1);
    expect(orgs1[0].id).toBe(org1.id);

    const { data: orgs2 } = await supabaseUser2
      .from('organizations')
      .select('*');
    
    expect(orgs2).toHaveLength(1);
    expect(orgs2[0].id).toBe(org2.id);
  });

  test('管理者のみがメンバーを追加できる', async () => {
    // user1は管理者なので成功するはず
    const { error: successError } = await supabaseUser1
      .from('organization_members')
      .insert({
        organization_id: org1.id,
        profile_id: user2.id,
        role: 'member'
      });
    
    expect(successError).toBeNull();

    // user2は管理者ではないので失敗するはず
    const { error: failError } = await supabaseUser2
      .from('organization_members')
      .insert({
        organization_id: org1.id,
        profile_id: user1.id,
        role: 'member'
      });
    
    expect(failError).not.toBeNull();
    expect(failError.code).toBe('42501'); // PostgreSQL permission denied
  });
});
```

## 4. E2Eテスト

### 4.1 認証フロー

```javascript
// tests/e2e/auth-flow.test.js
describe('認証フローE2E', () => {
  test('新規ユーザーのサインアップから組織作成まで', async () => {
    // 1. トップページにアクセス
    await page.goto('http://localhost:3000');
    
    // 2. サインアップページへ移動
    await page.click('text=新規登録');
    
    // 3. サインアップフォームを入力
    await page.fill('input[name="fullName"]', 'E2Eテストユーザー');
    await page.fill('input[name="email"]', 'e2e@example.com');
    await page.fill('input[name="password"]', 'E2ETestPass123!');
    await page.fill('input[name="confirmPassword"]', 'E2ETestPass123!');
    
    // 4. サインアップ実行
    await page.click('button[type="submit"]');
    
    // 5. 確認メール送信の通知を確認
    await expect(page.locator('text=確認メールを送信しました')).toBeVisible();
    
    // 6. メール確認をシミュレート（テスト環境用）
    await confirmTestUserEmail('e2e@example.com');
    
    // 7. ログインページへ移動
    await page.goto('http://localhost:3000/login');
    
    // 8. ログイン
    await page.fill('input[name="email"]', 'e2e@example.com');
    await page.fill('input[name="password"]', 'E2ETestPass123!');
    await page.click('button[type="submit"]');
    
    // 9. 組織作成画面へリダイレクトされることを確認
    await expect(page).toHaveURL('http://localhost:3000/setup-organization');
    
    // 10. 組織を作成
    await page.fill('input[name="organizationName"]', 'E2Eテスト組織');
    await page.click('button[text="組織を作成"]');
    
    // 11. ダッシュボードへ遷移することを確認
    await expect(page).toHaveURL('http://localhost:3000/dashboard');
    await expect(page.locator('text=E2Eテスト組織')).toBeVisible();
  });
});
```

### 4.2 メンバー管理フロー

```javascript
// tests/e2e/member-management.test.js
describe('メンバー管理E2E', () => {
  let adminUser, memberUser;

  beforeEach(async () => {
    // 管理者とメンバーを作成
    adminUser = await setupE2EUser('admin@example.com', 'admin');
    memberUser = await setupE2EUser('member@example.com', 'member');
    
    // 管理者でログイン
    await loginAsUser(adminUser);
  });

  test('管理者が新しいメンバーを招待できる', async () => {
    // メンバー管理ページへ移動
    await page.goto('http://localhost:3000/settings/members');
    
    // 招待ボタンをクリック
    await page.click('button[text="メンバーを招待"]');
    
    // メールアドレスを入力
    await page.fill('input[name="email"]', 'newmember@example.com');
    
    // 招待を送信
    await page.click('button[text="招待を送信"]');
    
    // 成功メッセージを確認
    await expect(page.locator('text=招待メールを送信しました')).toBeVisible();
  });

  test('管理者がメンバーのロールを変更できる', async () => {
    // メンバー管理ページへ移動
    await page.goto('http://localhost:3000/settings/members');
    
    // メンバーの行を見つける
    const memberRow = page.locator(`tr:has-text("${memberUser.email}")`);
    
    // ロール変更ボタンをクリック
    await memberRow.locator('button[text="ロール変更"]').click();
    
    // 管理者に変更
    await page.selectOption('select[name="role"]', 'admin');
    
    // 保存
    await page.click('button[text="保存"]');
    
    // 成功メッセージとロールの変更を確認
    await expect(page.locator('text=ロールを更新しました')).toBeVisible();
    await expect(memberRow.locator('text=管理者')).toBeVisible();
  });
});
```

## 5. セキュリティテスト

### 5.1 認証バイパステスト

```javascript
// tests/security/auth-bypass.test.js
describe('認証バイパステスト', () => {
  test('JWTなしで保護されたエンドポイントにアクセスできない', async () => {
    const endpoints = [
      '/api/v1/organizations',
      '/api/v1/projects',
      '/api/v1/tasks'
    ];

    for (const endpoint of endpoints) {
      const response = await request(app).get(endpoint);
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTH_INVALID_TOKEN');
    }
  });

  test('期限切れトークンでアクセスできない', async () => {
    const expiredToken = generateExpiredTestToken();
    
    const response = await request(app)
      .get('/api/v1/organizations')
      .set('Authorization', `Bearer ${expiredToken}`);
    
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_EXPIRED_TOKEN');
  });
});
```

### 5.2 権限昇格テスト

```javascript
// tests/security/privilege-escalation.test.js
describe('権限昇格テスト', () => {
  let memberUser, adminUser, organization;

  beforeEach(async () => {
    organization = await createTestOrganization();
    memberUser = await createTestMember(organization.id, 'member');
    adminUser = await createTestMember(organization.id, 'admin');
  });

  test('一般メンバーが自分のロールを変更できない', async () => {
    const response = await request(app)
      .put(`/api/v1/organizations/${organization.id}/members/${memberUser.id}`)
      .set('Authorization', `Bearer ${memberUser.token}`)
      .send({ role: 'admin' });
    
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('AUTH_INSUFFICIENT_PERMISSIONS');
  });

  test('他の組織のリソースにアクセスできない', async () => {
    const otherOrg = await createTestOrganization();
    
    const response = await request(app)
      .get(`/api/v1/organizations/${otherOrg.id}/members`)
      .set('Authorization', `Bearer ${memberUser.token}`);
    
    expect(response.status).toBe(403);
  });
});
```

### 5.3 インジェクション攻撃テスト

```javascript
// tests/security/injection-attacks.test.js
describe('インジェクション攻撃テスト', () => {
  test('SQLインジェクション - ログイン', async () => {
    const maliciousPayloads = [
      "admin@example.com' OR '1'='1",
      "admin@example.com'; DROP TABLE users; --",
      "admin@example.com' UNION SELECT * FROM users --"
    ];

    for (const payload of maliciousPayloads) {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: payload,
          password: 'password'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTH_FAILED');
    }
  });

  test('XSS - 組織名', async () => {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      'javascript:alert("XSS")'
    ];

    const authToken = await getAdminAuthToken();

    for (const payload of xssPayloads) {
      const response = await request(app)
        .post('/api/v1/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: payload });
      
      expect(response.status).toBe(201);
      // サニタイズされていることを確認
      expect(response.body.data.name).not.toContain('<script>');
      expect(response.body.data.name).not.toContain('javascript:');
    }
  });
});
```

## 6. パフォーマンステスト

### 6.1 負荷テスト設定

```javascript
// tests/performance/k6-config.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // 100ユーザーまで増加
    { duration: '5m', target: 100 }, // 100ユーザーを維持
    { duration: '2m', target: 200 }, // 200ユーザーまで増加
    { duration: '5m', target: 200 }, // 200ユーザーを維持
    { duration: '2m', target: 0 },   // 0ユーザーまで減少
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95%のリクエストが500ms以内
    http_req_failed: ['rate<0.1'],    // エラー率10%未満
  },
};

export default function () {
  // ログインテスト
  const loginRes = http.post(
    'http://localhost:3000/api/v1/auth/login',
    JSON.stringify({
      email: 'test@example.com',
      password: 'TestPass123!'
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  check(loginRes, {
    'login successful': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  if (loginRes.status === 200) {
    const token = loginRes.json('data.session.access_token');
    
    // 組織一覧取得テスト
    const orgsRes = http.get(
      'http://localhost:3000/api/v1/organizations',
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    check(orgsRes, {
      'organizations fetched': (r) => r.status === 200,
      'response time < 1000ms': (r) => r.timings.duration < 1000,
    });
  }
  
  sleep(1);
}
```

### 6.2 同時接続テスト

```bash
# tests/performance/concurrent-test.sh
#!/bin/bash

# 100人の同時ログインをシミュレート
echo "Starting concurrent login test..."

for i in {1..100}; do
  (
    curl -X POST http://localhost:3000/api/v1/auth/login \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"user$i@example.com\",\"password\":\"TestPass123!\"}" \
      -w "%{http_code} %{time_total}s\n" \
      -o /dev/null \
      -s
  ) &
done

wait
echo "Concurrent login test completed"
```

## 7. テストデータ管理

### 7.1 テストデータセットアップ

```javascript
// tests/fixtures/test-data.js
export const testUsers = [
  {
    email: 'admin@test.com',
    password: 'AdminPass123!',
    fullName: '管理者テスト',
    role: 'admin'
  },
  {
    email: 'member@test.com',
    password: 'MemberPass123!',
    fullName: 'メンバーテスト',
    role: 'member'
  }
];

export const testOrganizations = [
  {
    name: 'テスト組織1',
    memberCount: 5
  },
  {
    name: 'テスト組織2',
    memberCount: 10
  }
];

// テストデータのセットアップ関数
export async function setupTestData() {
  const users = [];
  const organizations = [];
  
  // ユーザー作成
  for (const userData of testUsers) {
    const user = await createTestUser(userData);
    users.push(user);
  }
  
  // 組織作成
  for (const orgData of testOrganizations) {
    const org = await createTestOrganization(orgData);
    organizations.push(org);
  }
  
  return { users, organizations };
}
```

### 7.2 テストデータクリーンアップ

```javascript
// tests/helpers/cleanup.js
export async function cleanupTestData() {
  // RLSを一時的に無効化（管理者権限で実行）
  const supabaseAdmin = createSupabaseAdminClient();
  
  // テストデータを削除
  await supabaseAdmin.from('organization_members').delete().like('profile_id', 'test-%');
  await supabaseAdmin.from('organizations').delete().like('name', 'テスト%');
  await supabaseAdmin.from('profiles').delete().like('email', '%@test.com');
  await supabaseAdmin.auth.admin.deleteUser('test-*');
  
  console.log('Test data cleaned up');
}
```

## 8. CI/CD統合

### 8.1 GitHub Actions設定

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: supabase/postgres:14.1.0.21
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run migrations
      run: npm run migrate:test
    
    - name: Run unit tests
      run: npm run test:unit
    
    - name: Run integration tests
      run: npm run test:integration
    
    - name: Run E2E tests
      run: npm run test:e2e
    
    - name: Run security tests
      run: npm run test:security
    
    - name: Generate coverage report
      run: npm run test:coverage
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
```

## 9. テスト実行コマンド

```json
// package.json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "test:e2e": "playwright test",
    "test:security": "jest tests/security",
    "test:performance": "k6 run tests/performance/k6-config.js",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch",
    "test:ci": "npm run test:unit && npm run test:integration && npm run test:security"
  }
}
```

## 10. テスト完了基準

### 10.1 カバレッジ目標
- 全体: 80%以上
- 認証機能: 90%以上
- セキュリティ関連: 95%以上

### 10.2 品質指標
- 全テストケースの合格
- パフォーマンステストの基準達成
- セキュリティ脆弱性ゼロ
- 重大なバグゼロ

### 10.3 リリース判定
- [ ] 全自動テストが合格
- [ ] 手動テストのサインオフ
- [ ] セキュリティレビューの完了
- [ ] パフォーマンス基準の達成
- [ ] ドキュメントの更新完了