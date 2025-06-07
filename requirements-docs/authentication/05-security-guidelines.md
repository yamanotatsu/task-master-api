# セキュリティガイドライン

## 1. 認証セキュリティ

### 1.1 パスワードポリシー
- **最小長**: 8文字以上
- **推奨**: 大文字・小文字・数字・特殊文字の組み合わせ
- **保存**: Supabase Auth によるbcryptハッシュ化（自動）
- **履歴**: 過去のパスワード再利用防止（将来実装）

### 1.2 セッション管理
```javascript
// セッション設定
const sessionConfig = {
  accessTokenLifetime: 3600,        // 1時間
  refreshTokenLifetime: 604800,     // 7日間
  idleTimeout: 1800,                // 30分（将来実装）
};
```

### 1.3 多要素認証（将来実装）
- TOTP（Time-based One-Time Password）
- SMS認証
- 認証アプリケーション連携

## 2. APIセキュリティ

### 2.1 認証ミドルウェア実装
```javascript
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      throw new Error('Invalid token');
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN'
    });
  }
};
```

### 2.2 レート制限
```javascript
// レート制限設定
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000,  // 15分
  max: 100,                   // 最大リクエスト数
  
  // エンドポイント別設定
  endpoints: {
    '/auth/login': { max: 5, windowMs: 15 * 60 * 1000 },
    '/auth/signup': { max: 3, windowMs: 60 * 60 * 1000 },
    '/api/*': { max: 100, windowMs: 15 * 60 * 1000 }
  }
};
```

### 2.3 入力検証
```javascript
// 入力検証例
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format');
  }
  return email.toLowerCase().trim();
};

const validatePassword = (password) => {
  if (password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters');
  }
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    throw new ValidationError('Password must contain uppercase, lowercase, and numbers');
  }
  return password;
};
```

## 3. データベースセキュリティ

### 3.1 Row Level Security (RLS)
```sql
-- 組織データへのアクセス制限
CREATE POLICY "Users can only access their organization data"
ON projects
FOR ALL
USING (
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE profile_id = auth.uid()
  )
);
```

### 3.2 SQLインジェクション対策
```javascript
// パラメータ化クエリの使用
const getProjectById = async (projectId, userId) => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();
    
  // RLSにより自動的にユーザーの組織でフィルタリング
  return data;
};
```

### 3.3 データ暗号化
- **転送時**: TLS 1.2以上
- **保存時**: Supabaseによる自動暗号化
- **機密データ**: 追加の暗号化レイヤー（将来実装）

## 4. フロントエンドセキュリティ

### 4.1 XSS対策
```typescript
// React による自動エスケープ
const UserProfile = ({ user }) => {
  return (
    <div>
      {/* 自動的にエスケープされる */}
      <h1>{user.name}</h1>
      
      {/* 危険: 使用を避ける */}
      <div dangerouslySetInnerHTML={{ __html: user.bio }} />
      
      {/* 安全: サニタイズ後に使用 */}
      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(user.bio) }} />
    </div>
  );
};
```

### 4.2 CSRF対策
```typescript
// SameSite Cookie設定
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7日
};
```

### 4.3 Content Security Policy
```typescript
// Next.js セキュリティヘッダー
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline';
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https:;
      font-src 'self';
      connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL};
    `.replace(/\n/g, ''),
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
];
```

## 5. 監査とロギング

### 5.1 セキュリティイベントログ
```javascript
const logSecurityEvent = async (event) => {
  await supabase.from('security_logs').insert({
    event_type: event.type,
    user_id: event.userId,
    ip_address: event.ip,
    user_agent: event.userAgent,
    details: event.details,
    created_at: new Date().toISOString(),
  });
};

// 使用例
logSecurityEvent({
  type: 'LOGIN_ATTEMPT',
  userId: user.id,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  details: { success: true },
});
```

### 5.2 監視対象イベント
- ログイン試行（成功/失敗）
- パスワード変更
- 権限昇格
- アカウント削除
- 異常なアクセスパターン

## 6. インシデント対応

### 6.1 セキュリティインシデント手順
1. **検知**: 異常なアクティビティの自動検知
2. **隔離**: 影響を受けたアカウントの一時停止
3. **調査**: ログ分析と影響範囲の特定
4. **修復**: パスワードリセット、セッション無効化
5. **報告**: 影響を受けたユーザーへの通知

### 6.2 緊急時の対応
```javascript
// 全セッション無効化
const invalidateAllSessions = async (userId) => {
  await supabase.auth.admin.signOut(userId, 'global');
};

// アカウントロック
const lockAccount = async (userId) => {
  await supabase.auth.admin.updateUserById(userId, {
    ban_duration: '876600h', // 100年
  });
};
```

## 7. コンプライアンス

### 7.1 データプライバシー
- **個人情報の最小化**: 必要最小限のデータのみ収集
- **データ保持期間**: 明確な保持ポリシーの設定
- **削除権**: ユーザーによるデータ削除要求への対応

### 7.2 GDPR対応（将来実装）
- データポータビリティ
- 忘れられる権利
- 明示的な同意取得
- データ処理の透明性

## 8. セキュリティチェックリスト

### デプロイ前チェック
- [ ] 環境変数の適切な設定
- [ ] 本番環境でのデバッグモード無効化
- [ ] HTTPSの強制
- [ ] セキュリティヘッダーの設定
- [ ] 依存関係の脆弱性スキャン
- [ ] RLSポリシーの動作確認
- [ ] レート制限の設定
- [ ] ログ設定の確認

### 定期チェック
- [ ] 依存関係の更新
- [ ] セキュリティパッチの適用
- [ ] アクセスログの監査
- [ ] 異常なアクティビティの確認
- [ ] バックアップの検証