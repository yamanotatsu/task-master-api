# セキュリティガイドライン

## 1. 概要

このドキュメントでは、Task Master認証システムにおけるセキュリティ実装のベストプラクティスとガイドラインを提供します。

## 2. 認証セキュリティ

### 2.1 パスワードセキュリティ

#### パスワードポリシー
```javascript
// パスワード要件
const passwordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false, // 推奨だが必須ではない
  maxLength: 128,
  preventCommonPasswords: true,
  preventUserInfoInPassword: true
};

// パスワード検証関数
function validatePassword(password, userInfo) {
  const errors = [];

  // 長さチェック
  if (password.length < passwordPolicy.minLength) {
    errors.push('パスワードは8文字以上必要です');
  }

  // 複雑性チェック
  if (passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('大文字を含める必要があります');
  }

  if (passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('小文字を含める必要があります');
  }

  if (passwordPolicy.requireNumbers && !/\d/.test(password)) {
    errors.push('数字を含める必要があります');
  }

  // 一般的なパスワードチェック
  const commonPasswords = [
    'password', '12345678', 'qwerty', 'abc12345',
    'password123', 'admin', 'letmein'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('このパスワードは一般的すぎて安全ではありません');
  }

  // ユーザー情報を含むかチェック
  const userFields = [
    userInfo.email?.split('@')[0],
    userInfo.fullName?.toLowerCase(),
  ].filter(Boolean);

  for (const field of userFields) {
    if (password.toLowerCase().includes(field)) {
      errors.push('パスワードに個人情報を含めないでください');
    }
  }

  return errors;
}
```

#### パスワードハッシュ化
```javascript
// Supabase Auth が自動的にbcryptでハッシュ化
// カスタム実装が必要な場合の例
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12; // 適切なコスト係数

async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}
```

### 2.2 多要素認証（MFA）

#### TOTP実装ガイドライン
```javascript
// 将来実装用のMFA設定
const mfaConfig = {
  issuer: 'Task Master',
  algorithm: 'SHA256',
  digits: 6,
  period: 30,
  window: 1, // 前後1期間を許容
};

// QRコード生成
async function generateMFASecret(userId) {
  const secret = generateSecret({
    name: userId,
    issuer: mfaConfig.issuer,
  });

  return {
    secret: secret.base32,
    qrCode: secret.otpauth_url,
  };
}
```

### 2.3 セッション管理

#### JWT設定
```javascript
// JWT設定
const jwtConfig = {
  accessToken: {
    expiresIn: '1h', // 1時間
    algorithm: 'HS256',
  },
  refreshToken: {
    expiresIn: '30d', // 30日
    algorithm: 'HS256',
    rotate: true, // リフレッシュ時に新しいトークンを発行
  },
};

// トークンのペイロード
interface TokenPayload {
  sub: string;        // ユーザーID
  email: string;
  iat: number;        // 発行時刻
  exp: number;        // 有効期限
  jti?: string;       // トークンID（取り消し用）
}
```

#### セッションセキュリティ
```javascript
// セッション設定
const sessionConfig = {
  // 同時セッション数の制限
  maxConcurrentSessions: 5,
  
  // アイドルタイムアウト
  idleTimeout: 30 * 60 * 1000, // 30分
  
  // 絶対タイムアウト
  absoluteTimeout: 24 * 60 * 60 * 1000, // 24時間
  
  // セッション固定攻撃対策
  regenerateSessionId: true,
};

// セッション管理
class SessionManager {
  async createSession(userId, deviceInfo) {
    // 既存セッション数チェック
    const activeSessions = await this.getActiveSessions(userId);
    if (activeSessions.length >= sessionConfig.maxConcurrentSessions) {
      // 最も古いセッションを無効化
      await this.invalidateOldestSession(userId);
    }

    // 新しいセッション作成
    const session = {
      id: generateSessionId(),
      userId,
      deviceInfo,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    };

    await this.saveSession(session);
    return session;
  }

  async validateSession(sessionId) {
    const session = await this.getSession(sessionId);
    
    if (!session) {
      throw new Error('Invalid session');
    }

    // タイムアウトチェック
    const now = Date.now();
    const idleTime = now - session.lastActivityAt;
    const totalTime = now - session.createdAt;

    if (idleTime > sessionConfig.idleTimeout) {
      await this.invalidateSession(sessionId);
      throw new Error('Session timeout');
    }

    if (totalTime > sessionConfig.absoluteTimeout) {
      await this.invalidateSession(sessionId);
      throw new Error('Session expired');
    }

    // アクティビティ更新
    await this.updateLastActivity(sessionId);
    
    return session;
  }
}
```

## 3. API セキュリティ

### 3.1 認証ヘッダー検証

```javascript
// 認証ミドルウェアのセキュリティ強化
async function secureAuthMiddleware(req, res, next) {
  try {
    // ヘッダー検証
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: { code: 'AUTH_MISSING_TOKEN', message: 'No token provided' }
      });
    }

    const token = authHeader.substring(7);

    // トークン形式検証
    if (!/^[\w-]+\.[\w-]+\.[\w-]+$/.test(token)) {
      return res.status(401).json({
        error: { code: 'AUTH_INVALID_TOKEN_FORMAT', message: 'Invalid token format' }
      });
    }

    // トークン検証
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: { code: 'AUTH_INVALID_TOKEN', message: 'Invalid token' }
      });
    }

    // リクエストコンテキストに追加
    req.user = user;
    req.token = token;

    // レート制限チェック
    await rateLimiter.check(user.id);

    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({
      error: { code: 'AUTH_ERROR', message: 'Authentication error' }
    });
  }
}
```

### 3.2 レート制限

```javascript
// レート制限設定
const rateLimitConfig = {
  // 一般的なAPI
  default: {
    windowMs: 15 * 60 * 1000, // 15分
    max: 100, // リクエスト数
  },
  // 認証関連API
  auth: {
    windowMs: 15 * 60 * 1000, // 15分
    max: 5, // より厳格な制限
  },
  // パスワードリセット
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1時間
    max: 3,
  },
};

// レート制限実装
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

// 認証エンドポイント用
const authLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:auth:',
  }),
  windowMs: rateLimitConfig.auth.windowMs,
  max: rateLimitConfig.auth.max,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ブルートフォース対策
class BruteForceProtection {
  constructor() {
    this.attempts = new Map();
    this.blockDuration = 30 * 60 * 1000; // 30分
    this.maxAttempts = 5;
  }

  async recordFailedAttempt(identifier) {
    const key = `failed:${identifier}`;
    const attempts = this.attempts.get(key) || 0;
    
    if (attempts >= this.maxAttempts) {
      // アカウントを一時的にロック
      await this.lockAccount(identifier);
      return true;
    }

    this.attempts.set(key, attempts + 1);
    
    // 一定時間後にリセット
    setTimeout(() => {
      this.attempts.delete(key);
    }, this.blockDuration);

    return false;
  }

  async clearFailedAttempts(identifier) {
    const key = `failed:${identifier}`;
    this.attempts.delete(key);
  }

  async isLocked(identifier) {
    // Redis等で永続化する場合の実装
    return false;
  }
}
```

### 3.3 CORS設定

```javascript
// CORS設定
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'https://app.taskmaster.com',
      'https://staging.taskmaster.com'
    ];

    // 開発環境では localhost を許可
    if (process.env.NODE_ENV === 'development') {
      allowedOrigins.push('http://localhost:3000');
    }

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400, // 24時間
};

app.use(cors(corsOptions));
```

### 3.4 入力検証とサニタイゼーション

```javascript
// 入力検証ミドルウェア
import { body, validationResult } from 'express-validator';
import DOMPurify from 'isomorphic-dompurify';

// XSS対策
function sanitizeInput(input) {
  if (typeof input === 'string') {
    // HTMLタグを除去
    return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
  }
  if (typeof input === 'object' && input !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  return input;
}

// SQLインジェクション対策（Supabaseが自動的に処理）
// カスタムクエリの場合
function escapeSQL(value) {
  if (typeof value === 'string') {
    return value.replace(/['"\\\0\n\r\b\t\x1a]/g, (match) => {
      const escapes = {
        "'": "\\'",
        '"': '\\"',
        '\\': '\\\\',
        '\0': '\\0',
        '\n': '\\n',
        '\r': '\\r',
        '\b': '\\b',
        '\t': '\\t',
        '\x1a': '\\Z'
      };
      return escapes[match];
    });
  }
  return value;
}

// バリデーションルール
const validationRules = {
  signup: [
    body('email')
      .isEmail().withMessage('有効なメールアドレスを入力してください')
      .normalizeEmail()
      .custom(async (email) => {
        // メールアドレスのブラックリストチェック
        const disposableDomains = ['tempmail.com', 'throwaway.email'];
        const domain = email.split('@')[1];
        if (disposableDomains.includes(domain)) {
          throw new Error('このメールアドレスは使用できません');
        }
        return true;
      }),
    body('password')
      .isLength({ min: 8 }).withMessage('パスワードは8文字以上必要です')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('パスワードは大文字、小文字、数字を含む必要があります'),
    body('fullName')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('氏名は1-100文字で入力してください')
      .matches(/^[a-zA-Zぁ-んァ-ヶー一-龠々\s]+$/)
      .withMessage('氏名に使用できない文字が含まれています'),
  ],
};
```

## 4. データベースセキュリティ

### 4.1 Row Level Security (RLS) ベストプラクティス

```sql
-- RLSポリシーの原則
-- 1. 最小権限の原則
-- 2. 明示的な許可
-- 3. コンテキストベースのアクセス制御

-- 組織データへのアクセス制御
CREATE POLICY "strict_organization_access" ON organizations
  USING (
    -- ユーザーが組織のメンバーである場合のみアクセス可能
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = organizations.id
      AND profile_id = auth.uid()
    )
  );

-- 階層的なアクセス制御
CREATE POLICY "hierarchical_project_access" ON projects
  USING (
    -- プロジェクトへのアクセスは組織メンバーシップ経由
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE profile_id = auth.uid()
    )
    AND
    -- プロジェクト固有の権限チェック
    (
      -- 組織管理者は全プロジェクトにアクセス可能
      EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = projects.organization_id
        AND profile_id = auth.uid()
        AND role = 'admin'
      )
      OR
      -- プロジェクトメンバーはアクセス可能
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = projects.id
        AND profile_id = auth.uid()
      )
    )
  );

-- 監査ログのセキュリティ
CREATE POLICY "audit_log_insert_only" ON audit_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 読み取りは管理者のみ
CREATE POLICY "audit_log_admin_read" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE profile_id = auth.uid()
      AND role = 'admin'
    )
  );
```

### 4.2 データ暗号化

```javascript
// 機密データの暗号化
import crypto from 'crypto';

class DataEncryption {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyDerivation = 'pbkdf2';
    this.iterations = 100000;
    this.keyLength = 32;
    this.saltLength = 16;
    this.tagLength = 16;
    this.ivLength = 16;
  }

  // 暗号化
  async encrypt(text, masterKey) {
    const salt = crypto.randomBytes(this.saltLength);
    const iv = crypto.randomBytes(this.ivLength);

    // キー導出
    const key = crypto.pbkdf2Sync(
      masterKey,
      salt,
      this.iterations,
      this.keyLength,
      'sha256'
    );

    // 暗号化
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final()
    ]);
    
    const tag = cipher.getAuthTag();

    // 結果を結合
    return Buffer.concat([salt, iv, tag, encrypted]).toString('base64');
  }

  // 復号化
  async decrypt(encryptedData, masterKey) {
    const data = Buffer.from(encryptedData, 'base64');

    const salt = data.slice(0, this.saltLength);
    const iv = data.slice(this.saltLength, this.saltLength + this.ivLength);
    const tag = data.slice(
      this.saltLength + this.ivLength,
      this.saltLength + this.ivLength + this.tagLength
    );
    const encrypted = data.slice(this.saltLength + this.ivLength + this.tagLength);

    // キー導出
    const key = crypto.pbkdf2Sync(
      masterKey,
      salt,
      this.iterations,
      this.keyLength,
      'sha256'
    );

    // 復号化
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);

    return decrypted.toString('utf8');
  }
}

// 使用例：個人情報の暗号化
const encryption = new DataEncryption();

async function storePersonalData(userId, data) {
  const masterKey = process.env.ENCRYPTION_MASTER_KEY;
  
  const encryptedData = {
    phoneNumber: await encryption.encrypt(data.phoneNumber, masterKey),
    address: await encryption.encrypt(data.address, masterKey),
  };

  await supabase
    .from('user_personal_data')
    .insert({
      user_id: userId,
      encrypted_data: encryptedData,
    });
}
```

## 5. 監査とロギング

### 5.1 セキュリティイベントログ

```javascript
// セキュリティイベントロガー
class SecurityLogger {
  constructor() {
    this.events = {
      // 認証イベント
      AUTH_SUCCESS: 'auth.success',
      AUTH_FAILURE: 'auth.failure',
      AUTH_LOGOUT: 'auth.logout',
      
      // アカウントイベント
      ACCOUNT_CREATED: 'account.created',
      ACCOUNT_DELETED: 'account.deleted',
      PASSWORD_CHANGED: 'password.changed',
      PASSWORD_RESET: 'password.reset',
      
      // セキュリティイベント
      SUSPICIOUS_ACTIVITY: 'security.suspicious',
      BRUTE_FORCE_DETECTED: 'security.brute_force',
      UNAUTHORIZED_ACCESS: 'security.unauthorized',
      
      // データアクセス
      SENSITIVE_DATA_ACCESS: 'data.sensitive_access',
      BULK_DATA_EXPORT: 'data.bulk_export',
    };
  }

  async log(eventType, userId, metadata = {}) {
    const event = {
      id: crypto.randomUUID(),
      type: eventType,
      user_id: userId,
      ip_address: metadata.ip || null,
      user_agent: metadata.userAgent || null,
      timestamp: new Date(),
      metadata: this.sanitizeMetadata(metadata),
    };

    // データベースに保存
    await supabase
      .from('security_logs')
      .insert(event);

    // 重要なイベントは別途通知
    if (this.isCriticalEvent(eventType)) {
      await this.notifySecurityTeam(event);
    }

    return event;
  }

  sanitizeMetadata(metadata) {
    // 機密情報を除外
    const { password, token, ...safe } = metadata;
    return safe;
  }

  isCriticalEvent(eventType) {
    return [
      this.events.BRUTE_FORCE_DETECTED,
      this.events.UNAUTHORIZED_ACCESS,
      this.events.ACCOUNT_DELETED,
    ].includes(eventType);
  }

  async notifySecurityTeam(event) {
    // Slack、メール等で通知
    console.error('Critical security event:', event);
  }
}

// 使用例
const securityLogger = new SecurityLogger();

// ログインの記録
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authenticateUser(email, password);
    
    await securityLogger.log(
      securityLogger.events.AUTH_SUCCESS,
      result.user.id,
      {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        method: 'password',
      }
    );
    
    res.json({ success: true, data: result });
  } catch (error) {
    await securityLogger.log(
      securityLogger.events.AUTH_FAILURE,
      null,
      {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        email: email,
        reason: error.message,
      }
    );
    
    res.status(401).json({ error: 'Authentication failed' });
  }
});
```

### 5.2 コンプライアンスとプライバシー

```javascript
// GDPR対応
class PrivacyCompliance {
  // データエクスポート
  async exportUserData(userId) {
    const data = {
      profile: await this.getProfile(userId),
      organizations: await this.getOrganizations(userId),
      projects: await this.getProjects(userId),
      tasks: await this.getTasks(userId),
      auditLogs: await this.getAuditLogs(userId),
    };

    return {
      exportedAt: new Date(),
      userId,
      data: this.anonymizeData(data),
    };
  }

  // データ削除（忘れられる権利）
  async deleteUserData(userId) {
    // トランザクション内で実行
    await supabase.rpc('delete_user_data', { user_id: userId });
    
    // 削除証明書の生成
    return {
      deletedAt: new Date(),
      userId,
      certificate: this.generateDeletionCertificate(userId),
    };
  }

  // データの匿名化
  anonymizeData(data) {
    // 個人を特定できる情報を匿名化
    return {
      ...data,
      profile: {
        ...data.profile,
        email: this.hashEmail(data.profile.email),
        fullName: 'REDACTED',
      },
    };
  }

  hashEmail(email) {
    return crypto
      .createHash('sha256')
      .update(email + process.env.ANONYMIZATION_SALT)
      .digest('hex')
      .substring(0, 8) + '@example.com';
  }
}
```

## 6. インシデント対応

### 6.1 セキュリティインシデント対応手順

```javascript
// インシデント対応
class IncidentResponse {
  async handleSecurityIncident(incidentType, affectedUsers) {
    const incident = {
      id: crypto.randomUUID(),
      type: incidentType,
      detectedAt: new Date(),
      affectedUsers,
      status: 'investigating',
    };

    // 1. インシデントの記録
    await this.recordIncident(incident);

    // 2. 影響範囲の特定
    const impact = await this.assessImpact(incident);

    // 3. 即座の対応
    switch (incidentType) {
      case 'data_breach':
        await this.handleDataBreach(affectedUsers);
        break;
      case 'account_compromise':
        await this.handleAccountCompromise(affectedUsers);
        break;
      case 'unauthorized_access':
        await this.handleUnauthorizedAccess(affectedUsers);
        break;
    }

    // 4. 通知
    await this.notifyAffectedUsers(affectedUsers, incidentType);

    // 5. 事後対応
    await this.postIncidentActions(incident);

    return incident;
  }

  async handleAccountCompromise(userIds) {
    for (const userId of userIds) {
      // セッションの無効化
      await this.invalidateAllSessions(userId);
      
      // パスワードリセットの強制
      await this.forcePasswordReset(userId);
      
      // 一時的なアカウントロック
      await this.temporaryLockAccount(userId);
    }
  }

  async notifyAffectedUsers(userIds, incidentType) {
    const template = this.getNotificationTemplate(incidentType);
    
    for (const userId of userIds) {
      await this.sendSecurityNotification(userId, template);
    }
  }
}
```

## 7. セキュリティチェックリスト

### デプロイ前チェックリスト

- [ ] すべての環境変数が安全に管理されている
- [ ] HTTPSが有効化されている
- [ ] セキュリティヘッダーが適切に設定されている
- [ ] レート制限が実装されている
- [ ] 入力検証が全エンドポイントで実装されている
- [ ] エラーメッセージが情報を漏洩していない
- [ ] ログに機密情報が含まれていない
- [ ] 依存関係に既知の脆弱性がない
- [ ] バックアップとリカバリー計画がある
- [ ] インシデント対応計画が準備されている

### 定期的なセキュリティレビュー

- [ ] 月次：アクセスログのレビュー
- [ ] 月次：失敗したログイン試行の分析
- [ ] 四半期：依存関係の脆弱性スキャン
- [ ] 四半期：RLSポリシーのレビュー
- [ ] 年次：ペネトレーションテスト
- [ ] 年次：セキュリティ監査