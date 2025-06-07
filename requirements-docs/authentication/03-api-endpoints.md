# APIエンドポイント詳細仕様

## 1. API設計原則

### 1.1 RESTful設計
- リソース指向のURL設計
- 適切なHTTPメソッドの使用
- ステータスコードの標準的な使用

### 1.2 認証方式
- Bearer Token認証（JWT）
- リフレッシュトークンによる自動更新
- CSRFトークンによる追加保護（将来実装）

### 1.3 レスポンスフォーマット
```typescript
// 成功レスポンス
{
  success: true,
  data: T,
  meta?: {
    pagination?: {
      page: number,
      limit: number,
      total: number
    }
  }
}

// エラーレスポンス
{
  success: false,
  error: {
    code: string,      // エラーコード（例: "AUTH_INVALID_CREDENTIALS"）
    message: string,   // ユーザー向けメッセージ
    details?: any[]    // 詳細情報（バリデーションエラー等）
  }
}
```

## 2. 認証エンドポイント

### 2.1 ユーザー登録

**エンドポイント**: `POST /api/v1/auth/signup`

**リクエスト**:
```json
{
  "fullName": "山田 太郎",
  "email": "yamada@example.com",
  "password": "SecurePassword123!"
}
```

**バリデーション**:
- `fullName`: 必須、1-100文字
- `email`: 必須、有効なメールアドレス形式
- `password`: 必須、8文字以上、大文字・小文字・数字を含む

**レスポンス** (201 Created):
```json
{
  "success": true,
  "data": {
    "message": "Registration successful. Please check your email to verify your account.",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "yamada@example.com"
    }
  }
}
```

**エラーケース**:
- 400: バリデーションエラー
- 409: メールアドレス既存

**実装詳細**:
```javascript
// api/routes/auth.js
router.post('/signup', async (req, res) => {
  const { fullName, email, password } = req.body;
  
  // バリデーション
  const errors = validateSignupInput({ fullName, email, password });
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: errors
      }
    });
  }
  
  try {
    // Supabase Auth でユーザー作成
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    });
    
    if (error) {
      if (error.message.includes('already registered')) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'AUTH_EMAIL_EXISTS',
            message: 'This email is already registered'
          }
        });
      }
      throw error;
    }
    
    res.status(201).json({
      success: true,
      data: {
        message: 'Registration successful. Please check your email to verify your account.',
        user: {
          id: data.user.id,
          email: data.user.email
        }
      }
    });
  } catch (error) {
    logger.error('Signup error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during registration'
      }
    });
  }
});
```

### 2.2 ログイン

**エンドポイント**: `POST /api/v1/auth/login`

**リクエスト**:
```json
{
  "email": "yamada@example.com",
  "password": "SecurePassword123!"
}
```

**レスポンス** (200 OK):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "yamada@example.com",
      "fullName": "山田 太郎"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600
    }
  }
}
```

**エラーケース**:
- 400: 入力不正
- 401: 認証失敗
- 403: メール未確認

### 2.3 ログアウト

**エンドポイント**: `POST /api/v1/auth/logout`

**ヘッダー**:
```
Authorization: Bearer <access_token>
```

**レスポンス** (200 OK):
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

### 2.4 トークンリフレッシュ

**エンドポイント**: `POST /api/v1/auth/refresh`

**リクエスト**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**レスポンス** (200 OK):
```json
{
  "success": true,
  "data": {
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600
    }
  }
}
```

### 2.5 パスワードリセット要求

**エンドポイント**: `POST /api/v1/auth/forgot-password`

**リクエスト**:
```json
{
  "email": "yamada@example.com"
}
```

**レスポンス** (200 OK):
```json
{
  "success": true,
  "data": {
    "message": "If an account exists with this email, a password reset link has been sent."
  }
}
```

### 2.6 パスワードリセット実行

**エンドポイント**: `POST /api/v1/auth/reset-password`

**リクエスト**:
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePassword123!"
}
```

**レスポンス** (200 OK):
```json
{
  "success": true,
  "data": {
    "message": "Password has been reset successfully"
  }
}
```

### 2.7 アカウント削除

**エンドポイント**: `DELETE /api/v1/auth/user`

**ヘッダー**:
```
Authorization: Bearer <access_token>
```

**リクエスト**:
```json
{
  "password": "CurrentPassword123!",
  "confirmDeletion": "DELETE MY ACCOUNT"
}
```

**レスポンス** (200 OK):
```json
{
  "success": true,
  "data": {
    "message": "Account has been permanently deleted"
  }
}
```

## 3. 組織管理エンドポイント

### 3.1 組織作成

**エンドポイント**: `POST /api/v1/organizations`

**ヘッダー**:
```
Authorization: Bearer <access_token>
```

**リクエスト**:
```json
{
  "name": "株式会社サンプル",
  "description": "サンプル組織の説明"
}
```

**レスポンス** (201 Created):
```json
{
  "success": true,
  "data": {
    "organization": {
      "id": "650e8400-e29b-41d4-a716-446655440001",
      "name": "株式会社サンプル",
      "description": "サンプル組織の説明",
      "createdAt": "2024-01-01T00:00:00Z"
    },
    "membership": {
      "role": "admin",
      "joinedAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

**実装詳細**:
```javascript
// api/routes/organizations.js
router.post('/', authMiddleware, async (req, res) => {
  const { name, description } = req.body;
  const userId = req.user.id;
  
  // トランザクション処理
  const { data, error } = await supabase.rpc('create_organization_with_admin', {
    org_name: name,
    org_description: description,
    admin_id: userId
  });
  
  if (error) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'ORG_CREATE_FAILED',
        message: 'Failed to create organization'
      }
    });
  }
  
  res.status(201).json({
    success: true,
    data: data
  });
});
```

### 3.2 組織一覧取得

**エンドポイント**: `GET /api/v1/organizations`

**ヘッダー**:
```
Authorization: Bearer <access_token>
```

**クエリパラメータ**:
- `page`: ページ番号（デフォルト: 1）
- `limit`: 1ページあたりの件数（デフォルト: 20、最大: 100）

**レスポンス** (200 OK):
```json
{
  "success": true,
  "data": {
    "organizations": [
      {
        "id": "650e8400-e29b-41d4-a716-446655440001",
        "name": "株式会社サンプル",
        "description": "サンプル組織の説明",
        "role": "admin",
        "memberCount": 5,
        "projectCount": 3,
        "joinedAt": "2024-01-01T00:00:00Z"
      }
    ]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1
    }
  }
}
```

### 3.3 組織詳細取得

**エンドポイント**: `GET /api/v1/organizations/{organizationId}`

**レスポンス** (200 OK):
```json
{
  "success": true,
  "data": {
    "organization": {
      "id": "650e8400-e29b-41d4-a716-446655440001",
      "name": "株式会社サンプル",
      "description": "サンプル組織の説明",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    },
    "membership": {
      "role": "admin",
      "joinedAt": "2024-01-01T00:00:00Z"
    },
    "statistics": {
      "memberCount": 5,
      "projectCount": 3,
      "activeTaskCount": 25
    }
  }
}
```

### 3.4 組織更新

**エンドポイント**: `PUT /api/v1/organizations/{organizationId}`

**認可**: 管理者のみ

**リクエスト**:
```json
{
  "name": "株式会社サンプル（新）",
  "description": "更新された説明"
}
```

## 4. メンバー管理エンドポイント

### 4.1 メンバー招待

**エンドポイント**: `POST /api/v1/organizations/{organizationId}/invites`

**認可**: 管理者のみ

**リクエスト**:
```json
{
  "email": "newmember@example.com",
  "role": "member"
}
```

**レスポンス** (201 Created):
```json
{
  "success": true,
  "data": {
    "invitation": {
      "id": "750e8400-e29b-41d4-a716-446655440002",
      "email": "newmember@example.com",
      "role": "member",
      "expiresAt": "2024-01-08T00:00:00Z",
      "inviteUrl": "https://app.taskmaster.com/invite/unique-token-here"
    }
  }
}
```

**実装詳細**:
```javascript
router.post('/:organizationId/invites', 
  authMiddleware, 
  requireRole('admin'),
  async (req, res) => {
    const { organizationId } = req.params;
    const { email, role = 'member' } = req.body;
    
    // 既存ユーザーチェック
    const { data: existingUser } = await supabase.auth.admin.getUserByEmail(email);
    
    if (existingUser) {
      // 既存ユーザーの場合、直接メンバーに追加
      const { error } = await supabase
        .from('organization_members')
        .insert({
          organization_id: organizationId,
          profile_id: existingUser.id,
          role
        })
        .select();
      
      if (!error) {
        return res.status(201).json({
          success: true,
          data: {
            message: 'Existing user has been added to the organization.',
            member: {
              id: existingUser.id,
              email: existingUser.email,
              role
            }
          }
        });
      }
    }
    
    // 新規ユーザーの場合、招待を作成
    const inviteToken = crypto.randomUUID();
    const { data: invitation, error } = await supabase
      .from('invitations')
      .insert({
        organization_id: organizationId,
        email,
        role,
        invited_by: req.user.id,
        token: inviteToken
      })
      .select()
      .single();
    
    if (!error) {
      // 招待メール送信（実装略）
      await sendInvitationEmail(email, inviteToken);
      
      res.status(201).json({
        success: true,
        data: {
          invitation: {
            ...invitation,
            inviteUrl: `${process.env.APP_URL}/invite/${inviteToken}`
          }
        }
      });
    }
  }
);
```

### 4.2 メンバー一覧取得

**エンドポイント**: `GET /api/v1/organizations/{organizationId}/members`

**クエリパラメータ**:
- `role`: フィルタリング（admin, member）
- `search`: 名前・メールで検索
- `page`, `limit`: ページネーション

**レスポンス** (200 OK):
```json
{
  "success": true,
  "data": {
    "members": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "yamada@example.com",
        "fullName": "山田 太郎",
        "avatarUrl": "https://example.com/avatar.jpg",
        "role": "admin",
        "joinedAt": "2024-01-01T00:00:00Z",
        "lastActiveAt": "2024-01-10T12:00:00Z"
      }
    ]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5
    }
  }
}
```

### 4.3 メンバーロール更新

**エンドポイント**: `PUT /api/v1/organizations/{organizationId}/members/{profileId}`

**認可**: 管理者のみ

**リクエスト**:
```json
{
  "role": "admin"
}
```

**レスポンス** (200 OK):
```json
{
  "success": true,
  "data": {
    "member": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "role": "admin",
      "updatedAt": "2024-01-10T12:00:00Z"
    }
  }
}
```

### 4.4 メンバー削除

**エンドポイント**: `DELETE /api/v1/organizations/{organizationId}/members/{profileId}`

**認可**: 管理者のみ

**レスポンス** (200 OK):
```json
{
  "success": true,
  "data": {
    "message": "Member has been removed from the organization"
  }
}
```

## 5. ユーザープロファイルエンドポイント

### 5.1 プロファイル取得

**エンドポイント**: `GET /api/v1/users/profile`

**レスポンス** (200 OK):
```json
{
  "success": true,
  "data": {
    "profile": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "yamada@example.com",
      "fullName": "山田 太郎",
      "avatarUrl": "https://example.com/avatar.jpg",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-10T00:00:00Z"
    }
  }
}
```

### 5.2 プロファイル更新

**エンドポイント**: `PUT /api/v1/users/profile`

**リクエスト**:
```json
{
  "fullName": "山田 太郎（更新）",
  "avatarUrl": "https://example.com/new-avatar.jpg"
}
```

### 5.3 パスワード変更

**エンドポイント**: `PUT /api/v1/users/password`

**リクエスト**:
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

## 6. エラーコード一覧

### 認証関連
- `AUTH_INVALID_CREDENTIALS`: 認証情報が無効
- `AUTH_EMAIL_NOT_VERIFIED`: メール未確認
- `AUTH_TOKEN_EXPIRED`: トークン期限切れ
- `AUTH_TOKEN_INVALID`: 無効なトークン
- `AUTH_EMAIL_EXISTS`: メールアドレス既存

### 認可関連
- `AUTHZ_INSUFFICIENT_PERMISSIONS`: 権限不足
- `AUTHZ_NOT_ORGANIZATION_MEMBER`: 組織メンバーではない
- `AUTHZ_REQUIRES_ADMIN`: 管理者権限が必要

### バリデーション関連
- `VALIDATION_ERROR`: 入力値検証エラー
- `VALIDATION_EMAIL_INVALID`: メールアドレス形式不正
- `VALIDATION_PASSWORD_WEAK`: パスワード強度不足

### リソース関連
- `RESOURCE_NOT_FOUND`: リソースが見つからない
- `RESOURCE_ALREADY_EXISTS`: リソースが既に存在
- `RESOURCE_LIMIT_EXCEEDED`: リソース制限超過

## 7. 認証ミドルウェア実装

```javascript
// api/middleware/auth.js
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_TOKEN_MISSING',
        message: 'Authentication required'
      }
    });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      throw new Error('Invalid token');
    }
    
    // プロファイル情報を取得
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    req.user = {
      id: user.id,
      email: user.email,
      profile
    };
    
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_TOKEN_INVALID',
        message: 'Invalid or expired token'
      }
    });
  }
};

// ロールベースアクセス制御ミドルウェア
const requireRole = (requiredRole) => {
  return async (req, res, next) => {
    const { organizationId } = req.params;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ORGANIZATION_ID_REQUIRED',
          message: 'Organization ID is required'
        }
      });
    }
    
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('profile_id', req.user.id)
      .single();
    
    if (!membership) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTHZ_NOT_ORGANIZATION_MEMBER',
          message: 'You are not a member of this organization'
        }
      });
    }
    
    if (requiredRole === 'admin' && membership.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTHZ_REQUIRES_ADMIN',
          message: 'Admin privileges required'
        }
      });
    }
    
    req.organizationMember = membership;
    next();
  };
};

module.exports = { authMiddleware, requireRole };
```