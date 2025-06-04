# API仕様書

## 概要

Task Master APIは、RESTfulな設計原則に基づいて構築されたWebAPIです。すべてのエンドポイントはJSON形式でデータをやり取りし、HTTPステータスコードで操作結果を示します。

### ベース情報
- **ベースURL**: `http://localhost:3000`（環境変数 `API_PORT` で設定可能）
- **コンテントタイプ**: `application/json`
- **文字エンコーディング**: UTF-8
- **リクエストサイズ上限**: 10MB
- **APIバージョン**: v1

### 認証とセキュリティ
- **認証方式**: サーバーサイドでAPIキーを環境変数として設定
- **必要なAPIキー**: 以下のいずれかを設定する必要があります
  - `ANTHROPIC_API_KEY`
  - `OPENAI_API_KEY`
  - `GOOGLE_API_KEY`
  - `PERPLEXITY_API_KEY`
  - `XAI_API_KEY`
  - `OPENROUTER_API_KEY`
- **セキュリティヘッダー**: Helmet.jsによる自動設定
- **CORS**: 有効（すべてのオリジンを許可）

## エンドポイント一覧

### 1. システム管理

#### ヘルスチェック
```http
GET /health
```

**レスポンス例**:
```json
{
  "status": "healthy",
  "timestamp": "2024-03-14T10:30:00.000Z"
}
```

### 2. タスク生成（AI機能）

#### PRDからタスク生成
```http
POST /api/v1/generate-tasks-from-prd
```

**リクエストボディ**:
```json
{
  "prd_content": "製品要求仕様書の内容...",
  "target_task_count": 15,
  "use_research_mode": true
}
```

**パラメータ説明**:
| パラメータ | 型 | 必須 | 説明 | デフォルト |
|-----------|-----|------|------|------------|
| prd_content | string | ✓ | PRDのテキスト内容 | - |
| target_task_count | number | - | 生成するタスク数（1-100） | 10 |
| use_research_mode | boolean | - | 詳細分析モードの使用 | false |

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": 1,
        "title": "ユーザー認証システムの実装",
        "description": "OAuth2.0ベースの認証システムを構築",
        "priority": "high",
        "status": "pending",
        "dependencies": [],
        "details": "詳細な実装方針...",
        "testStrategy": "テスト戦略..."
      }
    ],
    "metadata": {
      "totalTasks": 15,
      "projectOverview": "プロジェクト概要..."
    }
  },
  "telemetryData": {
    "modelUsed": "claude-3-opus-20240229",
    "providerName": "anthropic",
    "totalTokens": 5432,
    "totalCost": 0.163
  }
}
```

### 3. タスク管理

#### タスク一覧取得
```http
GET /api/v1/tasks?filter=pending&format=json
```

**クエリパラメータ**:
| パラメータ | 型 | 説明 | 値 |
|-----------|-----|------|-----|
| filter | string | ステータスフィルター | all, pending, in-progress, completed, blocked |
| format | string | 出力形式 | json |

#### タスク詳細取得
```http
GET /api/v1/tasks/:id
```

**パスパラメータ**:
- `id`: タスクID（数値）

#### タスク作成
```http
POST /api/v1/tasks
```

**リクエストボディ**:
```json
{
  "title": "新しいタスク",
  "description": "タスクの説明",
  "priority": "medium",
  "dependencies": [1, 2],
  "details": "実装の詳細...",
  "testStrategy": "テスト方針..."
}
```

#### タスク更新
```http
PUT /api/v1/tasks/:id
```

**リクエストボディ**: 作成時と同じフィールド（すべてオプション）

#### タスク削除
```http
DELETE /api/v1/tasks/:id
```

#### ステータス更新
```http
PATCH /api/v1/tasks/:id/status
```

**リクエストボディ**:
```json
{
  "status": "in-progress"
}
```

**有効なステータス値**:
- `pending`: 未着手
- `in-progress`: 進行中
- `completed`: 完了
- `blocked`: ブロック中

### 4. タスク分析

#### 次のタスク推奨
```http
GET /api/v1/tasks/next
```

依存関係と優先度に基づいて、次に着手すべきタスクを返します。

#### 複雑度分析（AI機能）
```http
POST /api/v1/tasks/analyze-complexity
```

**リクエストボディ**:
```json
{
  "taskId": 1
}
```

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "complexity": {
      "score": 8,
      "level": "高",
      "factors": [
        "複数システムとの統合が必要",
        "セキュリティ要件が厳しい"
      ],
      "estimatedHours": "40-60時間",
      "recommendations": [
        "経験豊富な開発者をアサイン",
        "詳細な設計レビューを実施"
      ]
    }
  }
}
```

#### 全体複雑度レポート
```http
GET /api/v1/tasks/complexity-report
```

### 5. タスク展開（AI機能）

#### 単一タスク展開
```http
POST /api/v1/tasks/:id/expand
```

**リクエストボディ**:
```json
{
  "numSubtasks": 7,
  "useResearch": true
}
```

**パラメータ説明**:
| パラメータ | 型 | 説明 | デフォルト | 範囲 |
|-----------|-----|------|------------|------|
| numSubtasks | number | 生成するサブタスク数 | 5 | 1-20 |
| useResearch | boolean | 詳細リサーチモード | false | - |

#### 全タスク展開
```http
POST /api/v1/tasks/expand-all
```

リクエストボディは単一タスク展開と同じです。

### 6. サブタスク管理

#### サブタスク追加
```http
POST /api/v1/tasks/:id/subtasks
```

**リクエストボディ**:
```json
{
  "title": "サブタスクのタイトル",
  "description": "詳細説明",
  "assignee": "担当者名"
}
```

#### サブタスク更新
```http
PUT /api/v1/tasks/:id/subtasks/:subtaskId
```

**リクエストボディ**:
```json
{
  "title": "更新後のタイトル",
  "description": "更新後の説明",
  "assignee": "新しい担当者",
  "status": "completed"
}
```

#### サブタスク削除
```http
DELETE /api/v1/tasks/:id/subtasks/:subtaskId
```

#### 全サブタスク削除
```http
DELETE /api/v1/tasks/:id/subtasks
```

### 7. 依存関係管理

#### 依存関係追加
```http
POST /api/v1/tasks/:id/dependencies
```

**リクエストボディ**:
```json
{
  "dependencyId": 3
}
```

#### 依存関係削除
```http
DELETE /api/v1/tasks/:id/dependencies/:depId
```

#### 依存関係検証
```http
POST /api/v1/tasks/validate-dependencies
```

**リクエストボディ**:
```json
{
  "autoFix": true
}
```

#### 依存関係自動修正
```http
POST /api/v1/tasks/fix-dependencies
```

### 8. プロジェクト管理

#### プロジェクト初期化
```http
POST /api/v1/projects/initialize
```

**リクエストボディ**:
```json
{
  "projectName": "my-awesome-project",
  "projectPath": "./projects/my-project",
  "template": "web",
  "aiProvider": "anthropic",
  "includeRooFiles": true
}
```

**パラメータ説明**:
| パラメータ | 型 | 必須 | 説明 | 値 |
|-----------|-----|------|------|-----|
| projectName | string | ✓ | プロジェクト名 | - |
| projectPath | string | - | プロジェクトパス | - |
| template | string | - | テンプレート | basic, web, api, mobile, ml |
| aiProvider | string | - | AIプロバイダー | anthropic, openai, google, perplexity |
| includeRooFiles | boolean | - | Rooファイル生成 | - |

#### タスクファイル生成
```http
POST /api/v1/projects/generate-task-files
```

すべてのタスクのMarkdownファイルを生成します。

## エラーコード

### HTTPステータスコード
- **200**: 成功
- **201**: 作成成功
- **400**: 不正なリクエスト
- **401**: 認証エラー（APIキー未設定）
- **404**: リソースが見つからない
- **413**: リクエストサイズ超過
- **429**: レート制限
- **500**: サーバーエラー

### エラーレスポンス形式
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーの説明",
    "details": {
      "field": "エラーの詳細情報"
    }
  }
}
```

### 主要なエラーコード
| コード | 説明 | HTTPステータス |
|--------|------|----------------|
| INVALID_INPUT | 入力値が不正 | 400 |
| INVALID_TASK_ID | タスクIDが数値でない | 400 |
| TASK_NOT_FOUND | タスクが存在しない | 404 |
| SUBTASK_NOT_FOUND | サブタスクが存在しない | 404 |
| CIRCULAR_DEPENDENCY | 循環依存が発生 | 400 |
| DEPENDENCY_EXISTS | 依存関係が既に存在 | 400 |
| MISSING_API_KEY | APIキーが未設定 | 401 |
| PRD_PARSE_ERROR | PRD解析エラー | 400 |
| RATE_LIMIT_EXCEEDED | レート制限超過 | 429 |
| PAYLOAD_TOO_LARGE | リクエストサイズ超過 | 413 |
| ENDPOINT_NOT_FOUND | エンドポイントが存在しない | 404 |
| INTERNAL_SERVER_ERROR | サーバー内部エラー | 500 |

## レスポンス形式

### 成功レスポンス
```json
{
  "success": true,
  "data": {
    // エンドポイント固有のレスポンスデータ
  },
  "message": "操作が成功しました（オプション）"
}
```

### テレメトリデータ
AI機能を使用するエンドポイントでは、以下のテレメトリデータが含まれます：

```json
{
  "telemetryData": {
    "timestamp": "2024-03-14T10:30:00.000Z",
    "userId": "api-user",
    "commandName": "generate_tasks_from_prd",
    "modelUsed": "claude-3-opus-20240229",
    "providerName": "anthropic",
    "inputTokens": 1234,
    "outputTokens": 2345,
    "totalTokens": 3579,
    "totalCost": 0.107,
    "currency": "USD",
    "processingTime": 2345
  }
}
```

## 使用例

### cURLでのタスク作成
```bash
curl -X POST http://localhost:3000/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "ユーザー認証の実装",
    "description": "JWTベースの認証システムを構築",
    "priority": "high"
  }'
```

### JavaScriptでのタスク取得
```javascript
const response = await fetch('http://localhost:3000/api/v1/tasks/1');
const data = await response.json();

if (data.success) {
  console.log('Task:', data.data.task);
} else {
  console.error('Error:', data.error.message);
}
```

### Pythonでの複雑度分析
```python
import requests

response = requests.post(
    'http://localhost:3000/api/v1/tasks/analyze-complexity',
    json={'taskId': 1}
)

result = response.json()
if result['success']:
    complexity = result['data']['complexity']
    print(f"複雑度スコア: {complexity['score']}")
    print(f"推定時間: {complexity['estimatedHours']}")
```

## ベストプラクティス

1. **エラーハンドリング**: 常に`success`フィールドをチェックしてエラーを適切に処理
2. **ページネーション**: 大量のタスクがある場合は、フィルターを使用して必要なデータのみ取得
3. **依存関係**: タスク作成時に依存関係を設定し、循環依存を避ける
4. **AI機能の使用**: レート制限に注意し、必要に応じてリトライロジックを実装
5. **ステータス管理**: タスクの進捗に応じて適切にステータスを更新

## 制限事項

- リクエストサイズ: 最大10MB
- 同時リクエスト数: 制限なし（サーバーリソースに依存）
- AIプロバイダーのレート制限: 各プロバイダーの制限に準拠
- タスク数: システムリソースに依存（推奨: 1プロジェクトあたり1000タスク以下）