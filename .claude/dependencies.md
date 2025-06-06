# 依存関係

Task Master AIの依存関係とその用途について説明します。

## 使用ライブラリ

### AI/LLM関連

#### Vercel AI SDK エコシステム
| パッケージ | バージョン | 用途 |
|-----------|------------|------|
| `ai` | ^4.3.10 | Vercel AI SDKのコアライブラリ。統一されたAIインターフェース |
| `@ai-sdk/anthropic` | ^1.2.10 | Anthropic (Claude)プロバイダーアダプター |
| `@ai-sdk/azure` | ^1.3.17 | Azure OpenAIプロバイダーアダプター |
| `@ai-sdk/google` | ^1.2.13 | Google (Gemini)プロバイダーアダプター |
| `@ai-sdk/mistral` | ^1.2.7 | Mistralプロバイダーアダプター |
| `@ai-sdk/openai` | ^1.3.20 | OpenAI (GPT)プロバイダーアダプター |
| `@ai-sdk/perplexity` | ^1.1.7 | Perplexityプロバイダーアダプター |
| `@ai-sdk/xai` | ^1.2.15 | xAI (Grok)プロバイダーアダプター |

#### その他のAI関連
| パッケージ | バージョン | 用途 |
|-----------|------------|------|
| `@anthropic-ai/sdk` | ^0.39.0 | Anthropic公式SDK（レガシー用途） |
| `@openrouter/ai-sdk-provider` | ^0.4.5 | OpenRouterマルチプロバイダーゲートウェイ |
| `ollama-ai-provider` | ^1.2.0 | Ollamaローカルモデルプロバイダー |
| `openai` | ^4.89.0 | OpenAI公式SDK（Perplexity用） |

### CLI/ターミナル関連

| パッケージ | バージョン | 用途 |
|-----------|------------|------|
| `commander` | ^11.1.0 | コマンドラインインターフェースの構築 |
| `inquirer` | ^12.5.0 | 対話型プロンプトとユーザー入力 |
| `chalk` | ^5.4.1 | ターミナル出力の色付け |
| `boxen` | ^8.0.1 | ターミナルでのボックス表示 |
| `cli-table3` | ^0.6.5 | ターミナルでのテーブル表示 |
| `ora` | ^8.2.0 | ターミナルスピナー/ローディング表示 |
| `figlet` | ^1.8.0 | ASCIIアートロゴ生成 |
| `gradient-string` | ^3.0.0 | グラデーションテキスト表示 |

### サーバー/API関連

| パッケージ | バージョン | 用途 |
|-----------|------------|------|
| `express` | ^4.21.2 | REST APIサーバーフレームワーク |
| `cors` | ^2.8.5 | Cross-Origin Resource Sharing設定 |
| `helmet` | ^8.1.0 | セキュリティヘッダーの設定 |
| `fastmcp` | ^1.20.5 | Model Control Protocolサーバー実装 |

### データベース/ストレージ

| パッケージ | バージョン | 用途 |
|-----------|------------|------|
| `@supabase/supabase-js` | ^2.49.10 | Supabaseクライアント（PostgreSQL） |
| `lru-cache` | ^10.2.0 | インメモリキャッシュ実装 |

### ユーティリティ

| パッケージ | バージョン | 用途 |
|-----------|------------|------|
| `zod` | ^3.23.8 | スキーマ検証とTypeScript型推論 |
| `dotenv` | ^16.5.0 | 環境変数の管理 |
| `uuid` | ^11.1.0 | UUID生成 |
| `jsonwebtoken` | ^9.0.2 | JWT トークン生成/検証 |
| `fuse.js` | ^7.1.0 | ファジー検索実装 |

## 開発依存関係

| パッケージ | バージョン | 用途 |
|-----------|------------|------|
| `jest` | ^29.7.0 | テストフレームワーク |
| `jest-environment-node` | ^29.7.0 | Node.js環境でのJest実行 |
| `@types/jest` | ^29.5.14 | Jest用TypeScript型定義 |
| `supertest` | ^7.1.0 | HTTP APIテストユーティリティ |
| `mock-fs` | ^5.5.0 | ファイルシステムのモック |
| `prettier` | ^3.5.3 | コードフォーマッター |
| `execa` | ^8.0.1 | 子プロセス実行ユーティリティ |
| `tsx` | ^4.16.2 | TypeScript実行環境 |
| `ink` | ^5.0.1 | React for CLI |
| `react` | ^18.3.1 | UIライブラリ（ink用） |
| `node-fetch` | ^3.3.2 | HTTPクライアント |

### リリース管理
| パッケージ | バージョン | 用途 |
|-----------|------------|------|
| `@changesets/cli` | ^2.28.1 | バージョン管理とリリースノート生成 |
| `@changesets/changelog-github` | ^0.5.1 | GitHub用changelog生成 |

## バージョン情報

### パッケージマネージャー
- **npm**: 6.0.0以上が必要

### Node.js
- **最小バージョン**: 14.0.0
- **推奨バージョン**: 20.x

### パッケージ情報
```json
{
  "name": "task-master-ai",
  "version": "0.15.0",
  "type": "module"  // ES Modules使用
}
```

## 特殊な設定

### 1. ES Modules設定
```json
{
  "type": "module"
}
```
- プロジェクト全体でES Modulesを使用
- `import`/`export`構文を使用
- CommonJSモジュールを使用する場合は`.cjs`拡張子が必要

### 2. 実行可能ファイル設定
```json
{
  "bin": {
    "task-master": "bin/task-master.js",
    "task-master-mcp": "mcp-server/server.js",
    "task-master-ai": "mcp-server/server.js"
  }
}
```
- グローバルインストール時に3つのコマンドが利用可能

### 3. npm scripts
主要なスクリプト：
- `test`: Jest実行（ES Modules対応）
- `mcp-server`: MCPサーバー起動
- `api`: REST APIサーバー起動
- `api:dev`: 開発モードでAPIサーバー起動（--watch）
- `format`: Prettierでコードフォーマット

### 4. オーバーライド設定
```json
{
  "overrides": {
    "node-fetch": "^3.3.2",
    "whatwg-url": "^11.0.0"
  }
}
```
セキュリティ脆弱性対応のための依存関係バージョン強制

### 5. ファイル配布設定
```json
{
  "files": [
    "scripts/**",
    "assets/**",
    ".cursor/**",
    "README-task-master.md",
    "index.js",
    "bin/**",
    "mcp-server/**",
    "src/**",
    "api/**"
  ]
}
```
npm パッケージに含めるファイルの指定

## 依存関係の管理方針

### 1. セキュリティ
- 定期的な`npm audit`実行
- 脆弱性のある依存関係の迅速な更新
- 必要に応じてoverridesで脆弱性対応

### 2. バージョニング
- セマンティックバージョニングに従う
- メジャーアップデートは慎重に検討
- 開発依存関係は最新版を積極的に採用

### 3. ライセンス
- 本プロジェクト: MIT with Commons Clause
- 依存関係はMIT、Apache 2.0、ISCなどのオープンソースライセンス
- 商用利用時は各ライブラリのライセンスを確認

### 4. パフォーマンス
- 不要な依存関係の削除
- バンドルサイズの監視（特にフロントエンド）
- 代替ライブラリの検討（より軽量な選択肢がある場合）

## インストール手順

### 開発環境
```bash
# リポジトリのクローン
git clone https://github.com/eyaltoledano/claude-task-master.git
cd claude-task-master

# 依存関係のインストール
npm install

# 開発開始
npm run test:watch  # テストを監視モードで実行
npm run api:dev     # APIサーバーを開発モードで起動
```

### 本番環境
```bash
# グローバルインストール
npm install -g task-master-ai

# またはプロジェクトローカル
npm install task-master-ai
```

## トラブルシューティング

### 1. ES Modules関連エラー
```bash
# エラー例: Cannot use import statement outside a module
# 解決策: package.jsonに"type": "module"があることを確認
```

### 2. 権限エラー（グローバルインストール時）
```bash
# macOS/Linux
sudo npm install -g task-master-ai

# Windows (管理者権限で実行)
npm install -g task-master-ai
```

### 3. peer dependency警告
```bash
# 通常は無視して問題ない
# 必要に応じて --legacy-peer-deps フラグを使用
npm install --legacy-peer-deps
```