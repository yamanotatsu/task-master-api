# APIエンドポイント詳細仕様

## 1. 認証エンドポイント

### POST /api/v1/auth/signup
新規ユーザー登録

**リクエスト**
```json
{
  "fullName": "山田 太郎",
  "email": "yamada@example.com",
  "password": "securepassword123"
}
```

**レスポンス (201 Created)**
```json
{
  "success": true,
  "message": "Please check your email to confirm your account",
  "data": {
    "userId": "uuid-string"
  }
}
```

**エラーレスポンス (400 Bad Request)**
```json
{
  "success": false,
  "error": "Email already registered"
}
```

### POST /api/v1/auth/login
ユーザーログイン

**リクエスト**
```json
{
  "email": "yamada@example.com",
  "password": "securepassword123"
}
```

**レスポンス (200 OK)**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-string",
      "email": "yamada@example.com",
      "fullName": "山田 太郎"
    },
    "session": {
      "access_token": "jwt-token",
      "refresh_token": "refresh-token",
      "expires_in": 3600
    }
  }
}
```

### POST /api/v1/auth/logout
ユーザーログアウト

**ヘッダー**
```
Authorization: Bearer <access_token>
```

**レスポンス (200 OK)**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### DELETE /api/v1/auth/user
アカウント削除

**ヘッダー**
```
Authorization: Bearer <access_token>
```

**レスポンス (200 OK)**
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

### PUT /api/v1/auth/profile
プロファイル更新

**ヘッダー**
```
Authorization: Bearer <access_token>
```

**リクエスト**
```json
{
  "fullName": "山田 次郎"
}
```

**レスポンス (200 OK)**
```json
{
  "success": true,
  "data": {
    "id": "uuid-string",
    "fullName": "山田 次郎",
    "email": "yamada@example.com"
  }
}
```

## 2. 組織管理エンドポイント

### POST /api/v1/organizations
組織作成

**ヘッダー**
```
Authorization: Bearer <access_token>
```

**リクエスト**
```json
{
  "name": "株式会社サンプル"
}
```

**レスポンス (201 Created)**
```json
{
  "success": true,
  "data": {
    "id": "org-uuid",
    "name": "株式会社サンプル",
    "role": "admin"
  }
}
```

### GET /api/v1/organizations
組織一覧取得

**ヘッダー**
```
Authorization: Bearer <access_token>
```

**レスポンス (200 OK)**
```json
{
  "success": true,
  "data": [
    {
      "id": "org-uuid-1",
      "name": "株式会社サンプル",
      "role": "admin"
    },
    {
      "id": "org-uuid-2",
      "name": "テスト組織",
      "role": "member"
    }
  ]
}
```

### GET /api/v1/organizations/:orgId/members
組織メンバー一覧取得

**ヘッダー**
```
Authorization: Bearer <access_token>
```

**レスポンス (200 OK)**
```json
{
  "success": true,
  "data": [
    {
      "id": "user-uuid-1",
      "name": "山田 太郎",
      "email": "yamada@example.com",
      "role": "admin"
    },
    {
      "id": "user-uuid-2",
      "name": "佐藤 花子",
      "email": "sato@example.com",
      "role": "member"
    }
  ]
}
```

### POST /api/v1/organizations/:orgId/invites
メンバー招待

**ヘッダー**
```
Authorization: Bearer <access_token>
```

**リクエスト**
```json
{
  "email": "newmember@example.com"
}
```

**レスポンス (既存ユーザーの場合)**
```json
{
  "success": true,
  "message": "Existing user has been added to the organization"
}
```

**レスポンス (新規ユーザーの場合)**
```json
{
  "success": true,
  "message": "Invitation email has been sent"
}
```

### PUT /api/v1/organizations/:orgId/members/:profileId
メンバーロール更新

**ヘッダー**
```
Authorization: Bearer <access_token>
```

**リクエスト**
```json
{
  "role": "admin"
}
```

**レスポンス (200 OK)**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "role": "admin"
  }
}
```

### DELETE /api/v1/organizations/:orgId/members/:profileId
メンバー削除

**ヘッダー**
```
Authorization: Bearer <access_token>
```

**レスポンス (200 OK)**
```json
{
  "success": true,
  "message": "Member removed successfully"
}
```

## 3. エラーレスポンス仕様

### 認証エラー (401 Unauthorized)
```json
{
  "success": false,
  "error": "Authentication required",
  "code": "AUTH_REQUIRED"
}
```

### 権限エラー (403 Forbidden)
```json
{
  "success": false,
  "error": "Insufficient permissions",
  "code": "FORBIDDEN"
}
```

### バリデーションエラー (400 Bad Request)
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### サーバーエラー (500 Internal Server Error)
```json
{
  "success": false,
  "error": "Internal server error",
  "code": "INTERNAL_ERROR"
}
```

## 4. 認証ヘッダー仕様

すべての保護されたエンドポイントには以下のヘッダーが必要：

```
Authorization: Bearer <jwt_access_token>
```

トークンが無効または期限切れの場合、401エラーが返されます。

## 5. CORS設定

開発環境：
```javascript
cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
})
```

本番環境：
```javascript
cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
})
```