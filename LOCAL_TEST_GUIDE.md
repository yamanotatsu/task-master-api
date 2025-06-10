# ローカルテストガイド

## 1. 環境準備

### 必要な環境変数の設定

1. **バックエンド環境変数** (`api/.env`)
```bash
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
SUPABASE_ANON_KEY=your_anon_key

# JWT
JWT_SECRET=your_jwt_secret

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000

# Email Provider (optional for development)
EMAIL_PROVIDER=console  # または sendgrid, aws-ses
SENDGRID_API_KEY=your_sendgrid_key  # SendGrid使用時
```

2. **フロントエンド環境変数** (`frontend/task-master-ui/.env.local`)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## 2. サービスの起動

### バックエンドの起動
```bash
# APIサーバーの起動
cd api
npm install
node server-db.js

# または開発モード（ファイル変更を監視）
npm run api:db:dev
```

### フロントエンドの起動
```bash
# 別のターミナルで
cd frontend/task-master-ui
npm install
npm run dev
```

## 3. 招待メール機能のテスト手順

### 3.1 初期セットアップ

1. ブラウザで http://localhost:3000 にアクセス
2. 新規ユーザー登録または既存ユーザーでログイン
3. 組織がない場合は新規作成

### 3.2 招待メールの送信テスト

1. **メンバー管理画面へ移動**
   - 左サイドバーの「設定」→「メンバー管理」

2. **新規メンバーを招待**
   - 「メンバーを招待」ボタンをクリック
   - メールアドレスを入力（例: `newuser@example.com`）
   - 権限を選択（管理者/メンバー）
   - 「招待を送信」ボタンをクリック

3. **招待メールの確認**
   - コンソールログで招待URLを確認
   - `api/dev-emails/`フォルダに保存されたHTMLファイルを開く
   ```bash
   # 最新の招待メールを確認
   ls -la api/dev-emails/invitation_*.html
   open api/dev-emails/invitation_*.html  # macOS
   ```

### 3.3 招待の再送信テスト

1. メンバー管理画面の「保留中の招待」セクション
2. 対象の招待の「再送信」ボタンをクリック
3. 新しいメールファイルが生成されることを確認

### 3.4 招待の受け入れテスト

1. 招待メールのURLをコピー
2. ブラウザの別のプロファイルまたはプライベートウィンドウで開く
3. 新規アカウントを作成または既存アカウントでログイン
4. 自動的に組織に追加されることを確認

## 4. APIの直接テスト

### 認証トークンの取得
```bash
# ログイン
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "your@email.com", "password": "your_password"}' \
  | jq '.data.token'
```

### 招待の送信
```bash
TOKEN="your_access_token"
ORG_ID="your_organization_id"

curl -X POST "http://localhost:8080/api/v1/organizations/$ORG_ID/invites" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "role": "member"}'
```

### 招待の再送信
```bash
INVITE_ID="invitation_id"

curl -X POST "http://localhost:8080/api/v1/organizations/$ORG_ID/invites/$INVITE_ID/resend" \
  -H "Authorization: Bearer $TOKEN"
```

## 5. トラブルシューティング

### よくある問題と解決方法

1. **メールが送信されない**
   - 開発環境では実際のメール送信は行われません
   - コンソールログとdev-emailsフォルダを確認

2. **招待URLが無効**
   - FRONTEND_URLが正しく設定されているか確認
   - 招待トークンの有効期限（7日間）を確認

3. **権限エラー**
   - 招待送信は管理者権限が必要
   - JWTトークンが有効か確認

4. **レート制限エラー**
   - 開発環境ではRedisが未設定の場合、メモリベースの制限
   - しばらく待ってから再試行

## 6. 開発時の便利なコマンド

```bash
# ログの監視
tail -f api/logs/combined.log

# データベースの確認
psql $DATABASE_URL -c "SELECT * FROM invitations ORDER BY created_at DESC LIMIT 5;"

# メールファイルの一括削除（テスト後のクリーンアップ）
rm -rf api/dev-emails/*.html
```