# API仕様書

Task Master AIは2つのREST APIサーバー実装を提供しています：

1. **ファイルベースAPI** - ローカルファイルシステムを使用（ポート3000）
2. **データベースベースAPI** - Supabaseを使用（ポート8080）

## 共通仕様

### ベースURL
- ファイルベース: `http://localhost:3000`
- データベースベース: `http://localhost:8080`

### レスポンス形式
すべてのAPIは以下の統一形式でレスポンスを返します：

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
```

### 認証
現在のバージョンでは認証は実装されていません。将来的にJWT認証を追加予定です。

### エラーコード
| コード | 説明 | HTTPステータス |
|--------|------|----------------|
| `VALIDATION_ERROR` | 入力検証エラー | 400 |
| `NOT_FOUND` | リソースが見つからない | 404 |
| `TASK_NOT_FOUND` | タスクが見つからない | 404 |
| `SUBTASK_NOT_FOUND` | サブタスクが見つからない | 404 |
| `DEPENDENCY_NOT_FOUND` | 依存関係が見つからない | 404 |
| `INVALID_STATUS` | 無効なステータス値 | 400 |
| `AI_SERVICE_ERROR` | AI サービスエラー | 500 |
| `FILE_NOT_FOUND` | ファイルが見つからない | 404 |
| `INTERNAL_ERROR` | 内部サーバーエラー | 500 |

## ファイルベースAPI エンドポイント

### タスク生成

#### PRDからタスク生成
```
POST /api/v1/generate-tasks-from-prd
```

**リクエスト:**
```json
{
  "prd_content": "プロダクト要求仕様書の内容...",
  "target_task_count": 20,  // オプション（デフォルト: AI判断）
  "use_research_mode": true // オプション（デフォルト: false）
}
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": 1,
        "title": "Initialize Repository",
        "description": "Set up the project repository...",
        "status": "pending",
        "priority": "high",
        "dependencies": [],
        "details": "Detailed implementation steps...",
        "testStrategy": "Testing approach..."
      }
    ],
    "metadata": {
      "total_tasks": 20,
      "ai_model_used": "claude-3-sonnet-20240229"
    }
  }
}
```

### タスク管理

#### タスク一覧取得
```
GET /api/v1/tasks?filter=pending&format=json
```

**クエリパラメータ:**
- `filter`: `pending`, `done`, `in-progress`, `all`（デフォルト: `all`）
- `format`: `json`, `markdown`（デフォルト: `json`）

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "tasks": [...],
    "summary": {
      "total": 20,
      "pending": 15,
      "in_progress": 3,
      "done": 2
    }
  }
}
```

#### タスク詳細取得
```
GET /api/v1/tasks/:id
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Initialize Repository",
    "description": "Set up the project repository",
    "status": "pending",
    "priority": "high",
    "dependencies": [],
    "details": "1. Create new Git repository\n2. Add .gitignore\n3. Initial commit",
    "testStrategy": "Verify repository structure and initial files",
    "subtasks": [
      {
        "id": 1,
        "title": "Create .gitignore",
        "description": "Add appropriate ignore patterns",
        "status": "pending"
      }
    ]
  }
}
```

#### タスク作成
```
POST /api/v1/tasks
```

**リクエスト（手動作成）:**
```json
{
  "title": "Implement User Authentication",
  "description": "Add JWT-based authentication",
  "priority": "high",
  "dependencies": [1, 2],
  "details": "Implementation details...",
  "testStrategy": "Unit tests for auth module"
}
```

**リクエスト（AI生成）:**
```json
{
  "prompt": "Add user authentication with JWT tokens and refresh token support",
  "dependencies": [1, 2],
  "priority": "high",
  "research": true
}
```

#### タスク更新
```
PUT /api/v1/tasks/:id
```

**リクエスト:**
```json
{
  "title": "Updated Task Title",
  "description": "Updated description",
  "priority": "medium",
  "details": "Updated implementation details"
}
```

#### タスクステータス更新
```
PATCH /api/v1/tasks/:id/status
```

**リクエスト:**
```json
{
  "status": "in-progress"
}
```

**有効なステータス値:**
- `pending` - 未着手
- `in-progress` - 進行中
- `done` - 完了
- `review` - レビュー中
- `deferred` - 延期
- `cancelled` - キャンセル

#### タスク削除
```
DELETE /api/v1/tasks/:id
```

### タスク分析

#### 次のタスク取得
```
GET /api/v1/tasks/next
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "task": {
      "id": 3,
      "title": "Implement Database Schema",
      "blockedBy": [],
      "readyToStart": true
    },
    "reason": "All dependencies completed"
  }
}
```

#### タスク複雑度分析
```
POST /api/v1/tasks/analyze-complexity
```

**リクエスト:**
```json
{
  "taskId": 5
}
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "taskId": 5,
    "complexity": 8,
    "factors": {
      "technical_complexity": "high",
      "dependencies": "medium",
      "scope": "large"
    },
    "recommendation": "Break down into 5-7 subtasks"
  }
}
```

### タスク展開

#### 単一タスク展開
```
POST /api/v1/tasks/:id/expand
```

**リクエスト:**
```json
{
  "numSubtasks": 5,      // オプション（デフォルト: AI判断）
  "useResearch": true    // オプション（デフォルト: false）
}
```

#### 全タスク展開
```
POST /api/v1/tasks/expand-all
```

**リクエスト:**
```json
{
  "numSubtasks": 5,
  "useResearch": false
}
```

### サブタスク管理

#### サブタスク追加
```
POST /api/v1/tasks/:id/subtasks
```

**リクエスト:**
```json
{
  "title": "Configure environment variables",
  "description": "Set up .env file with required variables",
  "assignee": "john@example.com"  // オプション
}
```

#### サブタスク更新
```
PUT /api/v1/tasks/:id/subtasks/:subtaskId
```

**リクエスト:**
```json
{
  "title": "Updated subtask title",
  "status": "done",
  "assignee": "jane@example.com"
}
```

#### サブタスク削除
```
DELETE /api/v1/tasks/:id/subtasks/:subtaskId
```

#### 全サブタスククリア
```
DELETE /api/v1/tasks/:id/subtasks
```

### 依存関係管理

#### 依存関係追加
```
POST /api/v1/tasks/:id/dependencies
```

**リクエスト:**
```json
{
  "dependencyId": 3
}
```

#### 依存関係削除
```
DELETE /api/v1/tasks/:id/dependencies/:depId
```

#### 依存関係検証
```
POST /api/v1/tasks/validate-dependencies
```

**リクエスト:**
```json
{
  "autoFix": true  // オプション（デフォルト: false）
}
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "valid": false,
    "issues": [
      {
        "type": "circular_dependency",
        "tasks": [3, 5, 7, 3],
        "message": "Circular dependency detected"
      },
      {
        "type": "missing_dependency",
        "task": 10,
        "missingDependency": 99,
        "message": "Task 10 depends on non-existent task 99"
      }
    ],
    "fixed": true
  }
}
```

### プロジェクト管理

#### プロジェクト初期化
```
POST /api/v1/projects/initialize
```

**リクエスト:**
```json
{
  "projectName": "my-awesome-project",
  "projectPath": "/path/to/project",  // オプション
  "template": "default",              // オプション
  "aiProvider": "anthropic",          // オプション
  "includeRooFiles": true            // オプション
}
```

#### タスクファイル生成
```
POST /api/v1/projects/generate-task-files
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "filesGenerated": 20,
    "outputDirectory": "/path/to/project/tasks"
  }
}
```

## データベースベースAPI 追加エンドポイント

データベースベースAPIはファイルベースAPIのすべての機能に加えて、以下の追加機能を提供します：

### プロジェクト管理（拡張）

#### プロジェクト一覧
```
GET /api/v1/projects
```

#### プロジェクト作成
```
POST /api/v1/projects
```

**リクエスト:**
```json
{
  "name": "E-commerce Platform",
  "projectPath": "/projects/ecommerce",
  "prdContent": "PRD content...",
  "deadline": "2024-12-31"
}
```

### AIダイアログ（PRD生成）

#### AI対話セッション
```
POST /api/v1/projects/ai-dialogue
```

**リクエスト:**
```json
{
  "sessionId": "session-123",
  "message": "I want to build an e-commerce platform",
  "mode": "clarification"  // or "finalization"
}
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "response": "I understand you want to build an e-commerce platform. Let me ask some clarifying questions...",
    "sessionId": "session-123",
    "questionsAnswered": 3,
    "readyToFinalize": false
  }
}
```

### メンバー管理

#### メンバー一覧
```
GET /api/v1/members
```

#### メンバー作成
```
POST /api/v1/members
```

**リクエスト:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "role": "developer"
}
```

### 統計・分析

#### プロジェクト統計
```
GET /api/v1/projects/:id/statistics
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "totalTasks": 50,
    "completedTasks": 20,
    "inProgressTasks": 10,
    "pendingTasks": 20,
    "completionRate": 40,
    "averageTaskCompletionTime": "2.5 days",
    "tasksByPriority": {
      "high": 15,
      "medium": 25,
      "low": 10
    }
  }
}
```

#### ガントチャートデータ
```
GET /api/v1/projects/:id/gantt-data
```

#### 依存関係グラフ
```
GET /api/v1/projects/:id/dependency-graph
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "nodes": [
      { "id": "1", "label": "Initialize Repo", "status": "done" },
      { "id": "2", "label": "Setup Database", "status": "in-progress" }
    ],
    "edges": [
      { "from": "1", "to": "2" }
    ]
  }
}
```

### バッチ操作

#### タスク一括更新
```
POST /api/v1/tasks/batch-update
```

**リクエスト:**
```json
{
  "taskIds": [1, 2, 3, 4],
  "update": {
    "status": "in-progress",
    "assignee": "team@example.com",
    "priority": "high"
  }
}
```

## 使用例

### cURLでの例

#### タスク作成
```bash
curl -X POST http://localhost:3000/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create user authentication system with JWT",
    "priority": "high",
    "research": true
  }'
```

#### タスク一覧取得
```bash
curl http://localhost:3000/api/v1/tasks?filter=pending
```

### JavaScriptでの例

```javascript
// タスク作成
const response = await fetch('http://localhost:3000/api/v1/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Create user authentication system with JWT',
    priority: 'high',
    research: true
  })
});

const result = await response.json();
if (result.success) {
  console.log('Task created:', result.data);
} else {
  console.error('Error:', result.error);
}
```

### エラーハンドリング例

```javascript
try {
  const response = await fetch('http://localhost:3000/api/v1/tasks/999');
  const result = await response.json();
  
  if (!result.success) {
    switch (result.error.code) {
      case 'TASK_NOT_FOUND':
        console.log('Task does not exist');
        break;
      case 'VALIDATION_ERROR':
        console.log('Invalid input:', result.error.details);
        break;
      default:
        console.error('Unexpected error:', result.error.message);
    }
  }
} catch (error) {
  console.error('Network error:', error);
}
```

## 開発のヒント

1. **APIバージョニング**: すべてのエンドポイントは `/api/v1/` で始まります
2. **冪等性**: GET, PUT, DELETEは冪等です
3. **ペイロード検証**: ZodスキーマによりすべてのPOST/PUTリクエストが検証されます
4. **エラー処理**: 常に`success`フィールドをチェックしてください
5. **非同期操作**: AI関連の操作は時間がかかる可能性があります（最大60秒）