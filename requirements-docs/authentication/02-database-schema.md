# データベーススキーマ設計

## 1. スキーマ概要

認証・組織管理システムでは、以下の新規テーブルと既存テーブルの変更を行います。

### 新規テーブル
- `organizations`: 組織情報
- `profiles`: ユーザープロファイル
- `organization_members`: 組織メンバーシップ

### 既存テーブルの変更
- `projects`: organization_id列の追加
- `tasks`: assignee_id外部キー制約の変更

## 2. テーブル定義詳細

### 2.1 organizations

```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- インデックス
CREATE INDEX idx_organizations_name ON organizations(name);
CREATE INDEX idx_organizations_created_at ON organizations(created_at DESC);
```

### 2.2 profiles

```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- インデックス
CREATE INDEX idx_profiles_full_name ON profiles(full_name);
```

### 2.3 organization_members

```sql
CREATE TABLE organization_members (
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (organization_id, profile_id)
);

-- インデックス
CREATE INDEX idx_organization_members_profile_id ON organization_members(profile_id);
CREATE INDEX idx_organization_members_role ON organization_members(role);
```

### 2.4 projects（既存テーブルの変更）

```sql
-- organization_id列を追加
ALTER TABLE projects 
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- 既存データの移行（後述）
UPDATE projects SET organization_id = (SELECT id FROM organizations LIMIT 1) WHERE organization_id IS NULL;

-- NOT NULL制約を追加
ALTER TABLE projects ALTER COLUMN organization_id SET NOT NULL;

-- インデックス追加
CREATE INDEX idx_projects_organization_id ON projects(organization_id);
```

### 2.5 tasks（既存テーブルの変更）

```sql
-- assignee_id外部キー制約を変更
ALTER TABLE tasks 
DROP CONSTRAINT IF EXISTS tasks_assignee_id_fkey;

ALTER TABLE tasks
ADD CONSTRAINT tasks_assignee_id_fkey 
FOREIGN KEY (assignee_id) 
REFERENCES profiles(id) 
ON DELETE SET NULL;
```

## 3. トリガー定義

### 3.1 handle_new_user トリガー

```sql
-- プロファイル自動作成関数
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', '')
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガー作成
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 3.2 updated_at自動更新トリガー

```sql
-- 汎用的なupdated_at更新関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルにトリガーを適用
CREATE TRIGGER update_organizations_updated_at 
    BEFORE UPDATE ON organizations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 4. Row Level Security (RLS) ポリシー

### 4.1 RLS有効化

```sql
-- 全テーブルでRLSを有効化
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
```

### 4.2 organizations ポリシー

```sql
-- SELECT: 所属する組織のみ表示
CREATE POLICY "Users can view their organizations" ON organizations
    FOR SELECT USING (
        id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE profile_id = auth.uid()
        )
    );

-- INSERT: 認証済みユーザーは組織を作成可能
CREATE POLICY "Authenticated users can create organizations" ON organizations
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
    );

-- UPDATE: 管理者のみ更新可能
CREATE POLICY "Admins can update organizations" ON organizations
    FOR UPDATE USING (
        id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE profile_id = auth.uid() AND role = 'admin'
        )
    );

-- DELETE: 管理者のみ削除可能（実際は使用しない）
CREATE POLICY "Admins can delete organizations" ON organizations
    FOR DELETE USING (
        id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE profile_id = auth.uid() AND role = 'admin'
        )
    );
```

### 4.3 profiles ポリシー

```sql
-- SELECT: 同じ組織のメンバーのプロファイルを表示可能
CREATE POLICY "Users can view profiles in same organization" ON profiles
    FOR SELECT USING (
        id IN (
            SELECT om2.profile_id
            FROM organization_members om1
            JOIN organization_members om2 ON om1.organization_id = om2.organization_id
            WHERE om1.profile_id = auth.uid()
        )
        OR id = auth.uid()
    );

-- INSERT: システムのみ（トリガー経由）
CREATE POLICY "System can insert profiles" ON profiles
    FOR INSERT WITH CHECK (false);

-- UPDATE: 自分のプロファイルのみ更新可能
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());
```

### 4.4 organization_members ポリシー

```sql
-- SELECT: 同じ組織のメンバーシップを表示可能
CREATE POLICY "Users can view organization members" ON organization_members
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE profile_id = auth.uid()
        )
    );

-- INSERT: 管理者のみメンバー追加可能
CREATE POLICY "Admins can add members" ON organization_members
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE profile_id = auth.uid() AND role = 'admin'
        )
    );

-- UPDATE: 管理者のみロール変更可能
CREATE POLICY "Admins can update member roles" ON organization_members
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE profile_id = auth.uid() AND role = 'admin'
        )
    );

-- DELETE: 管理者のみメンバー削除可能
CREATE POLICY "Admins can remove members" ON organization_members
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE profile_id = auth.uid() AND role = 'admin'
        )
    );
```

### 4.5 projects ポリシー

```sql
-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Enable all operations for all users" ON projects;

-- SELECT: 所属組織のプロジェクトのみ表示
CREATE POLICY "Users can view organization projects" ON projects
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE profile_id = auth.uid()
        )
    );

-- INSERT: 所属組織にプロジェクト作成可能
CREATE POLICY "Members can create projects" ON projects
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE profile_id = auth.uid()
        )
    );

-- UPDATE: 所属組織のプロジェクト更新可能
CREATE POLICY "Members can update projects" ON projects
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE profile_id = auth.uid()
        )
    );

-- DELETE: 管理者のみ削除可能
CREATE POLICY "Admins can delete projects" ON projects
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE profile_id = auth.uid() AND role = 'admin'
        )
    );
```

### 4.6 tasks ポリシー

```sql
-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Enable all operations for all users" ON tasks;

-- SELECT: 所属組織のタスクのみ表示
CREATE POLICY "Users can view organization tasks" ON tasks
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE organization_id IN (
                SELECT organization_id 
                FROM organization_members 
                WHERE profile_id = auth.uid()
            )
        )
    );

-- INSERT: 所属組織のプロジェクトにタスク作成可能
CREATE POLICY "Members can create tasks" ON tasks
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT id FROM projects 
            WHERE organization_id IN (
                SELECT organization_id 
                FROM organization_members 
                WHERE profile_id = auth.uid()
            )
        )
    );

-- UPDATE: 所属組織のタスク更新可能
CREATE POLICY "Members can update tasks" ON tasks
    FOR UPDATE USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE organization_id IN (
                SELECT organization_id 
                FROM organization_members 
                WHERE profile_id = auth.uid()
            )
        )
    );

-- DELETE: 所属組織のタスク削除可能
CREATE POLICY "Members can delete tasks" ON tasks
    FOR DELETE USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE organization_id IN (
                SELECT organization_id 
                FROM organization_members 
                WHERE profile_id = auth.uid()
            )
        )
    );
```

## 5. データ移行計画

### 5.1 移行手順

1. **バックアップ作成**
   ```sql
   -- 全テーブルのバックアップ
   CREATE TABLE projects_backup AS SELECT * FROM projects;
   CREATE TABLE tasks_backup AS SELECT * FROM tasks;
   ```

2. **デフォルト組織の作成**
   ```sql
   -- 既存データ用のデフォルト組織を作成
   INSERT INTO organizations (name) VALUES ('Default Organization');
   ```

3. **既存ユーザーのプロファイル作成**
   ```sql
   -- membersテーブルからprofilesへ移行
   INSERT INTO profiles (id, full_name)
   SELECT id, name FROM members
   ON CONFLICT (id) DO NOTHING;
   ```

4. **organization_membersへの移行**
   ```sql
   -- 既存メンバーを組織に追加
   INSERT INTO organization_members (organization_id, profile_id, role)
   SELECT 
       (SELECT id FROM organizations WHERE name = 'Default Organization'),
       id,
       'admin'
   FROM members;
   ```

5. **projectsテーブルの更新**
   ```sql
   -- 全プロジェクトにorganization_idを設定
   UPDATE projects 
   SET organization_id = (SELECT id FROM organizations WHERE name = 'Default Organization')
   WHERE organization_id IS NULL;
   ```

### 5.2 ロールバック計画

```sql
-- ロールバック用スクリプト
-- 1. 新規テーブルの削除
DROP TABLE IF EXISTS organization_members;
DROP TABLE IF EXISTS profiles;
DROP TABLE IF EXISTS organizations;

-- 2. projectsテーブルの復元
ALTER TABLE projects DROP COLUMN IF EXISTS organization_id;

-- 3. tasksの外部キー制約を元に戻す
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assignee_id_fkey;
ALTER TABLE tasks ADD CONSTRAINT tasks_assignee_id_fkey 
    FOREIGN KEY (assignee_id) REFERENCES members(id);

-- 4. バックアップからの復元（必要に応じて）
-- INSERT INTO projects SELECT * FROM projects_backup;
```

## 6. パフォーマンス考慮事項

### 6.1 インデックス戦略

1. **頻繁に使用されるクエリ用インデックス**
   - organization_members(profile_id): ユーザーの組織一覧取得
   - projects(organization_id): 組織のプロジェクト一覧取得
   - tasks(project_id, status): タスク一覧の取得とフィルタリング

2. **複合インデックス**
   ```sql
   CREATE INDEX idx_org_members_profile_role 
   ON organization_members(profile_id, role);
   ```

### 6.2 クエリ最適化

1. **組織のプロジェクト一覧取得**
   ```sql
   SELECT p.*, COUNT(t.id) as task_count
   FROM projects p
   LEFT JOIN tasks t ON t.project_id = p.id
   WHERE p.organization_id = $1
   GROUP BY p.id
   ORDER BY p.created_at DESC;
   ```

2. **ユーザーの組織とロール取得**
   ```sql
   SELECT o.*, om.role
   FROM organizations o
   JOIN organization_members om ON om.organization_id = o.id
   WHERE om.profile_id = $1
   ORDER BY o.name;
   ```

## 7. 監視とメンテナンス

### 7.1 定期的な確認項目

1. **インデックス使用状況**
   ```sql
   SELECT 
       schemaname,
       tablename,
       indexname,
       idx_scan,
       idx_tup_read,
       idx_tup_fetch
   FROM pg_stat_user_indexes
   WHERE schemaname = 'public'
   ORDER BY idx_scan DESC;
   ```

2. **テーブルサイズ監視**
   ```sql
   SELECT 
       relname AS table_name,
       pg_size_pretty(pg_total_relation_size(relid)) AS size
   FROM pg_stat_user_tables
   WHERE schemaname = 'public'
   ORDER BY pg_total_relation_size(relid) DESC;
   ```

### 7.2 バキューム戦略

```sql
-- 自動バキュームの設定確認
SELECT 
    relname,
    n_dead_tup,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname = 'public';
```