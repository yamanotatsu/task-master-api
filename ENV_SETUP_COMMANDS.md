# 環境変数設定コマンド

## API の環境変数設定

以下のコマンドを順番に実行し、各コマンドの後に要求される値を入力してください：

```bash
# APIディレクトリに移動
cd /Users/yamanotatsuki/Desktop/taskmaster/claude-task-master/api

# 各環境変数を設定（値を入力するプロンプトが表示されます）
vercel env add ANTHROPIC_API_KEY production
vercel env add OPENAI_API_KEY production
vercel env add SUPABASE_URL production
vercel env add SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_KEY production
vercel env add JWT_SECRET production
vercel env add ENCRYPTION_MASTER_KEY production
vercel env add FRONTEND_URL production
# FRONTEND_URL の値: https://task-master-ui.vercel.app
```

## フロントエンドの環境変数設定

```bash
# フロントエンドディレクトリに移動
cd /Users/yamanotatsuki/Desktop/taskmaster/claude-task-master/frontend/task-master-ui

# 各環境変数を設定
vercel env add NEXT_PUBLIC_API_URL production
# 値: https://api-f83e40tzl-yamanotatsus-projects.vercel.app

vercel env add NEXT_PUBLIC_SUPABASE_URL production
# 値: あなたのSupabase URL

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# 値: あなたのSupabase Anon Key

vercel env add NEXT_PUBLIC_APP_URL production
# 値: https://task-master-ui.vercel.app

# オプション
vercel env add NEXT_PUBLIC_ENABLE_AUTH production
# 値: true

vercel env add NEXT_PUBLIC_ENABLE_ANALYTICS production
# 値: false
```

## 再デプロイ

環境変数設定後、以下のコマンドで再デプロイ：

```bash
# APIの再デプロイ
cd /Users/yamanotatsuki/Desktop/taskmaster/claude-task-master/api
vercel --prod

# フロントエンドの再デプロイ
cd /Users/yamanotatsuki/Desktop/taskmaster/claude-task-master/frontend/task-master-ui
vercel --prod
```