# API統合計画

## 1. 既存Task Master API活用計画

### 1.1 現在利用可能なAPI

#### コア機能API
| エンドポイント | メソッド | 機能 | TaskMaster Proでの活用 |
|-------------|---------|------|---------------------|
| `/api/parse-prd` | POST | PRD解析・構造化 | PRD作成機能のコア |
| `/api/generate-tasks` | POST | タスク自動生成 | バックログアイテム生成 |
| `/api/tasks` | GET/POST | タスク一覧・作成 | タスク管理基盤 |
| `/api/tasks/:id` | GET/PUT/DELETE | タスク詳細操作 | タスク編集・削除 |
| `/api/tasks/:id/subtasks` | GET/POST | サブタスク管理 | タスク分解機能 |
| `/api/dependencies` | GET/POST | 依存関係管理 | 依存関係グラフ |
| `/api/analysis` | POST | タスク分析 | 複雑度分析・最適化提案 |

#### プロジェクト管理API
| エンドポイント | メソッド | 機能 | TaskMaster Proでの活用 |
|-------------|---------|------|---------------------|
| `/api/projects` | GET/POST | プロジェクト管理 | ワークスペース機能 |
| `/api/projects/:id` | GET/PUT/DELETE | プロジェクト詳細 | プロジェクト設定 |

### 1.2 API活用戦略

#### フェーズ1: 直接活用（MVP）
```typescript
// PRD作成フローでの活用例
const createPRD = async (projectId: string, content: string) => {
  // 1. Task Master APIでPRD解析
  const parsedPRD = await taskMasterAPI.post('/api/parse-prd', {
    content,
    format: 'structured'
  });
  
  // 2. Supabaseに保存
  const { data: project } = await supabase
    .from('projects')
    .update({ prd_content: parsedPRD.data })
    .eq('id', projectId);
  
  // 3. タスク自動生成
  const tasks = await taskMasterAPI.post('/api/generate-tasks', {
    prd: parsedPRD.data,
    options: {
      includeSubtasks: true,
      estimateEffort: true
    }
  });
  
  return { prd: parsedPRD.data, tasks: tasks.data };
};
```

#### フェーズ2: 拡張・最適化
```typescript
// バッチ処理による効率化
const batchProcessTasks = async (taskIds: string[]) => {
  const results = await Promise.all(
    taskIds.map(id => 
      taskMasterAPI.get(`/api/tasks/${id}?include=subtasks,dependencies`)
    )
  );
  
  // キャッシュに保存
  await redis.setex(
    `tasks:batch:${Date.now()}`,
    3600,
    JSON.stringify(results)
  );
  
  return results;
};
```

## 2. 新規開発が必要なAPI

### 2.1 最小限の新規API（MVP向け）

#### ユーザー・組織管理API
```typescript
// POST /api/organizations
interface CreateOrganizationRequest {
  name: string;
  plan: 'free' | 'pro' | 'enterprise';
}

// POST /api/organizations/:id/members
interface InviteMemberRequest {
  email: string;
  role: 'admin' | 'member' | 'viewer';
}
```

#### スプリント管理API
```typescript
// POST /api/projects/:projectId/sprints
interface CreateSprintRequest {
  name: string;
  startDate: string;
  endDate: string;
  goal: string;
}

// POST /api/sprints/:id/tasks
interface AddTaskToSprintRequest {
  taskId: string;
  estimatedHours: number;
}
```

#### 通知・活動API
```typescript
// GET /api/notifications
interface NotificationResponse {
  id: string;
  type: 'task_assigned' | 'comment_added' | 'status_changed';
  data: any;
  read: boolean;
  createdAt: string;
}

// POST /api/activities
interface LogActivityRequest {
  entityType: 'task' | 'project' | 'sprint';
  entityId: string;
  action: string;
  metadata?: any;
}
```

### 2.2 段階的追加API

#### フェーズ2: コラボレーション強化
- コメント・ディスカッションAPI
- リアルタイム同期API
- ファイル添付API

#### フェーズ3: 高度な分析
- ダッシュボードAPI
- レポート生成API
- 予測分析API

## 3. API Gateway設計

### 3.1 ルーティング戦略
```typescript
// app/api/[...proxy]/route.ts
export async function handler(req: NextRequest) {
  const path = req.nextUrl.pathname;
  
  // Task Master APIへのプロキシ
  if (path.startsWith('/api/tasks') || 
      path.startsWith('/api/generate') ||
      path.startsWith('/api/analysis')) {
    return proxyToTaskMaster(req);
  }
  
  // Supabase直接アクセス
  if (path.startsWith('/api/auth')) {
    return handleSupabaseAuth(req);
  }
  
  // カスタムAPI
  return handleCustomAPI(req);
}
```

### 3.2 認証・認可の統合
```typescript
// middleware.ts
export async function middleware(req: NextRequest) {
  const token = req.headers.get('authorization');
  
  // Supabase JWTの検証
  const { data: user, error } = await supabase.auth.getUser(token);
  
  if (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Task Master APIへのトークン追加
  if (req.nextUrl.pathname.startsWith('/api/tasks')) {
    req.headers.set('X-TaskMaster-User-Id', user.id);
    req.headers.set('X-TaskMaster-Org-Id', user.user_metadata.organizationId);
  }
  
  return NextResponse.next();
}
```

## 4. データ同期戦略

### 4.1 双方向同期
```typescript
// Task Master -> Supabase
const syncTasksToSupabase = async () => {
  const tasks = await taskMasterAPI.get('/api/tasks');
  
  const { error } = await supabase
    .from('tasks')
    .upsert(tasks.data.map(task => ({
      id: task.id,
      title: task.title,
      status: task.status,
      task_master_data: task,
      synced_at: new Date()
    })));
};

// Supabase -> Task Master
const syncTasksToTaskMaster = async () => {
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .gt('updated_at', lastSyncTime);
  
  for (const task of tasks) {
    await taskMasterAPI.put(`/api/tasks/${task.id}`, {
      title: task.title,
      status: task.status,
      metadata: task.metadata
    });
  }
};
```

### 4.2 イベント駆動同期
```typescript
// Supabase Webhook
export async function POST(req: Request) {
  const payload = await req.json();
  
  if (payload.table === 'tasks' && payload.type === 'UPDATE') {
    // Task Master APIに変更を通知
    await taskMasterAPI.post('/api/webhooks/task-updated', {
      taskId: payload.record.id,
      changes: payload.changes
    });
  }
  
  return Response.json({ success: true });
}
```

## 5. パフォーマンス最適化

### 5.1 キャッシング戦略
```typescript
// Redis/Vercel KVを使用
const getCachedTasks = async (projectId: string) => {
  const cacheKey = `tasks:project:${projectId}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const tasks = await taskMasterAPI.get(`/api/tasks?projectId=${projectId}`);
  await redis.setex(cacheKey, 300, JSON.stringify(tasks.data));
  
  return tasks.data;
};
```

### 5.2 バッチ処理
```typescript
// 複数タスクの一括更新
const batchUpdateTasks = async (updates: TaskUpdate[]) => {
  // グループ化して効率的に処理
  const grouped = updates.reduce((acc, update) => {
    const key = update.field;
    if (!acc[key]) acc[key] = [];
    acc[key].push(update);
    return acc;
  }, {});
  
  const results = await Promise.all(
    Object.entries(grouped).map(([field, items]) =>
      taskMasterAPI.post('/api/tasks/batch-update', {
        field,
        updates: items
      })
    )
  );
  
  return results;
};
```

## 6. エラーハンドリング

### 6.1 統一エラー処理
```typescript
class APIError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
  }
}

const handleAPIError = async (error: any) => {
  if (error.response?.status === 429) {
    // レート制限対応
    await delay(error.response.headers['retry-after'] * 1000);
    return retry();
  }
  
  if (error.response?.status >= 500) {
    // Task Master API障害時はフォールバック
    return getFromCache();
  }
  
  throw new APIError(
    error.response?.status || 500,
    error.code || 'UNKNOWN_ERROR',
    error.message
  );
};
```

### 6.2 リトライ戦略
```typescript
const retryableRequest = async (fn: Function, options = {}) => {
  const { maxRetries = 3, backoff = 1000 } = options;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      await new Promise(resolve => 
        setTimeout(resolve, backoff * Math.pow(2, i))
      );
    }
  }
};
```

## 7. 移行計画

### 7.1 段階的移行
1. **Phase 1 (MVP)**: Task Master API直接利用
2. **Phase 2**: キャッシング層追加
3. **Phase 3**: 独自API追加
4. **Phase 4**: マイクロサービス化検討

### 7.2 後方互換性
- APIバージョニング維持
- 段階的な非推奨化
- 移行ガイドの提供