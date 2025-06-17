# Vercel デプロイメントガイド

このガイドでは、Task Master プロジェクトを Vercel にデプロイする手順を説明します。

## 📋 前提条件

- Vercel アカウントが作成済み
- Vercel CLI がインストール済み（`npm i -g vercel`）
- Supabase プロジェクトが設定済み
- 環境変数の値が準備済み

## 🚀 推奨デプロイ方法：2つのプロジェクトとして分離

API とフロントエンドを別々の Vercel プロジェクトとしてデプロイする方法です。

### ステップ 1: API のデプロイ

```bash
# API ディレクトリに移動
cd api

# Vercel にデプロイ
vercel

# プロンプトに従って設定
# - Setup and deploy: Y
# - Scope: あなたのアカウントを選択
# - Link to existing project?: N
# - Project name: task-master-api（または任意の名前）
# - In which directory is your code located?: ./
# - Want to override the settings?: N
```

### ステップ 2: API の環境変数設定

```bash
# 環境変数を設定（以下のコマンドを各変数に対して実行）
vercel env add ANTHROPIC_API_KEY production
vercel env add OPENAI_API_KEY production
vercel env add SUPABASE_URL production
vercel env add SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_KEY production
vercel env add JWT_SECRET production
vercel env add ENCRYPTION_MASTER_KEY production
vercel env add FRONTEND_URL production
```

各環境変数の値を入力してください。FRONTEND_URL は後で更新します。

### ステップ 3: フロントエンドのデプロイ

```bash
# フロントエンドディレクトリに移動
cd ../frontend/task-master-ui

# Vercel にデプロイ
vercel

# プロンプトに従って設定
# - Setup and deploy: Y
# - Scope: あなたのアカウントを選択
# - Link to existing project?: N
# - Project name: task-master-ui（または任意の名前）
# - In which directory is your code located?: ./
# - Want to override the settings?: N
```

### ステップ 4: フロントエンドの環境変数設定

```bash
# APIのデプロイURL を確認
# https://task-master-api.vercel.app のような形式

# 環境変数を設定
vercel env add NEXT_PUBLIC_API_URL production
# 値: https://task-master-api.vercel.app

vercel env add NEXT_PUBLIC_SUPABASE_URL production
# 値: あなたのSupabase URL

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# 値: あなたのSupabase Anon Key

vercel env add NEXT_PUBLIC_APP_URL production
# 値: https://task-master-ui.vercel.app（フロントエンドのURL）

# 必要に応じて他の環境変数も設定
vercel env add NEXT_PUBLIC_ENABLE_AUTH production
vercel env add NEXT_PUBLIC_ENABLE_ANALYTICS production
```

### ステップ 5: API の FRONTEND_URL を更新

```bash
# API プロジェクトに戻る
cd ../../api

# FRONTEND_URL を更新
vercel env rm FRONTEND_URL production
vercel env add FRONTEND_URL production
# 値: https://task-master-ui.vercel.app
```

### ステップ 6: 両プロジェクトを再デプロイ

```bash
# API を再デプロイ
vercel --prod

# フロントエンドに移動して再デプロイ
cd ../frontend/task-master-ui
vercel --prod
```

## 🔧 代替方法：単一プロジェクトとしてデプロイ

ルートディレクトリから全体をデプロイする方法：

```bash
# プロジェクトのルートディレクトリで
vercel

# 環境変数を設定（上記と同じ変数をすべて設定）
```

## 📝 重要な注意事項

### 1. CORS 設定

API の `server-db.js` で CORS が正しく設定されていることを確認：

```javascript
const allowedOrigins = process.env.FRONTEND_URL
	? [process.env.FRONTEND_URL]
	: ['http://localhost:3000'];
```

### 2. API エンドポイントの更新

フロントエンドが正しい API URL を使用していることを確認：

- 環境変数 `NEXT_PUBLIC_API_URL` が設定されている
- API 呼び出しがこの環境変数を使用している

### 3. Supabase の設定

- Supabase ダッシュボードで許可された URL に Vercel のドメインを追加
- Authentication > URL Configuration で設定

### 4. 実行時間の制限

- 無料プラン：10秒
- Pro プラン：60秒
- 長時間実行が必要な処理は別途対策が必要

## 🐛 トラブルシューティング

### API が 404 を返す場合

1. `vercel.json` の設定を確認
2. `api/server-db.js` がデフォルトエクスポートを持つことを確認

### CORS エラーが発生する場合

1. API の環境変数 `FRONTEND_URL` が正しく設定されているか確認
2. API を再デプロイ

### 環境変数が反映されない場合

1. `vercel env pull` で最新の環境変数を取得
2. プロジェクトを再デプロイ

### ビルドエラーが発生する場合

1. ローカルで `npm run build` が成功することを確認
2. Node.js のバージョンを確認（package.json で指定可能）

## 🎯 デプロイ後の確認

1. **API の動作確認**

   ```bash
   curl https://your-api-domain.vercel.app/api/health
   ```

2. **フロントエンドの動作確認**

   - ブラウザで https://your-frontend-domain.vercel.app を開く
   - ログイン機能を試す
   - API との通信を確認

3. **ログの確認**
   ```bash
   vercel logs
   ```

## 🔒 セキュリティチェックリスト

- [ ] すべての環境変数が production に設定されている
- [ ] CORS が正しく設定されている
- [ ] Supabase のセキュリティルールが適切
- [ ] API キーが公開されていない
- [ ] HTTPS が有効になっている（Vercel では自動）

## 📈 パフォーマンス最適化

1. **キャッシュの設定**

   - `vercel.json` で静的アセットのキャッシュを設定
   - API レスポンスに適切なキャッシュヘッダーを設定

2. **画像の最適化**

   - Next.js の Image コンポーネントを使用
   - 適切な画像フォーマットを選択

3. **バンドルサイズの削減**
   - 不要な依存関係を削除
   - コード分割を活用

## 🎉 完了！

以上でデプロイは完了です。問題が発生した場合は、Vercel のダッシュボードでログを確認し、上記のトラブルシューティングガイドを参照してください。
