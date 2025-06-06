# Task Master AI

## 概要

Task Master AIは、AI駆動の開発を支援する高度なタスク管理システムです。Claude、GPT、Gemini、Perplexityなどの複数のAIプロバイダーと統合し、プロダクト要求仕様書（PRD）から自動的にタスクを生成、管理、実行できます。Cursor AIなどのAI開発環境と連携して、効率的な開発ワークフローを実現します。

## プロジェクトの目的

1. **AI駆動型開発の効率化**: PRDから自動的にタスクを生成し、開発プロセスを構造化
2. **マルチインターフェース対応**: CLI、MCP（Model Control Protocol）、REST API、Web UIの提供
3. **AIプロバイダーの抽象化**: 複数のAIプロバイダーを統一インターフェースで利用可能
4. **開発環境との統合**: Cursor、Windsurf、VS Codeなどのエディタとシームレスに連携
5. **チーム協業のサポート**: データベースバックエンドによる複数プロジェクト・チーム開発対応

## 主要機能

### 1. タスク管理機能
- **PRD解析**: 自然言語のPRDからタスクを自動生成
- **タスク階層化**: メインタスクとサブタスクの構造化
- **依存関係管理**: タスク間の依存関係の定義と検証
- **ステータス管理**: pending, in-progress, completed, cancelled, deferredなどの状態管理
- **タスク拡張**: AI支援によるタスクの詳細化とサブタスク生成

### 2. AI統合機能
- **マルチプロバイダー対応**: 7つのAIプロバイダーをサポート
  - Anthropic (Claude)
  - OpenAI (GPT)
  - Google (Gemini)
  - Perplexity (Research)
  - xAI (Grok)
  - OpenRouter (Multi-provider gateway)
  - Ollama (Local models)
- **ロールベースモデル選択**: main, research, fallbackの3つのロールで使い分け
- **自動フォールバック**: プロバイダー障害時の自動切り替え
- **コスト追跡**: AIコール毎のトークン使用量とコスト計算

### 3. インターフェース
- **CLI**: `task-master`コマンドによる全機能へのアクセス
- **MCP Server**: エディタ統合用のModel Control Protocolサーバー
- **REST API**: プログラマティックアクセス用のHTTP API
- **Web UI**: Next.jsベースのモダンなWeb インターフェース

### 4. 開発支援機能
- **タスク複雑度分析**: AIによるタスクの複雑度評価
- **自動タスクファイル生成**: Markdown形式の詳細タスクドキュメント
- **進捗トラッキング**: 次のタスク提案とブロッカーの可視化
- **研究モード**: より詳細な実装提案のためのリサーチ機能

## 技術スタック

### バックエンド
- **Runtime**: Node.js v14.0.0+
- **言語**: JavaScript (ES Modules)
- **フレームワーク**: 
  - Express.js (REST API)
  - FastMCP (MCP Server)
- **AI SDK**: Vercel AI SDK
- **データベース**: Supabase (PostgreSQL)

### フロントエンド
- **フレームワーク**: Next.js 14
- **UI Library**: React 18
- **スタイリング**: Tailwind CSS
- **コンポーネント**: Shadcn/ui

### 開発ツール
- **テスト**: Jest
- **フォーマッター**: Prettier
- **パッケージ管理**: npm
- **バージョン管理**: Git + GitHub
- **CI/CD**: GitHub Actions

### 主要ライブラリ
- **AI関連**: @ai-sdk/*, @anthropic-ai/sdk, openai
- **CLI**: commander, inquirer, chalk, boxen
- **データ処理**: zod (validation), lru-cache
- **認証**: jsonwebtoken
- **セキュリティ**: helmet, cors

## 開発環境の要件

### 必須要件
1. **Node.js**: v14.0.0以上（推奨: v20.x）
2. **npm**: v6.0.0以上
3. **Git**: バージョン管理用
4. **API キー**: 最低1つのAIプロバイダーのAPIキー
   - Anthropic API Key (Claude)
   - OpenAI API Key
   - Google API Key (Gemini)
   - Perplexity API Key
   - その他対応プロバイダーのキー

### オプション要件
1. **Supabase**: データベースバックエンド利用時
2. **Cursor/VS Code**: MCP統合利用時
3. **Ollama**: ローカルモデル利用時

### 環境変数設定
```bash
# .env ファイル（CLI用）
ANTHROPIC_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
GOOGLE_API_KEY=your_key_here
PERPLEXITY_API_KEY=your_key_here
# ... その他のAPIキー

# Supabase利用時
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
```

### MCP設定（エディタ統合用）
```json
// .cursor/mcp.json または同等の設定ファイル
{
  "mcpServers": {
    "taskmaster-ai": {
      "command": "npx",
      "args": ["-y", "--package=task-master-ai", "task-master-ai"],
      "env": {
        // APIキーを設定
      }
    }
  }
}
```

## プロジェクト構造

```
claude-task-master/
├── .claude/              # Claude Code用ドキュメント
├── api/                  # REST APIサーバー
├── frontend/             # Next.js Webアプリケーション
├── mcp-server/           # MCP サーバー実装
├── scripts/              # CLIツール実装
├── src/                  # 共通コードとAIプロバイダー
├── tests/                # テストスイート
└── docs/                 # ユーザードキュメント
```

## ライセンス

MIT with Commons Clause - 商用利用に制限があります。詳細は[LICENSE](../LICENSE)を参照してください。

## 開発者

- [@eyaltoledano](https://x.com/eyaltoledano)
- [@RalphEcom](https://x.com/RalphEcom)

## コミュニティ

- [GitHub Repository](https://github.com/eyaltoledano/claude-task-master)
- [Discord Server](https://discord.gg/taskmasterai)
- [npm Package](https://www.npmjs.com/package/task-master-ai)