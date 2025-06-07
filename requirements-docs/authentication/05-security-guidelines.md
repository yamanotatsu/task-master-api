# セキュリティガイドライン

## 1. 概要

このドキュメントでは、Task Master認証・組織管理システムのセキュリティベストプラクティスと実装ガイドラインを定義します。

## 2. 認証セキュリティ

### 2.1 パスワードポリシー

#### 要件
- **最小長**: 8文字以上
- **複雑性**: 以下をすべて含む
  - 大文字（A-Z）
  - 小文字（a-z）
  - 数字（0-9）
  - 特殊文字（推奨）

#### 実装例

```javascript
// utils/password-validator.js
const passwordSchema = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false // 推奨だが必須ではない
};

function validatePassword(password) {
  const errors = [];
  
  if (password.length < passwordSchema.minLength) {
    errors.push(`パスワードは${passwordSchema.minLength}文字以上である必要があります`);
  }
  
  if (password.length > passwordSchema.maxLength) {
    errors.push(`パスワードは${passwordSchema.maxLength}文字以下である必要があります`);
  }
  
  if (passwordSchema.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('大文字を含む必要があります');
  }
  
  if (passwordSchema.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('小文字を含む必要があります');
  }
  
  if (passwordSchema.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('数字を含む必要があります');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
```

### 2.2 パスワードハッシュ化

Supabase Authが自動的にbcryptを使用してパスワードをハッシュ化しますが、カスタム実装が必要な場合：

```javascript
// 使用すべきではない例（参考のみ）
// Supabase Authを使用するため、独自実装は不要
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 12;

async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}
```

### 2.3 アカウントロックアウト

```javascript
// middleware/rate-limiter.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

const loginLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'login_attempts:'
  }),
  windowMs: 15 * 60 * 1000, // 15分
  max: 5, // 最大5回の試行
  message: 'ログイン試行回数が上限に達しました。15分後に再度お試しください。',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // IPアドレスとメールアドレスの組み合わせ
    return `${req.ip}:${req.body.email || 'unknown'}`;
  }
});

// 適用
router.post('/auth/login', loginLimiter, loginHandler);
```

## 3. JWT セキュリティ

### 3.1 トークン設定

```javascript
// config/jwt.js
module.exports = {
  access: {
    expiresIn: '15m', // 15分
    algorithm: 'HS256'
  },
  refresh: {
    expiresIn: '7d', // 7日
    algorithm: 'HS256'
  },
  // 本番環境では環境変数から読み込む
  secret: process.env.JWT_SECRET || 'your-secret-key'
};
```

### 3.2 トークン検証

```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');

async function verifyToken(token) {
  try {
    // Supabase JWT検証
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      throw new Error('Invalid token');
    }
    
    // 追加の検証
    if (!user.email_confirmed_at) {
      throw new Error('Email not verified');
    }
    
    return user;
  } catch (error) {
    logger.error('Token verification failed:', error);
    throw error;
  }
}
```

### 3.3 トークン保存のベストプラクティス

**推奨**: httpOnly Cookieでの保存

```javascript
// utils/token-storage.js
function setTokenCookie(res, token, type = 'access') {
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  };
  
  if (type === 'access') {
    options.maxAge = 15 * 60 * 1000; // 15分
  } else if (type === 'refresh') {
    options.maxAge = 7 * 24 * 60 * 60 * 1000; // 7日
  }
  
  res.cookie(`${type}_token`, token, options);
}
```

## 4. セッション管理

### 4.1 セッションセキュリティ設定

```javascript
// config/session.js
const session = require('express-session');
const RedisStore = require('connect-redis')(session);

const sessionConfig = {
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24, // 24時間
    sameSite: 'strict'
  },
  name: 'sessionId' // デフォルトの'connect.sid'を使わない
};
```

### 4.2 セッション無効化

```javascript
// utils/session-manager.js
async function invalidateAllUserSessions(userId) {
  try {
    // Redisから該当ユーザーのすべてのセッションを削除
    const sessions = await redisClient.keys(`sess:*`);
    
    for (const sessionKey of sessions) {
      const sessionData = await redisClient.get(sessionKey);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        if (session.userId === userId) {
          await redisClient.del(sessionKey);
        }
      }
    }
    
    logger.info(`Invalidated all sessions for user: ${userId}`);
  } catch (error) {
    logger.error('Session invalidation error:', error);
    throw error;
  }
}
```

## 5. API セキュリティ

### 5.1 CORS設定

```javascript
// config/cors.js
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001'
    ];
    
    // 開発環境ではoriginがundefinedの場合も許可
    if (!origin && process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count']
};
```

### 5.2 ヘッダーセキュリティ

```javascript
// middleware/security-headers.js
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// 追加のセキュリティヘッダー
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});
```

### 5.3 入力検証とサニタイゼーション

```javascript
// middleware/input-validation.js
const validator = require('validator');
const xss = require('xss');

function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  // XSS対策
  let sanitized = xss(input, {
    whiteList: {}, // すべてのHTMLタグを削除
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script']
  });
  
  // SQLインジェクション対策（Supabaseが処理するが念のため）
  sanitized = sanitized.replace(/['";\\]/g, '');
  
  return sanitized.trim();
}

// 使用例
router.post('/organizations', (req, res, next) => {
  req.body.name = sanitizeInput(req.body.name);
  
  // 追加の検証
  if (!validator.isLength(req.body.name, { min: 1, max: 100 })) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: '組織名は1〜100文字で入力してください'
      }
    });
  }
  
  next();
});
```

## 6. データベースセキュリティ

### 6.1 Row Level Security (RLS) 実装チェックリスト

- [ ] すべてのテーブルでRLSを有効化
- [ ] デフォルトですべてを拒否するポリシー
- [ ] 必要最小限の権限のみ付与
- [ ] サービスロールキーは絶対にクライアントに露出させない

### 6.2 SQLインジェクション対策

```javascript
// ❌ 悪い例
const query = `SELECT * FROM users WHERE email = '${email}'`;

// ✅ 良い例（Supabaseクライアント使用）
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('email', email);

// ✅ 良い例（パラメータ化クエリ）
const query = 'SELECT * FROM users WHERE email = $1';
const values = [email];
```

## 7. 監査とロギング

### 7.1 監査ログ項目

```javascript
// utils/audit-logger.js
class AuditLogger {
  static async log(event) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      event_type: event.type,
      user_id: event.userId,
      organization_id: event.organizationId,
      ip_address: event.ipAddress,
      user_agent: event.userAgent,
      action: event.action,
      resource: event.resource,
      result: event.result,
      metadata: event.metadata
    };
    
    // データベースに保存
    await supabase
      .from('audit_logs')
      .insert(auditEntry);
    
    // 重要なイベントは外部システムにも送信
    if (event.severity === 'high') {
      await sendToSIEM(auditEntry);
    }
  }
}

// 使用例
await AuditLogger.log({
  type: 'AUTH_LOGIN_SUCCESS',
  userId: user.id,
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  action: 'login',
  resource: 'auth',
  result: 'success',
  metadata: { email: user.email }
});
```

### 7.2 監査対象イベント

必須監査イベント：
- ログイン成功/失敗
- ログアウト
- パスワード変更
- アカウント作成/削除
- 権限変更
- 組織メンバーの追加/削除
- APIアクセスエラー（401, 403）

## 8. 脆弱性対策

### 8.1 依存関係の管理

```json
// package.json
{
  "scripts": {
    "audit": "npm audit",
    "audit:fix": "npm audit fix",
    "check-updates": "npx npm-check-updates",
    "update-deps": "npx npm-check-updates -u && npm install"
  }
}
```

定期実行：
```bash
# 週次で実行
npm audit

# 月次で実行
npm outdated
```

### 8.2 セキュリティテスト

```javascript
// tests/security/auth.test.js
describe('Authentication Security Tests', () => {
  test('SQLインジェクション攻撃を防ぐ', async () => {
    const maliciousEmail = "admin@example.com' OR '1'='1";
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: maliciousEmail,
        password: 'password'
      });
    
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_FAILED');
  });
  
  test('XSS攻撃を防ぐ', async () => {
    const xssPayload = '<script>alert("XSS")</script>';
    const response = await request(app)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        name: xssPayload
      });
    
    // レスポンスにスクリプトタグが含まれていないことを確認
    expect(response.body.data.name).not.toContain('<script>');
  });
});
```

## 9. インシデント対応

### 9.1 セキュリティインシデント発生時の対応フロー

1. **検知**: 異常なアクセスパターンの検出
2. **隔離**: 影響を受けたアカウントの一時停止
3. **調査**: ログ分析と影響範囲の特定
4. **対応**: パスワードリセット要求、セッション無効化
5. **復旧**: サービスの正常化
6. **報告**: ステークホルダーへの報告
7. **改善**: 再発防止策の実装

### 9.2 緊急時の連絡先

```javascript
// config/security-contacts.js
module.exports = {
  securityTeam: process.env.SECURITY_TEAM_EMAIL,
  incidentResponse: process.env.INCIDENT_RESPONSE_EMAIL,
  escalation: [
    { level: 1, contact: process.env.L1_CONTACT },
    { level: 2, contact: process.env.L2_CONTACT },
    { level: 3, contact: process.env.L3_CONTACT }
  ]
};
```

## 10. セキュリティチェックリスト

### 開発時
- [ ] パスワードポリシーの実装
- [ ] 入力検証とサニタイゼーション
- [ ] 適切なエラーメッセージ（情報漏洩防止）
- [ ] セキュアなトークン管理
- [ ] HTTPS通信の強制

### デプロイ前
- [ ] 依存関係の脆弱性チェック
- [ ] 環境変数の確認（秘密情報の分離）
- [ ] RLSポリシーのテスト
- [ ] ペネトレーションテスト
- [ ] 負荷テスト

### 運用時
- [ ] 定期的な脆弱性スキャン
- [ ] ログ監視
- [ ] 異常検知アラートの設定
- [ ] バックアップとリストア手順の確認
- [ ] インシデント対応訓練