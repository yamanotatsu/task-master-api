# APIエンドポイント詳細仕様

## 1. エンドポイント一覧

### 認証関連 (Auth)
- `POST /api/v1/auth/signup` - ユーザー登録
- `POST /api/v1/auth/login` - ログイン
- `POST /api/v1/auth/logout` - ログアウト
- `POST /api/v1/auth/refresh` - トークンリフレッシュ
- `DELETE /api/v1/auth/user` - アカウント削除

### 組織関連 (Organizations)
- `POST /api/v1/organizations` - 組織作成
- `GET /api/v1/organizations` - 組織一覧取得
- `GET /api/v1/organizations/:orgId` - 組織詳細取得
- `PUT /api/v1/organizations/:orgId` - 組織情報更新

### メンバー管理 (Members)
- `POST /api/v1/organizations/:orgId/invites` - ユーザー招待
- `GET /api/v1/organizations/:orgId/members` - メンバー一覧取得
- `PUT /api/v1/organizations/:orgId/members/:profileId` - メンバーロール更新
- `DELETE /api/v1/organizations/:orgId/members/:profileId` - メンバー削除

## 2. 認証エンドポイント詳細

### 2.1 POST /api/v1/auth/signup

**説明**: 新規ユーザー登録

**認証**: 不要

**リクエスト**:
```json
{
  "fullName": "山田太郎",
  "email": "taro.yamada@example.com",
  "password": "SecurePassword123!"
}
```

**バリデーション**:
- fullName: 必須、1-100文字
- email: 必須、有効なメールアドレス形式
- password: 必須、8文字以上、大文字・小文字・数字を含む

**レスポンス (201)**:
```json
{
  "message": "確認メールを送信しました。メールをご確認ください。",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "taro.yamada@example.com"
  }
}
```

**エラーレスポンス**:
- 400: バリデーションエラー
- 409: メールアドレスが既に使用されている

**実装例**:
```javascript
router.post('/auth/signup', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    
    // バリデーション
    if (!fullName || !email || !password) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '必須項目が入力されていません'
        }
      });
    }
    
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
          error: {
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'このメールアドレスは既に登録されています'
          }
        });
      }
      throw error;
    }
    
    res.status(201).json({
      message: '確認メールを送信しました。メールをご確認ください。',
      data: {
        id: data.user.id,
        email: data.user.email
      }
    });
  } catch (error) {
    logger.error('Signup error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'サーバーエラーが発生しました'
      }
    });
  }
});
```

### 2.2 POST /api/v1/auth/login

**説明**: ユーザーログイン

**認証**: 不要

**リクエスト**:
```json
{
  "email": "taro.yamada@example.com",
  "password": "SecurePassword123!"
}
```

**レスポンス (200)**:
```json
{
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "taro.yamada@example.com",
      "fullName": "山田太郎"
    },
    "session": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expires_in": 900
    }
  }
}
```

**エラーレスポンス**:
- 400: バリデーションエラー
- 401: 認証失敗

### 2.3 POST /api/v1/auth/logout

**説明**: ログアウト

**認証**: 必要 (Bearer Token)

**リクエスト**: なし

**レスポンス (200)**:
```json
{
  "message": "ログアウトしました"
}
```

### 2.4 POST /api/v1/auth/refresh

**説明**: アクセストークンのリフレッシュ

**認証**: 不要（リフレッシュトークンをボディに含める）

**リクエスト**:
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**レスポンス (200)**:
```json
{
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 900
  }
}
```

### 2.5 DELETE /api/v1/auth/user

**説明**: アカウント削除

**認証**: 必要 (Bearer Token)

**リクエスト**: なし

**レスポンス (200)**:
```json
{
  "message": "アカウントが削除されました"
}
```

**注意**: この操作は取り消しできません

## 3. 組織エンドポイント詳細

### 3.1 POST /api/v1/organizations

**説明**: 新規組織作成

**認証**: 必要 (Bearer Token)

**リクエスト**:
```json
{
  "name": "株式会社サンプル"
}
```

**バリデーション**:
- name: 必須、1-100文字

**レスポンス (201)**:
```json
{
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "株式会社サンプル",
    "created_at": "2024-01-01T00:00:00Z",
    "role": "admin"
  }
}
```

**実装例**:
```javascript
router.post('/organizations', authMiddleware, async (req, res) => {
  const { name } = req.body;
  const userId = req.user.id;
  
  try {
    // トランザクション開始
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({ name })
      .select()
      .single();
      
    if (orgError) throw orgError;
    
    // メンバーとして追加（管理者権限）
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: org.id,
        profile_id: userId,
        role: 'admin'
      });
      
    if (memberError) throw memberError;
    
    res.status(201).json({
      data: {
        ...org,
        role: 'admin'
      }
    });
  } catch (error) {
    logger.error('Organization creation error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: '組織の作成に失敗しました'
      }
    });
  }
});
```

### 3.2 GET /api/v1/organizations

**説明**: ユーザーが所属する組織一覧を取得

**認証**: 必要 (Bearer Token)

**クエリパラメータ**:
- `page`: ページ番号（デフォルト: 1）
- `limit`: 1ページあたりの件数（デフォルト: 20、最大: 100）

**レスポンス (200)**:
```json
{
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "株式会社サンプル",
      "role": "admin",
      "member_count": 5,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "total_pages": 1
  }
}
```

### 3.3 GET /api/v1/organizations/:orgId

**説明**: 組織の詳細情報を取得

**認証**: 必要 (Bearer Token)

**パスパラメータ**:
- `orgId`: 組織ID

**レスポンス (200)**:
```json
{
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "株式会社サンプル",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",
    "role": "admin",
    "member_count": 5,
    "project_count": 10,
    "task_count": 150
  }
}
```

## 4. メンバー管理エンドポイント詳細

### 4.1 POST /api/v1/organizations/:orgId/invites

**説明**: 組織にユーザーを招待

**認証**: 必要 (Bearer Token + Admin権限)

**リクエスト**:
```json
{
  "email": "new.member@example.com"
}
```

**レスポンス (200) - 既存ユーザーの場合**:
```json
{
  "message": "ユーザーを組織に追加しました",
  "data": {
    "profile_id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "new.member@example.com",
    "status": "added"
  }
}
```

**レスポンス (200) - 新規ユーザーの場合**:
```json
{
  "message": "招待メールを送信しました",
  "data": {
    "email": "new.member@example.com",
    "status": "invited"
  }
}
```

**実装例**:
```javascript
router.post('/organizations/:orgId/invites', 
  authMiddleware, 
  rbacMiddleware('admin'),
  async (req, res) => {
    const { orgId } = req.params;
    const { email } = req.body;
    
    try {
      // ユーザーの存在確認
      const { data: existingUser } = await supabase.auth.admin
        .getUserByEmail(email);
      
      if (existingUser) {
        // 既存ユーザーを組織に追加
        const { error } = await supabase
          .from('organization_members')
          .insert({
            organization_id: orgId,
            profile_id: existingUser.id,
            role: 'member'
          })
          .onConflict('organization_id,profile_id')
          .ignore();
        
        res.json({
          message: 'ユーザーを組織に追加しました',
          data: {
            profile_id: existingUser.id,
            email: email,
            status: 'added'
          }
        });
      } else {
        // 招待処理（実装はフェーズ4）
        res.json({
          message: '招待メールを送信しました',
          data: {
            email: email,
            status: 'invited'
          }
        });
      }
    } catch (error) {
      logger.error('Invite error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: '招待処理に失敗しました'
        }
      });
    }
  }
);
```

### 4.2 GET /api/v1/organizations/:orgId/members

**説明**: 組織のメンバー一覧を取得

**認証**: 必要 (Bearer Token)

**クエリパラメータ**:
- `role`: ロールでフィルタ（admin, member）
- `search`: 名前やメールで検索

**レスポンス (200)**:
```json
{
  "data": [
    {
      "profile_id": "550e8400-e29b-41d4-a716-446655440000",
      "full_name": "山田太郎",
      "email": "taro.yamada@example.com",
      "avatar_url": null,
      "role": "admin",
      "joined_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 4.3 PUT /api/v1/organizations/:orgId/members/:profileId

**説明**: メンバーのロールを更新

**認証**: 必要 (Bearer Token + Admin権限)

**リクエスト**:
```json
{
  "role": "admin"
}
```

**バリデーション**:
- role: 必須、"admin" または "member"

**レスポンス (200)**:
```json
{
  "message": "メンバーのロールを更新しました",
  "data": {
    "profile_id": "550e8400-e29b-41d4-a716-446655440000",
    "role": "admin"
  }
}
```

### 4.4 DELETE /api/v1/organizations/:orgId/members/:profileId

**説明**: 組織からメンバーを削除

**認証**: 必要 (Bearer Token + Admin権限)

**レスポンス (200)**:
```json
{
  "message": "メンバーを組織から削除しました"
}
```

**エラーレスポンス**:
- 400: 最後の管理者は削除できない
- 403: 権限不足
- 404: メンバーが見つからない

## 5. エラーレスポンス仕様

### 標準エラー形式

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "ユーザー向けのエラーメッセージ",
    "details": {
      "field": "詳細情報（オプション）"
    }
  }
}
```

### エラーコード一覧

| コード | HTTPステータス | 説明 |
|--------|---------------|------|
| VALIDATION_ERROR | 400 | リクエストのバリデーションエラー |
| AUTH_INVALID_TOKEN | 401 | 無効な認証トークン |
| AUTH_EXPIRED_TOKEN | 401 | 期限切れの認証トークン |
| AUTH_INSUFFICIENT_PERMISSIONS | 403 | 権限不足 |
| NOT_FOUND | 404 | リソースが見つからない |
| EMAIL_ALREADY_EXISTS | 409 | メールアドレスが既に使用されている |
| INTERNAL_ERROR | 500 | サーバー内部エラー |

## 6. 認証ミドルウェア

### 実装例

```javascript
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          code: 'AUTH_INVALID_TOKEN',
          message: '認証トークンが必要です'
        }
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Supabaseでトークン検証
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({
        error: {
          code: 'AUTH_INVALID_TOKEN',
          message: '無効な認証トークンです'
        }
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: '認証処理でエラーが発生しました'
      }
    });
  }
};
```

## 7. RBACミドルウェア

### 実装例

```javascript
const rbacMiddleware = (requiredRole) => {
  return async (req, res, next) => {
    try {
      const { orgId } = req.params;
      const userId = req.user.id;
      
      // ユーザーの組織内ロールを確認
      const { data: member, error } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', orgId)
        .eq('profile_id', userId)
        .single();
      
      if (error || !member) {
        return res.status(403).json({
          error: {
            code: 'AUTH_INSUFFICIENT_PERMISSIONS',
            message: 'この操作を行う権限がありません'
          }
        });
      }
      
      // admin権限が必要な場合のチェック
      if (requiredRole === 'admin' && member.role !== 'admin') {
        return res.status(403).json({
          error: {
            code: 'AUTH_INSUFFICIENT_PERMISSIONS',
            message: '管理者権限が必要です'
          }
        });
      }
      
      req.organization_member = member;
      next();
    } catch (error) {
      logger.error('RBAC middleware error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: '権限確認でエラーが発生しました'
        }
      });
    }
  };
};
```