# 依存関係

## 使用ライブラリ

Task Master APIは、モダンなNode.jsエコシステムのライブラリを活用して構築されています。以下、カテゴリ別に主要な依存関係を詳しく説明します。

### AI・言語モデル関連

#### Vercel AI SDK エコシステム
| パッケージ | バージョン | 用途 |
|-----------|------------|------|
| `ai` | ^4.3.10 | Vercel AI SDKのコアライブラリ。統一されたインターフェースで複数のAIプロバイダーを扱う |
| `@ai-sdk/anthropic` | ^1.2.10 | Claude (Anthropic) モデルのアダプター |
| `@ai-sdk/openai` | ^1.3.20 | OpenAI (GPT-3.5/4) モデルのアダプター |
| `@ai-sdk/google` | ^1.2.13 | Google Gemini モデルのアダプター |
| `@ai-sdk/azure` | ^1.3.17 | Azure OpenAI Service のアダプター |
| `@ai-sdk/mistral` | ^1.2.7 | Mistral AI モデルのアダプター |
| `@ai-sdk/perplexity` | ^1.1.7 | Perplexity AI のアダプター |
| `@ai-sdk/xai` | ^1.2.15 | xAI (Grok) モデルのアダプター |

#### 公式SDK
| パッケージ | バージョン | 用途 |
|-----------|------------|------|
| `@anthropic-ai/sdk` | ^0.39.0 | Anthropic公式SDK。Claudeモデルへの直接アクセス |
| `openai` | ^4.89.0 | OpenAI公式SDK。GPTモデルへの直接アクセス |

#### その他のAIプロバイダー
| パッケージ | バージョン | 用途 |
|-----------|------------|------|
| `@openrouter/ai-sdk-provider` | ^0.4.5 | OpenRouter経由で複数のモデルにアクセス |
| `ollama-ai-provider` | ^1.2.0 | ローカルLLM実行環境Ollamaとの統合 |

### MCP (Model Context Protocol)
| パッケージ | バージョン | 用途 |
|-----------|------------|------|
| `fastmcp` | ^1.20.5 | エディタ統合用のMCPサーバー実装。高速で軽量 |

### Web フレームワーク・API
| パッケージ | バージョン | 用途 |
|-----------|------------|------|
| `express` | ^4.21.2 | Node.js用の軽量Webアプリケーションフレームワーク |
| `cors` | ^2.8.5 | Cross-Origin Resource Sharing (CORS) の設定 |
| `helmet` | ^8.1.0 | セキュリティヘッダーの自動設定。XSS、クリックジャッキング等を防ぐ |

### CLI・ターミナルUI
| パッケージ | バージョン | 用途 |
|-----------|------------|------|
| `commander` | ^11.1.0 | コマンドライン引数の解析とCLIアプリケーション構築 |
| `inquirer` | ^12.5.0 | インタラクティブなコマンドラインプロンプト |
| `chalk` | ^5.4.1 | ターミナル出力の色付けとスタイリング |
| `ora` | ^8.2.0 | エレガントなターミナルスピナー/ローダー |
| `cli-table3` | ^0.6.5 | ターミナルでの表形式データ表示 |
| `boxen` | ^8.0.1 | ターミナルでのボックス描画 |
| `figlet` | ^1.8.0 | ASCIIアートテキスト生成 |
| `gradient-string` | ^3.0.0 | ターミナルでの美しいグラデーション文字列 |

### ユーティリティ
| パッケージ | バージョン | 用途 |
|-----------|------------|------|
| `dotenv` | ^16.3.1 | 環境変数を.envファイルから読み込み |
| `uuid` | ^11.1.0 | ユニバーサルユニーク識別子（UUID）の生成 |
| `jsonwebtoken` | ^9.0.2 | JSON Web Token (JWT) の作成と検証 |
| `fuse.js` | ^7.1.0 | 軽量なファジー検索ライブラリ |
| `lru-cache` | ^10.2.0 | 高性能なLRU（Least Recently Used）キャッシュ実装 |
| `zod` | ^3.23.8 | TypeScriptファーストのスキーマ検証ライブラリ |

### 開発ツール

#### テスト関連
| パッケージ | バージョン | 用途 |
|-----------|------------|------|
| `jest` | ^29.7.0 | JavaScriptテストフレームワーク |
| `@types/jest` | ^29.5.14 | JestのTypeScript型定義 |
| `jest-environment-node` | ^29.7.0 | JestのNode.js実行環境 |
| `supertest` | ^7.1.0 | HTTP APIのテスト用ライブラリ |
| `mock-fs` | ^5.5.0 | ファイルシステムのモック化 |

#### 開発効率化
| パッケージ | バージョン | 用途 |
|-----------|------------|------|
| `tsx` | ^4.16.2 | TypeScriptの高速実行エンジン |
| `prettier` | ^3.5.3 | コードフォーマッター |
| `execa` | ^8.0.1 | 子プロセスの実行ユーティリティ |
| `node-fetch` | ^3.3.2 | Node.js用のFetch API実装 |

#### バージョン管理
| パッケージ | バージョン | 用途 |
|-----------|------------|------|
| `@changesets/cli` | ^2.28.1 | モノレポでのバージョン管理とリリース |
| `@changesets/changelog-github` | ^0.5.1 | GitHub連携のchangelog生成 |

#### React関連（CLIツール用）
| パッケージ | バージョン | 用途 |
|-----------|------------|------|
| `react` | ^18.3.1 | UIライブラリ（Inkと組み合わせて使用） |
| `ink` | ^5.0.1 | React でインタラクティブなCLIアプリを構築 |

### フロントエンド依存関係

#### コアライブラリ
| パッケージ | バージョン | 用途 |
|-----------|------------|------|
| `next` | 15.3.3 | Reactベースのフルスタックフレームワーク |
| `react` | ^19.0.0 | UIライブラリ |
| `react-dom` | ^19.0.0 | ReactのDOM操作 |

#### スタイリング
| パッケージ | バージョン | 用途 |
|-----------|------------|------|
| `tailwindcss` | ^4 | ユーティリティファーストのCSSフレームワーク |
| `@tailwindcss/postcss` | ^4 | TailwindのPostCSSプラグイン |

#### 開発ツール（フロントエンド）
| パッケージ | バージョン | 用途 |
|-----------|------------|------|
| `typescript` | ^5 | 型付きJavaScript |
| `@types/node` | ^20 | Node.jsの型定義 |
| `@types/react` | ^19 | Reactの型定義 |
| `@types/react-dom` | ^19 | React DOMの型定義 |
| `eslint` | ^9 | JavaScriptリンター |
| `eslint-config-next` | 15.3.3 | Next.js用のESLint設定 |
| `@eslint/eslintrc` | ^3 | ESLint設定ユーティリティ |

## バージョン情報

### Node.js要件
- **最小バージョン**: 14.0.0
- **推奨バージョン**: 18.0.0以上
- **パッケージマネージャー**: npm (8.0.0以上) または yarn

### 主要ライブラリのメジャーバージョン
- Express: v4 (安定版)
- React: v19 (最新版)
- Next.js: v15 (最新版)
- Jest: v29 (現行版)
- TypeScript: v5 (最新版)

## 特殊な設定

### AI SDKの設定
```javascript
// AI SDKの統一設定例
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';

// プロバイダーごとのインスタンス作成
const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.ANTHROPIC_BASE_URL // カスタムエンドポイント対応
});

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID
});
```

### Expressセキュリティ設定
```javascript
// Helmetのカスタム設定
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORSの設定
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
```

### Jestテスト設定
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.test.{js,jsx}',
  ],
};
```

### TypeScript設定（フロントエンド）
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

## 依存関係の管理方針

### 1. セキュリティ
- 定期的な脆弱性スキャン（`npm audit`）
- 重要なセキュリティパッチの即時適用
- 依存関係の最小化原則

### 2. バージョン管理
- メジャーバージョンアップは慎重に検討
- マイナー/パッチアップデートは定期的に実施
- lock ファイルによる厳密なバージョン固定

### 3. パフォーマンス
- 本番環境では必要最小限の依存関係のみ
- 開発依存関係は devDependencies に適切に分離
- バンドルサイズの定期的な監視

### 4. 互換性
- Node.js LTS バージョンとの互換性維持
- 主要なクラウドプラットフォームでの動作確認
- エッジケースでの後方互換性の考慮

## トラブルシューティング

### よくある依存関係の問題

1. **ピアデペンデンシーの警告**
   ```bash
   npm install --legacy-peer-deps
   ```

2. **バージョン競合**
   ```bash
   npm dedupe
   npm ls [package-name]
   ```

3. **キャッシュ関連の問題**
   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **プラットフォーム固有の問題**
   - Windowsでのパス長制限
   - M1 Macでのネイティブモジュール
   - Dockerコンテナでの権限問題