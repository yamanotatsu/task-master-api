# システムアーキテクチャ

## 全体構成

Task Master APIは、マルチインターフェース対応のモジュラーアーキテクチャを採用しています。以下は主要コンポーネントとその関係を示しています。

```
┌─────────────────────────────────────────────────────────────────┐
│                          クライアント層                           │
├─────────────────┬────────────────┬────────────────┬─────────────┤
│    CLI Tool     │   MCP Client   │  REST Client   │  Next.js UI │
│  (task-master)  │ (Cursor/VS Code)│   (Postman)   │ (Frontend)  │
└────────┬────────┴────────┬────────┴────────┬───────┴──────┬──────┘
         │                 │                 │               │
         ▼                 ▼                 ▼               ▼
┌─────────────────┬────────────────┬────────────────┬─────────────┐
│                          インターフェース層                       │
├─────────────────┼────────────────┼────────────────┼─────────────┤
│   CLI Parser    │   MCP Server   │  Express API   │  Next.js    │
│  (commands.js)  │  (mcp-server/) │    (api/)      │   Server    │
└────────┬────────┴────────┬────────┴────────┬───────┴──────┬──────┘
         │                 │                 │               │
         └─────────────────┴─────────────────┴───────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                          ビジネスロジック層                       │
├─────────────────────────────────────────────────────────────────┤
│                        Task Manager Core                         │
│  ┌───────────────┬────────────────┬────────────────────────┐   │
│  │ Task Service  │ Dependency Mgr │  AI Service Manager   │   │
│  └───────────────┴────────────────┴────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         ▼                                                   ▼
┌─────────────────┐                               ┌──────────────────┐
│   データ層      │                               │   AI プロバイダー │
├─────────────────┤                               ├──────────────────┤
│  File Storage   │                               │ • Anthropic      │
│  (JSON Files)   │                               │ • OpenAI         │
│  projects/      │                               │ • Google         │
└─────────────────┘                               │ • Others...      │
                                                  └──────────────────┘
```

## コンポーネント間の関係

### 1. クライアント層
複数のクライアントインターフェースをサポート：
- **CLI Tool**: コマンドライン操作用
- **MCP Client**: エディタ統合（Cursor、VS Code等）
- **REST Client**: 外部アプリケーション統合
- **Next.js UI**: Web ブラウザインターフェース

### 2. インターフェース層
各クライアントに対応したサーバー実装：
- **CLI Parser**: コマンドライン引数の解析と実行
- **MCP Server**: Model Control Protocolの実装
- **Express API**: RESTful APIエンドポイント
- **Next.js Server**: Webアプリケーションのホスティング

### 3. ビジネスロジック層
コア機能の実装：
- **Task Service**: タスクのCRUD操作
- **Dependency Manager**: 依存関係の管理と循環検出
- **AI Service Manager**: 複数のAIプロバイダーの統一管理

### 4. データ層
ファイルベースの永続化：
- プロジェクトごとのディレクトリ構造
- JSONファイルによるタスクデータ保存
- トランザクション非対応（シンプルな読み書き）

## データフロー

### タスク作成フロー
```
1. Client → API Request (PRD or Task Details)
2. API → AI Service (If PRD parsing needed)
3. AI Service → Task Generation
4. Task Manager → Validation
5. Task Manager → File Storage
6. API → Response to Client
```

### タスク更新フロー
```
1. Client → Update Request
2. API → Task Manager
3. Task Manager → Load Current State
4. Task Manager → Apply Updates
5. Task Manager → Validate Dependencies
6. Task Manager → Save to File
7. API → Response to Client
```

### AI処理フロー
```
1. Request → AI Service Manager
2. Service Manager → Provider Selection
3. Provider → API Call
4. Provider → Response Processing
5. Service Manager → Fallback (if needed)
6. Service Manager → Result to Caller
```

## 設計原則

### 1. 関心の分離（Separation of Concerns）
- インターフェース層とビジネスロジックの明確な分離
- 各モジュールは単一の責任を持つ
- 依存関係は上位層から下位層への単方向

### 2. 依存性注入（Dependency Injection）
- コア機能は外部依存を直接参照しない
- 設定やプロバイダーは注入される
- テスタビリティの向上

### 3. エラー処理
- 各層で適切なエラーハンドリング
- ユーザーフレンドリーなエラーメッセージ
- 詳細なロギング機能

### 4. 非同期処理
- すべてのI/O操作は非同期
- Promise/async-awaitパターンの統一使用
- 適切なエラー伝播

## 採用しているデザインパターン

### 1. Repository Pattern
- ファイルストレージの抽象化
- データアクセスロジックの集約
- テスト時のモック化が容易

### 2. Factory Pattern
- AIプロバイダーの動的生成
- 設定に基づくインスタンス作成
- 新しいプロバイダーの追加が容易

### 3. Command Pattern
- CLIコマンドの実装
- 各コマンドは独立したモジュール
- 実行とパラメータの分離

### 4. Adapter Pattern
- 異なるAIプロバイダーの統一インターフェース
- プロバイダー固有の実装を隠蔽
- 切り替えが容易

## 命名規則

### ファイル名
- **kebab-case**: `task-manager.js`, `dependency-validator.js`
- **テストファイル**: `*.test.js`
- **設定ファイル**: `*.config.js`

### 変数・関数名
- **camelCase**: `taskManager`, `validateDependencies`
- **定数**: `TASK_STATUS`, `MAX_RETRIES`
- **プライベート**: `_internalMethod`

### APIエンドポイント
- **RESTful**: `/api/v1/tasks/:id`
- **動詞は使わない**: `/tasks` (not `/getTasks`)
- **複数形**: `/tasks` (not `/task`)

### MCPツール名
- **動詞-名詞形式**: `get-task`, `update-task`
- **ハイフン区切り**: `analyze-complexity`
- **明確で簡潔**: `add-dependency`

## コーディング規約

### JavaScript/TypeScript
```javascript
// モジュールインポート
import { readFile } from 'fs/promises';
import express from 'express';

// 定数定義
const MAX_RETRY_COUNT = 3;
const DEFAULT_TIMEOUT = 5000;

// 関数定義（async/await推奨）
async function createTask(taskData) {
  // 入力検証
  if (!taskData.title) {
    throw new Error('Task title is required');
  }
  
  // ビジネスロジック
  const task = {
    ...taskData,
    id: generateId(),
    createdAt: new Date().toISOString()
  };
  
  // 永続化
  await saveTask(task);
  
  return task;
}

// エラーハンドリング
try {
  const result = await riskyOperation();
} catch (error) {
  logger.error('Operation failed:', error);
  throw new AppError('USER_FRIENDLY_MESSAGE', 500);
}
```

### API レスポンス形式
```javascript
// 成功レスポンス
{
  "success": true,
  "data": {
    "task": { /* task object */ }
  },
  "message": "Task created successfully"
}

// エラーレスポンス
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Task title is required",
    "details": { /* additional info */ }
  }
}
```

### コミットメッセージ
- **feat**: 新機能追加
- **fix**: バグ修正
- **docs**: ドキュメント更新
- **style**: コードスタイル変更
- **refactor**: リファクタリング
- **test**: テスト追加・修正
- **chore**: ビルドプロセスや補助ツールの変更

## セキュリティ考慮事項

### 1. 入力検証
- すべての入力を検証
- SQLインジェクション対策（ファイルベースのため影響小）
- パストラバーサル攻撃の防止

### 2. APIセキュリティ
- Helmet.jsによるセキュリティヘッダー
- CORS設定による適切なアクセス制御
- レート制限の実装（将来）

### 3. 秘密情報管理
- APIキーは環境変数で管理
- 設定ファイルには秘密情報を含めない
- .gitignoreで適切に除外

### 4. エラー情報
- 本番環境では詳細なエラー情報を隠蔽
- ログには必要最小限の情報のみ
- スタックトレースの適切な処理