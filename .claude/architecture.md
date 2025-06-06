# システムアーキテクチャ

## 全体構成

Task Master AIは、モジュラーアーキテクチャを採用した分散システムで、複数のインターフェースを通じて統一されたタスク管理機能を提供します。

### システム構成図

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Users / Developers                         │
└─────────────┬────────────┬────────────┬────────────┬───────────────┘
              │            │            │            │
              ▼            ▼            ▼            ▼
        ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
        │   CLI   │  │   MCP   │  │REST API │  │ Web UI  │
        │(task-   │  │ Server  │  │ Server  │  │(Next.js)│
        │ master) │  │(FastMCP)│  │(Express)│  │         │
        └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘
             │            │            │            │
             ▼            ▼            ▼            ▼
        ┌─────────────────────────────────────────────────┐
        │           Core Business Logic Layer             │
        │  ┌────────────┐  ┌────────────┐  ┌──────────┐ │
        │  │Task Manager│  │Dependency  │  │   Init   │ │
        │  │  Module    │  │  Manager   │  │  Module  │ │
        │  └────────────┘  └────────────┘  └──────────┘ │
        └─────────────────────┬───────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────────────┐
        │         AI Services Unified Layer               │
        │  ┌────────────┐  ┌────────────┐  ┌──────────┐ │
        │  │   Model    │  │  Fallback  │  │  Retry   │ │
        │  │ Selection  │  │   Logic    │  │  Logic   │ │
        │  └────────────┘  └────────────┘  └──────────┘ │
        └─────────────────────┬───────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────────────┐
        │          AI Provider Adapters                   │
        │ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ │
        │ │Claude│ │OpenAI│ │Google│ │Perplex│ │ xAI  │ │
        │ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ │
        └─────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────────────┐
        │            Data Persistence Layer               │
        │  ┌────────────┐           ┌──────────────────┐ │
        │  │File System │           │    Supabase      │ │
        │  │(tasks.json)│           │  (PostgreSQL)    │ │
        │  └────────────┘           └──────────────────┘ │
        └─────────────────────────────────────────────────┘
```

## コンポーネント間の関係

### 1. インターフェース層
各インターフェースは独立して動作し、共通のコアロジックを呼び出します：

- **CLI (`scripts/dev.js`)**: Commander.jsベースのコマンドラインインターフェース
- **MCP Server (`mcp-server/`)**: FastMCPを使用したModel Control Protocolサーバー
- **REST API (`api/`)**: Express.jsベースのHTTP API
- **Web UI (`frontend/`)**: Next.js 14ベースのReactアプリケーション

### 2. コアビジネスロジック層
タスク管理の中核機能を提供：

- **Task Manager (`scripts/modules/task-manager.js`)**: タスクCRUD操作
- **Dependency Manager (`scripts/modules/dependency-manager.js`)**: 依存関係管理
- **Config Manager (`scripts/modules/config-manager.js`)**: 設定管理
- **Utils (`scripts/modules/utils.js`)**: 共通ユーティリティ

### 3. AI統合層
AIプロバイダーの抽象化と統一インターフェース：

- **AI Services Unified (`scripts/modules/ai-services-unified.js`)**: 統一AIサービス層
- **Provider Adapters (`src/ai-providers/*.js`)**: 各プロバイダー固有の実装

### 4. データ永続化層
2つのストレージオプション：

- **ファイルシステム**: `tasks.json`と`task_XXX.txt`ファイル
- **Supabase**: PostgreSQLベースのクラウドデータベース

## データフロー

### 1. タスク生成フロー（PRD → Tasks）
```
User Input (PRD)
    │
    ▼
CLI/MCP/API Interface
    │
    ▼
parsePRD() Function
    │
    ▼
AI Services Unified
    ├─→ Model Selection (main role)
    ├─→ Prompt Construction
    └─→ Provider Call
    │
    ▼
Task Generation
    │
    ▼
tasks.json + task_XXX.txt files
```

### 2. タスク実行フロー
```
User Command
    │
    ▼
Interface Layer
    │
    ▼
Task Manager
    ├─→ Read tasks.json
    ├─→ Validate dependencies
    ├─→ Check status
    └─→ Return next task
    │
    ▼
User receives task details
```

### 3. AI呼び出しフロー（フォールバック付き）
```
Function Call (with role)
    │
    ▼
AI Services Unified
    ├─→ Get model for role
    ├─→ Resolve API key
    └─→ Attempt call
        │
        ├─→ Success → Return result
        │
        └─→ Failure → Fallback sequence
            ├─→ Try fallback model
            └─→ Try research model
```

## 設計原則

### 1. 関心の分離（Separation of Concerns）
- インターフェース層とビジネスロジックの分離
- AIプロバイダーの抽象化
- データアクセス層の独立性

### 2. 依存性逆転の原則（Dependency Inversion）
- 上位モジュールは下位モジュールに依存しない
- 抽象に依存し、具象に依存しない
- AIプロバイダーは統一インターフェースを実装

### 3. 単一責任の原則（Single Responsibility）
- 各モジュールは単一の責任を持つ
- 変更の理由は1つだけ

### 4. オープン・クローズドの原則
- 拡張に対して開いている（新しいAIプロバイダーの追加）
- 修正に対して閉じている（既存コードの変更不要）

## 採用しているデザインパターン

### 1. Facade Pattern
**実装箇所**: `ai-services-unified.js`
```javascript
// 複雑なAIプロバイダーAPIを単純化
export async function generateTextService({ role, systemPrompt, prompt, session }) {
  // 内部の複雑性を隠蔽
}
```

### 2. Strategy Pattern
**実装箇所**: AIプロバイダー選択
```javascript
// ロールに基づいて異なるプロバイダー戦略を選択
const provider = getProviderForRole(role);
```

### 3. Factory Pattern
**実装箇所**: Direct Function実装
```javascript
// 標準化されたレスポンスオブジェクトの生成
return { success: true, data: result, fromCache: false };
```

### 4. Singleton Pattern
**実装箇所**: キャッシュ管理
```javascript
// LRUCacheの単一インスタンス
const cache = new LRUCache({ max: 100, ttl: 1000 * 60 * 60 });
```

### 5. Adapter Pattern
**実装箇所**: プロバイダー実装
```javascript
// 各プロバイダーAPIをVercel AI SDKインターフェースに適応
export async function generateAnthropicText(params) {
  // Anthropic固有の実装
}
```

## 命名規則

### 1. ファイル名
- **kebab-case**: `task-manager.js`, `ai-services-unified.js`
- **Direct Functions**: `<function-name>.js` (例: `parse-prd.js`)
- **テストファイル**: `<module-name>.test.js`

### 2. 関数名
- **camelCase**: `parsePRD()`, `expandTask()`, `getNextTask()`
- **Direct Functions**: `<functionName>Direct()` (例: `parsePRDDirect()`)
- **プライベート関数**: `_functionName()` (例: `_unifiedServiceRunner()`)

### 3. 変数名
- **camelCase**: `taskId`, `projectRoot`, `apiKey`
- **定数**: `UPPER_SNAKE_CASE` (例: `PROVIDER_FUNCTIONS`, `MODEL_MAP`)
- **環境変数**: `UPPER_SNAKE_CASE` (例: `ANTHROPIC_API_KEY`)

### 4. クラス・コンストラクタ
- **PascalCase**: `AsyncOperationManager`, `TaskManager` (使用時)

## コーディング規約

### 1. ES Modules
```javascript
// ✅ 正しい
import { parsePRD } from './task-manager.js';
export { generateTextService };

// ❌ 間違い
const parsePRD = require('./task-manager');
module.exports = { generateTextService };
```

### 2. 非同期処理
```javascript
// ✅ async/awaitを使用
async function processTask(taskId) {
  try {
    const result = await fetchTask(taskId);
    return result;
  } catch (error) {
    handleError(error);
  }
}

// ❌ コールバックは避ける
function processTask(taskId, callback) {
  fetchTask(taskId, (err, result) => {
    if (err) callback(err);
    else callback(null, result);
  });
}
```

### 3. エラーハンドリング
```javascript
// ✅ 構造化されたエラーレスポンス
return {
  success: false,
  error: {
    code: 'TASK_NOT_FOUND',
    message: `Task ${taskId} not found`,
    details: { taskId }
  }
};

// ❌ 文字列エラーは避ける
throw 'Task not found';
```

### 4. パラメータ検証
```javascript
// ✅ 早期リターン
function updateTask(taskId, updates) {
  if (!taskId) {
    console.error('Task ID is required');
    process.exit(1);
  }
  
  if (!updates || Object.keys(updates).length === 0) {
    console.error('Updates are required');
    process.exit(1);
  }
  
  // メイン処理
}
```

### 5. Silent Mode実装
```javascript
// ✅ MCP呼び出し時のconsole出力制御
enableSilentMode();
try {
  const result = await coreFunction();
  return { success: true, data: result };
} finally {
  disableSilentMode();
}
```

### 6. ドキュメンテーション
```javascript
/**
 * Parse a PRD and generate tasks
 * @param {string} filePath - Path to PRD file
 * @param {string} outputPath - Output path for tasks.json
 * @param {number} numTasks - Number of tasks to generate
 * @returns {Promise<Object>} Generated tasks
 */
async function parsePRD(filePath, outputPath, numTasks) {
  // Implementation
}
```

## セキュリティ考慮事項

### 1. APIキー管理
- 環境変数でのみ管理
- コードにハードコードしない
- `.env`ファイルはGitに含めない

### 2. 入力検証
- すべてのユーザー入力を検証
- Zodスキーマによる型安全性
- SQLインジェクション対策（Supabase使用時）

### 3. アクセス制御
- CORSの適切な設定
- Helmetによるセキュリティヘッダー
- JWTによる認証（将来実装）