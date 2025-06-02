# 技術要件

## 1. システムアーキテクチャ

### 1.1 全体構成
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │     │   Backend API   │     │   Database      │
│   (Next.js)     │────▶│  (Task Master)  │────▶│   (Supabase)   │
│   on Vercel     │     │   + Extensions  │     │   PostgreSQL    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                        │
         └───────────────────────┴────────────────────────┘
                           Authentication
                          (Supabase Auth)
```

### 1.2 レイヤー構成
- **プレゼンテーション層**: Next.js (App Router)
- **ビジネスロジック層**: Task Master API + 拡張API
- **データアクセス層**: Supabase Client/Prisma
- **データ層**: PostgreSQL (Supabase)

## 2. フロントエンド技術スタック

### 2.1 コア技術
- **Framework**: Next.js 14+
  - App Router使用
  - Server Components
  - Streaming SSR
  
- **言語**: TypeScript 5+
  - Strict mode有効
  - 型安全性の確保

### 2.2 UI/スタイリング
- **UIライブラリ**: 
  - shadcn/ui（Radix UI + Tailwind CSS）
  - ヘッドレスコンポーネント活用
  
- **スタイリング**:
  - Tailwind CSS 3+
  - CSS Modules（必要に応じて）
  - PostCSS

### 2.3 状態管理
- **クライアント状態**:
  - Zustand（グローバル状態）
  - React Hook Form（フォーム）
  - TanStack Query（サーバー状態）

### 2.4 その他のライブラリ
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.x",
    "@tanstack/react-query": "^5.x",
    "react-hook-form": "^7.x",
    "zod": "^3.x",
    "date-fns": "^3.x",
    "recharts": "^2.x",
    "react-markdown": "^9.x",
    "@dnd-kit/sortable": "^8.x"
  }
}
```

## 3. バックエンド技術スタック

### 3.1 既存API（Task Master）
- **現在の機能**:
  - PRD解析
  - タスク生成
  - タスク管理
  - AI統合
  
- **拡張ポイント**:
  - Webhookエンドポイント
  - バッチ処理API
  - リアルタイム通知

### 3.2 新規API開発
- **Framework**: Express.js / Fastify
- **言語**: Node.js 20+ / TypeScript
- **アーキテクチャ**: RESTful + GraphQL（将来）

### 3.3 API Gateway構成
```
┌─────────────────┐
│  API Gateway    │
│   (Vercel)      │
├─────────────────┤
│ /api/tasks/*    │────▶ Task Master API
│ /api/auth/*     │────▶ Supabase Auth
│ /api/projects/* │────▶ Custom API
│ /api/billing/*  │────▶ Stripe API
└─────────────────┘
```

## 4. データベース設計

### 4.1 主要テーブル構成
```sql
-- Organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  prd_content JSONB,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Backlog Items
CREATE TABLE product_backlog_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')),
  story_points INTEGER,
  status TEXT DEFAULT 'new',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id),
  pbi_id UUID REFERENCES product_backlog_items(id),
  sprint_id UUID REFERENCES sprints(id),
  title TEXT NOT NULL,
  description TEXT,
  assignee_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'todo',
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 インデックス戦略
- 主キー以外の頻繁に検索されるカラムにインデックス
- 複合インデックスの活用
- パーシャルインデックスでの最適化

### 4.3 Row Level Security (RLS)
```sql
-- Organization level isolation
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's projects" ON projects
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );
```

## 5. 認証・認可

### 5.1 Supabase Auth設定
- **認証プロバイダー**:
  - Email/Password
  - Google OAuth
  - GitHub OAuth
  
- **セッション管理**:
  - JWTトークン
  - リフレッシュトークン
  - セキュアクッキー

### 5.2 権限管理
```typescript
enum Role {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer'
}

interface Permission {
  resource: string;
  actions: string[];
}

const rolePermissions: Record<Role, Permission[]> = {
  [Role.OWNER]: [{ resource: '*', actions: ['*'] }],
  [Role.ADMIN]: [{ resource: 'project', actions: ['create', 'read', 'update', 'delete'] }],
  [Role.MEMBER]: [{ resource: 'task', actions: ['create', 'read', 'update'] }],
  [Role.VIEWER]: [{ resource: '*', actions: ['read'] }]
};
```

## 6. インテグレーション

### 6.1 外部サービス連携
- **Stripe Integration**:
  ```typescript
  // Webhook handler
  app.post('/api/webhooks/stripe', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionChange(event);
        break;
    }
  });
  ```

- **GitHub Integration**:
  - OAuth App登録
  - Webhook設定
  - GraphQL API活用

### 6.2 リアルタイム機能
- **Supabase Realtime**:
  ```typescript
  const channel = supabase
    .channel('task-updates')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'tasks',
      filter: `project_id=eq.${projectId}`
    }, (payload) => {
      handleTaskUpdate(payload);
    })
    .subscribe();
  ```

## 7. デプロイメント

### 7.1 CI/CD パイプライン
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test
      - run: npm run build
      - uses: vercel/action@v28
```

### 7.2 環境変数管理
```bash
# .env.example
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TASK_MASTER_API_URL=
TASK_MASTER_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

### 7.3 モニタリング
- **アプリケーション監視**:
  - Vercel Analytics
  - Sentry（エラー監視）
  - LogRocket（セッション記録）

- **インフラ監視**:
  - Supabase Dashboard
  - カスタムメトリクス
  - アラート設定

## 8. 開発環境

### 8.1 ローカル開発
```bash
# 開発環境セットアップ
npm install
npm run dev

# Supabaseローカル環境
supabase start
supabase db push
```

### 8.2 開発ツール
- **コード品質**:
  - ESLint
  - Prettier
  - Husky（pre-commit hooks）
  
- **テスト**:
  - Jest（単体テスト）
  - React Testing Library
  - Playwright（E2Eテスト）

### 8.3 開発フロー
1. Feature branch作成
2. ローカル開発・テスト
3. Pull Request作成
4. コードレビュー
5. 自動テスト実行
6. マージ・自動デプロイ