# Task Master

AI駆動開発のためのタスク管理システム。Claude、Cursor AIとシームレスに連携し、Supabaseによる認証とデータ管理を提供。

## ✨ 主な機能

- 🤖 **AI駆動のタスク生成** - PRD（製品要求文書）から自動生成
- 📋 **インテリジェントなタスク分解** - 依存関係管理付き
- 👥 **マルチユーザー対応** - 役割ベースのアクセス制御
- 🔐 **完全認証システム** - Supabase連携
- 🏢 **組織管理** - メンバー管理機能
- 🚀 **リアルタイム同期** - プロジェクト間での同期

## 🚀 セットアップ（5分）

### 前提条件
- Node.js 14+
- AI APIキー（Anthropic/OpenAI/Google等のいずれか1つ以上）
- Supabaseアカウント

### インストール
```bash
git clone <repository-url>
cd task-master
npm install
```

### 環境設定
```bash
# 環境設定ファイルをコピー
cp api/.env.example api/.env.local
cp frontend/task-master-ui/.env.example frontend/task-master-ui/.env.local

# 実際のAPIキーとSupabase認証情報を設定
```

### 開発サーバー起動
```bash
# ターミナル1: APIサーバー起動
npm run dev:api

# ターミナル2: フロントエンド起動（新しいターミナル）
npm run dev:frontend
```

### アクセス
- **フロントエンド**: http://localhost:3000
- **API**: http://localhost:8080

## 🔧 利用可能なスクリプト

### 開発用スクリプト
```bash
npm run dev              # 開発セットアップ手順を表示
npm run dev:api          # APIサーバーのみ起動
npm run dev:frontend     # フロントエンドのみ起動
npm run test             # テスト実行
npm run format           # コード整形
```

### Task Masterコマンド
```bash
# プロジェクト初期化
task-master init

# PRDからタスク生成
task-master parse-prd scripts/prd.txt

# タスク管理
task-master list                    # 全タスク表示
task-master next                    # 次のタスク表示
task-master show 1                  # 特定タスク詳細
task-master set-status --id=1 --status=done  # ステータス更新

# タスク操作
task-master add-task --prompt="新しいタスク"
task-master expand --id=1           # タスク分解
task-master add-dependency --id=2 --depends-on=1  # 依存関係追加
```

## 🔑 環境変数設定

### API設定（api/.env.local）
```bash
# Supabase設定
SUPABASE_URL="your_supabase_url"
SUPABASE_ANON_KEY="your_supabase_anon_key"
SUPABASE_SERVICE_KEY="your_supabase_service_key"

# AI プロバイダー（最低1つ必要）
ANTHROPIC_API_KEY="your_anthropic_key"
OPENAI_API_KEY="your_openai_key"
GOOGLE_API_KEY="your_google_key"
PERPLEXITY_API_KEY="your_perplexity_key"
XAI_API_KEY="your_xai_key"
OPENROUTER_API_KEY="your_openrouter_key"

# ローカル開発設定
API_PORT=8080
FRONTEND_URL="http://localhost:3000"
```

### フロントエンド設定（frontend/task-master-ui/.env.local）
```bash
# API接続
NEXT_PUBLIC_API_URL="http://localhost:8080"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="your_supabase_url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_supabase_anon_key"
```

## 📚 使用方法

### 1. PRD作成
`scripts/prd.txt`にプロジェクト要件を記述。`scripts/example_prd.txt`を参考にしてください。

### 2. タスク生成と管理
```bash
# PRDからタスク生成
task-master parse-prd scripts/prd.txt

# 開発フロー
task-master next                    # 次に作業すべきタスクを確認
task-master show 1                  # タスク詳細確認
task-master set-status --id=1 --status=done  # 完了マーク

# 高度な操作
task-master expand --id=1 --research  # AIでタスク分解
task-master analyze-complexity        # 複雑度分析
task-master update --from=5 --prompt="新しい要件"  # 複数タスク更新
```

### 3. AI モデル設定
```bash
# 利用可能モデル確認
task-master models

# モデル設定
task-master models --set-main="claude-3-5-sonnet-20241022"
task-master models --set-research="gpt-4o"
task-master models --set-fallback="gemini-1.5-pro"

# インタラクティブ設定
task-master models --setup
```

## 🌐 本番環境

**デプロイ済みURL:**
- **フロントエンド**: https://task-master-ui-nine.vercel.app
- **API**: https://api-gamma-henna-77.vercel.app

環境変数はVercelダッシュボードで管理。

## 🤝 貢献

1. リポジトリをフォーク
2. 機能ブランチを作成
3. 変更を実装
4. ローカルでテスト
5. プルリクエスト送信

## 📄 ライセンス

MIT WITH Commons-Clause

---

**❤️ AI駆動開発のために作られました**
