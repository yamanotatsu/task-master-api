# データベース設計

Task Master AIのデータベースは、Supabase（PostgreSQL）を使用して実装されています。マルチプロジェクト、チーム協業、AIダイアログ履歴管理をサポートします。

## テーブル構造

### projects テーブル
プロジェクトの基本情報を管理します。

| カラム名 | データ型 | 制約 | 説明 |
|----------|----------|------|------|
| id | UUID | PRIMARY KEY | プロジェクトの一意識別子 |
| name | VARCHAR(255) | NOT NULL | プロジェクト名 |
| project_path | TEXT | NOT NULL | プロジェクトのファイルパス |
| description | TEXT | | プロジェクトの説明 |
| prd_content | TEXT | | PRD（プロダクト要求仕様書）の内容 |
| deadline | TIMESTAMP WITH TIME ZONE | | プロジェクトの期限 |
| status | VARCHAR(50) | DEFAULT 'active' | プロジェクトのステータス |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | 更新日時 |

### members テーブル
チームメンバーの情報を管理します。

| カラム名 | データ型 | 制約 | 説明 |
|----------|----------|------|------|
| id | UUID | PRIMARY KEY | メンバーの一意識別子 |
| name | VARCHAR(255) | NOT NULL | メンバー名 |
| email | VARCHAR(255) | UNIQUE NOT NULL | メールアドレス |
| avatar_url | TEXT | | アバター画像のURL |
| role | VARCHAR(50) | NOT NULL, CHECK | ロール（admin, developer, viewer） |
| status | VARCHAR(50) | DEFAULT 'active', CHECK | ステータス（active, inactive） |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | 更新日時 |

### project_members テーブル
プロジェクトとメンバーの関連を管理する中間テーブルです。

| カラム名 | データ型 | 制約 | 説明 |
|----------|----------|------|------|
| project_id | UUID | FK → projects(id) | プロジェクトID |
| member_id | UUID | FK → members(id) | メンバーID |
| assigned_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | アサイン日時 |

**複合主キー**: (project_id, member_id)

### tasks テーブル
タスクの詳細情報を管理します。

| カラム名 | データ型 | 制約 | 説明 |
|----------|----------|------|------|
| id | SERIAL | PRIMARY KEY | タスクの一意識別子 |
| project_id | UUID | FK → projects(id) | 所属プロジェクトID |
| title | VARCHAR(500) | NOT NULL | タスクタイトル |
| description | TEXT | | タスクの説明 |
| details | TEXT | | 実装の詳細 |
| test_strategy | TEXT | | テスト戦略 |
| priority | VARCHAR(50) | DEFAULT 'medium', CHECK | 優先度（high, medium, low） |
| status | VARCHAR(50) | DEFAULT 'pending', CHECK | ステータス（下記参照） |
| assignee_id | UUID | FK → members(id) | 担当者ID |
| deadline | TIMESTAMP WITH TIME ZONE | | タスクの期限 |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | 更新日時 |

**ステータス値**:
- `pending` - 未着手
- `in-progress` - 進行中
- `completed` / `done` - 完了
- `blocked` - ブロック中
- `review` - レビュー中
- `deferred` - 延期
- `cancelled` - キャンセル
- `not-started` - 未開始

### task_dependencies テーブル
タスク間の依存関係を管理します。

| カラム名 | データ型 | 制約 | 説明 |
|----------|----------|------|------|
| task_id | INTEGER | FK → tasks(id) | タスクID |
| depends_on_task_id | INTEGER | FK → tasks(id) | 依存先タスクID |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | 作成日時 |

**複合主キー**: (task_id, depends_on_task_id)

### subtasks テーブル
サブタスクの情報を管理します。

| カラム名 | データ型 | 制約 | 説明 |
|----------|----------|------|------|
| id | SERIAL | PRIMARY KEY | サブタスクの一意識別子 |
| task_id | INTEGER | FK → tasks(id) | 親タスクID |
| title | VARCHAR(500) | NOT NULL | サブタスクタイトル |
| description | TEXT | | サブタスクの説明 |
| status | VARCHAR(50) | DEFAULT 'pending', CHECK | ステータス（pending, completed） |
| assignee_id | UUID | FK → members(id) | 担当者ID |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | 更新日時 |

### ai_dialogue_sessions テーブル
AIとの対話セッションを管理します。

| カラム名 | データ型 | 制約 | 説明 |
|----------|----------|------|------|
| id | UUID | PRIMARY KEY | セッションの一意識別子 |
| project_id | UUID | FK → projects(id) | プロジェクトID |
| session_data | JSONB | | セッションデータ（JSON形式） |
| prd_quality_score | INTEGER | | PRD品質スコア |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | 更新日時 |

### ai_dialogue_messages テーブル
AIダイアログのメッセージ履歴を管理します。

| カラム名 | データ型 | 制約 | 説明 |
|----------|----------|------|------|
| id | UUID | PRIMARY KEY | メッセージの一意識別子 |
| session_id | UUID | FK → ai_dialogue_sessions(id) | セッションID |
| role | VARCHAR(50) | CHECK | ロール（user, ai） |
| content | TEXT | NOT NULL | メッセージ内容 |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | 作成日時 |

## ER図

```
┌─────────────────┐         ┌─────────────────┐
│    projects     │         │     members     │
├─────────────────┤         ├─────────────────┤
│ id (PK)         │         │ id (PK)         │
│ name            │         │ name            │
│ project_path    │         │ email           │
│ description     │         │ avatar_url      │
│ prd_content     │         │ role            │
│ deadline        │         │ status          │
│ status          │         │ created_at      │
│ created_at      │         │ updated_at      │
│ updated_at      │         └────────┬────────┘
└────────┬────────┘                  │
         │                           │
         │      ┌────────────────────┼────────────────┐
         │      │   project_members  │                │
         │      ├────────────────────┴────────────────┤
         │      │ project_id (FK) ──────┐             │
         │      │ member_id (FK) ───────┘             │
         │      │ assigned_at                         │
         │      └─────────────────────────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐         ┌─────────────────┐
│     tasks       │         │task_dependencies│
├─────────────────┤         ├─────────────────┤
│ id (PK)         │◄────────┤ task_id (FK)    │
│ project_id (FK) │         │depends_on_task_id│
│ title           │◄────────┤ (FK)            │
│ description     │         │ created_at      │
│ details         │         └─────────────────┘
│ test_strategy   │
│ priority        │         ┌─────────────────┐
│ status          │  1:N    │    subtasks     │
│ assignee_id (FK)│◄────────┤─────────────────┤
│ deadline        │         │ id (PK)         │
│ created_at      │         │ task_id (FK)    │
│ updated_at      │         │ title           │
└─────────────────┘         │ description     │
                            │ status          │
                            │ assignee_id (FK)│
                            │ created_at      │
                            │ updated_at      │
                            └─────────────────┘

┌─────────────────┐         ┌─────────────────┐
│ai_dialogue_     │  1:N    │ai_dialogue_     │
│sessions         │◄────────┤messages         │
├─────────────────┤         ├─────────────────┤
│ id (PK)         │         │ id (PK)         │
│ project_id (FK) │         │ session_id (FK) │
│ session_data    │         │ role            │
│ prd_quality_    │         │ content         │
│   score         │         │ created_at      │
│ created_at      │         └─────────────────┘
│ updated_at      │
└─────────────────┘
```

## インデックス設計

パフォーマンス最適化のため、以下のインデックスが作成されています：

| インデックス名 | テーブル | カラム | 用途 |
|---------------|----------|--------|------|
| idx_tasks_project_id | tasks | project_id | プロジェクト別タスク検索 |
| idx_tasks_status | tasks | status | ステータス別タスク検索 |
| idx_tasks_assignee_id | tasks | assignee_id | 担当者別タスク検索 |
| idx_subtasks_task_id | subtasks | task_id | 親タスク別サブタスク検索 |
| idx_project_members_project_id | project_members | project_id | プロジェクト別メンバー検索 |
| idx_project_members_member_id | project_members | member_id | メンバー別プロジェクト検索 |

## リレーション

### 1対多（1:N）リレーション
- `projects` → `tasks`: 1つのプロジェクトは複数のタスクを持つ
- `tasks` → `subtasks`: 1つのタスクは複数のサブタスクを持つ
- `tasks` → `task_dependencies`: 1つのタスクは複数の依存関係を持つ
- `members` → `tasks`: 1人のメンバーは複数のタスクを担当可能
- `members` → `subtasks`: 1人のメンバーは複数のサブタスクを担当可能
- `ai_dialogue_sessions` → `ai_dialogue_messages`: 1つのセッションは複数のメッセージを持つ

### 多対多（N:M）リレーション
- `projects` ↔ `members`: プロジェクトとメンバーは多対多の関係（project_membersテーブルで管理）
- `tasks` ↔ `tasks`: タスク間の依存関係は多対多（task_dependenciesテーブルで管理）

## トリガーとファンクション

### updated_at自動更新トリガー
以下のテーブルで、レコード更新時に`updated_at`カラムが自動的に現在時刻に更新されます：
- projects
- members
- tasks
- subtasks
- ai_dialogue_sessions

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
```

## Row Level Security (RLS)

すべてのテーブルでRow Level Securityが有効化されています。現在は開発中のため、すべての操作を許可するポリシーが設定されていますが、本番環境では適切な認証・認可ルールを実装する必要があります。

```sql
-- 例：認証されたユーザーのみアクセス可能にする場合
CREATE POLICY "Authenticated users only" 
ON tasks 
FOR ALL 
USING (auth.uid() IS NOT NULL);
```

## データベース拡張機能

- **uuid-ossp**: UUID生成機能を提供
  ```sql
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  ```

## 最適化の考慮事項

1. **インデックス戦略**
   - 頻繁に検索される外部キーにインデックスを作成
   - ステータスなど、フィルタリングに使用されるカラムにインデックスを作成

2. **JSONB使用**
   - `session_data`にJSONB型を使用し、柔軟なデータ構造を実現
   - JSONBは自動的にインデックス化され、高速な検索が可能

3. **カスケード削除**
   - 親レコード削除時に関連レコードも自動削除される設定
   - データ整合性を保証

4. **制約による検証**
   - CHECK制約により、無効なデータの挿入を防止
   - UNIQUE制約により、データの一意性を保証

## バックアップとリカバリ

Supabaseは自動バックアップ機能を提供しています：
- 日次バックアップ（過去7日間）
- ポイントインタイムリカバリ（有料プラン）
- 手動スナップショット作成可能

## 将来の拡張計画

1. **監査ログテーブル**
   - すべての変更履歴を記録
   - コンプライアンス要件に対応

2. **ファイル添付テーブル**
   - タスクへのファイル添付機能
   - S3互換ストレージとの連携

3. **通知テーブル**
   - リアルタイム通知機能
   - WebSocket経由での配信

4. **分析用集計テーブル**
   - パフォーマンス向上のための事前集計
   - ダッシュボード表示の高速化