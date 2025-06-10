# 本番デプロイガイド

## 1. 事前準備

### 1.1 必要なサービスのセットアップ

- **Supabase**: データベースと認証
- **メールプロバイダー**: SendGrid、AWS SES、Resendなど
- **ホスティング**: 
  - バックエンド: Railway、Render、AWS、Heroku等
  - フロントエンド: Vercel、Netlify等

### 1.2 環境変数の準備

本番用の環境変数を用意：

```bash
# Production API環境変数
NODE_ENV=production
PORT=8080

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_production_service_key
SUPABASE_ANON_KEY=your_production_anon_key

# JWT
JWT_SECRET=strong_random_secret_min_32_chars

# URLs
FRONTEND_URL=https://your-domain.com
API_URL=https://api.your-domain.com

# Email
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_sendgrid_api_key
EMAIL_FROM=noreply@your-domain.com

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Redis (オプション)
REDIS_URL=redis://your-redis-instance
```

## 2. バックエンドのデプロイ

### 2.1 コードの準備

```bash
# 本番用ブランチの作成
git checkout -b production
git merge main

# 環境変数の確認
cp api/.env.example api/.env.production
# 本番用の値を設定
```

### 2.2 Railwayへのデプロイ例

1. **Railwayプロジェクトの作成**
```bash
# Railway CLIのインストール
npm install -g @railway/cli

# ログイン
railway login

# プロジェクト作成
railway init
```

2. **環境変数の設定**
```bash
railway variables set NODE_ENV=production
railway variables set SUPABASE_URL=your_url
# ... 他の環境変数も同様に設定
```

3. **デプロイ**
```bash
# package.jsonのstart scriptを確認
# "start": "node api/server-db.js"

railway up
```

### 2.3 Renderへのデプロイ例

1. **render.yamlの作成**
```yaml
services:
  - type: web
    name: taskmaster-api
    env: node
    region: oregon
    plan: free
    buildCommand: "npm install"
    startCommand: "node api/server-db.js"
    envVars:
      - key: NODE_ENV
        value: production
      - key: SUPABASE_URL
        sync: false
      # 他の環境変数も追加
```

2. **Renderダッシュボードでデプロイ**

## 3. フロントエンドのデプロイ

### 3.1 Vercelへのデプロイ

1. **環境変数の設定**
```bash
# .env.production
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

2. **Vercel CLIでデプロイ**
```bash
# Vercel CLIのインストール
npm i -g vercel

# フロントエンドディレクトリで実行
cd frontend/task-master-ui
vercel

# 環境変数の設定
vercel env add NEXT_PUBLIC_API_URL
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 3.2 Netlifyへのデプロイ

1. **netlify.tomlの作成**
```toml
[build]
  base = "frontend/task-master-ui"
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[build.environment]
  NEXT_PUBLIC_API_URL = "https://api.your-domain.com"
```

## 4. メールサービスの設定

### 4.1 SendGridの設定

1. **SendGridアカウントの作成とAPIキーの取得**
2. **送信者認証の設定**
3. **email.jsの更新**

```javascript
// api/services/email.js に追加
import sgMail from '@sendgrid/mail';

if (process.env.EMAIL_PROVIDER === 'sendgrid') {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// sendInvitationEmail関数内
if (process.env.NODE_ENV === 'production' && process.env.EMAIL_PROVIDER === 'sendgrid') {
  const msg = {
    to,
    from: process.env.EMAIL_FROM || 'noreply@taskmaster.com',
    subject,
    html: htmlContent,
    text: textContent
  };
  await sgMail.send(msg);
}
```

## 5. デプロイ後の確認

### 5.1 ヘルスチェック

```bash
# APIの動作確認
curl https://api.your-domain.com/api/v1/health

# 認証の確認
curl -X POST https://api.your-domain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password"}'
```

### 5.2 監視の設定

1. **エラー監視**: Sentry、Rollbar等
2. **アップタイム監視**: UptimeRobot、Pingdom等
3. **ログ管理**: LogDNA、Papertrail等

### 5.3 セキュリティチェックリスト

- [ ] HTTPS が有効
- [ ] CORS設定が適切
- [ ] レート制限が有効
- [ ] 環境変数が安全に管理されている
- [ ] SQLインジェクション対策
- [ ] XSS対策
- [ ] JWT秘密鍵が強固

## 6. CI/CDパイプラインの設定

### GitHub Actionsの例

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - name: Deploy to Railway
        run: railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        run: vercel --prod
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

## 7. バックアップとリカバリー

### 7.1 データベースバックアップ

```bash
# Supabaseの自動バックアップを利用
# またはpg_dumpでの定期バックアップ
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### 7.2 ロールバック手順

1. 前バージョンのタグを確認
2. Gitでロールバック
3. 再デプロイ

## 8. トラブルシューティング

### よくある問題

1. **CORSエラー**
   - API側のCORS設定を確認
   - 本番URLがホワイトリストに含まれているか

2. **環境変数が読み込まれない**
   - デプロイプラットフォームの環境変数設定を確認
   - ビルド時と実行時の変数の違いに注意

3. **メールが届かない**
   - メールプロバイダーのログを確認
   - SPF/DKIM設定を確認
   - スパムフォルダを確認

4. **パフォーマンス問題**
   - データベースインデックスを確認
   - N+1クエリの最適化
   - CDNの利用を検討