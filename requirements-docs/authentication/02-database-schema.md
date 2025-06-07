# データベーススキーマ設計

## 1. テーブル定義

### 1.1 organizations テーブル
```sql
CREATE TABLE organizations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- インデックス
CREATE INDEX idx_organizations_created_at ON organizations(created_at DESC);
```

### 1.2 profiles テーブル
```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text CHECK (char_length(full_name) <= 100),
  avatar_url text CHECK (char_length(avatar_url) <= 500),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
```

### 1.3 organization_members テーブル
```sql
CREATE TABLE organization_members (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (organization_id, profile_id)
);

-- インデックス
CREATE INDEX idx_organization_members_profile_id ON organization_members(profile_id);
CREATE INDEX idx_organization_members_role ON organization_members(role) WHERE role = 'admin';
```

### 1.4 既存テーブルの変更

#### projects テーブル
```sql
ALTER TABLE projects 
ADD COLUMN organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE;

-- インデックス追加
CREATE INDEX idx_projects_organization_id ON projects(organization_id);
```

#### tasks テーブル
```sql
ALTER TABLE tasks
ADD COLUMN assignee_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- インデックス追加
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id) WHERE assignee_id IS NOT NULL;
```

## 2. トリガーとファンクション

### 2.1 自動プロファイル作成
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 2.2 updated_at 自動更新
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 3. Row Level Security (RLS) ポリシー

### 3.1 基本設定
```sql
-- すべてのテーブルでRLSを有効化
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
```

### 3.2 ヘルパーファンクション
```sql
-- ユーザーが組織のメンバーかチェック
CREATE OR REPLACE FUNCTION is_organization_member(org_id uuid, user_id uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id AND profile_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ユーザーが組織の管理者かチェック
CREATE OR REPLACE FUNCTION is_organization_admin(org_id uuid, user_id uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id 
    AND profile_id = user_id 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ユーザーの組織IDを取得
CREATE OR REPLACE FUNCTION get_user_organizations(user_id uuid DEFAULT auth.uid())
RETURNS SETOF uuid AS $$
BEGIN
  RETURN QUERY
  SELECT organization_id 
  FROM organization_members
  WHERE profile_id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

### 3.3 organizations テーブルのRLSポリシー
```sql
-- SELECT: メンバーのみ閲覧可能
CREATE POLICY "Organizations viewable by members" ON organizations
  FOR SELECT USING (
    is_organization_member(id)
  );

-- INSERT: 認証済みユーザーは作成可能
CREATE POLICY "Organizations creatable by authenticated users" ON organizations
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- UPDATE: 管理者のみ更新可能
CREATE POLICY "Organizations updatable by admins" ON organizations
  FOR UPDATE USING (
    is_organization_admin(id)
  );

-- DELETE: 無効化（組織の削除は管理画面のみ）
```

### 3.4 profiles テーブルのRLSポリシー
```sql
-- SELECT: 同じ組織のメンバーのプロファイルを閲覧可能
CREATE POLICY "Profiles viewable by organization members" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.profile_id = auth.uid() 
      AND om2.profile_id = profiles.id
    )
  );

-- UPDATE: 自分のプロファイルのみ更新可能
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (
    id = auth.uid()
  );
```

### 3.5 organization_members テーブルのRLSポリシー
```sql
-- SELECT: 同じ組織のメンバーが閲覧可能
CREATE POLICY "Members viewable by organization members" ON organization_members
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

-- INSERT: 管理者のみ追加可能
CREATE POLICY "Members addable by admins" ON organization_members
  FOR INSERT WITH CHECK (
    is_organization_admin(organization_id)
  );

-- UPDATE: 管理者のみ更新可能（ロール変更）
CREATE POLICY "Members updatable by admins" ON organization_members
  FOR UPDATE USING (
    is_organization_admin(organization_id)
  );

-- DELETE: 管理者のみ削除可能
CREATE POLICY "Members deletable by admins" ON organization_members
  FOR DELETE USING (
    is_organization_admin(organization_id)
  );
```

### 3.6 projects テーブルのRLSポリシー
```sql
-- SELECT: 組織のメンバーのみ閲覧可能
CREATE POLICY "Projects viewable by organization members" ON projects
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

-- INSERT: 組織のメンバーが作成可能
CREATE POLICY "Projects creatable by organization members" ON projects
  FOR INSERT WITH CHECK (
    is_organization_member(organization_id)
  );

-- UPDATE/DELETE: 組織のメンバーが操作可能
CREATE POLICY "Projects modifiable by organization members" ON projects
  FOR ALL USING (
    is_organization_member(organization_id)
  );
```

### 3.7 tasks テーブルのRLSポリシー
```sql
-- プロジェクト経由で組織メンバーがアクセス可能
CREATE POLICY "Tasks accessible via project membership" ON tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = tasks.project_id
      AND is_organization_member(p.organization_id)
    )
  );
```

## 4. マイグレーション計画

### 4.1 実行順序

1. **Phase 1: 基本テーブル作成**
   - organizations, profiles, organization_members作成
   - トリガーとファンクション作成

2. **Phase 2: 既存テーブル更新**
   - projectsにorganization_id追加
   - tasksにassignee_id追加

3. **Phase 3: データ移行**
   - デフォルト組織作成
   - 既存プロジェクトをデフォルト組織に紐付け

4. **Phase 4: RLS有効化**
   - すべてのポリシー適用
   - セキュリティ検証

5. **Phase 5: クリーンアップ**
   - 古いカラムの削除
   - インデックス最適化

### 4.2 ロールバック計画

各フェーズごとにロールバックスクリプトを用意：

```sql
-- Phase 1 ロールバック
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Phase 2 ロールバック
ALTER TABLE projects DROP COLUMN IF EXISTS organization_id;
ALTER TABLE tasks DROP COLUMN IF EXISTS assignee_id;
```

## 5. パフォーマンス最適化

### 5.1 インデックス戦略

- 外部キーには自動的にインデックス作成
- 頻繁に検索される列に追加インデックス
- 複合インデックスの検討

### 5.2 パーティショニング（将来）

大規模化した場合の対策：
- organization_idによるテーブルパーティション
- 時系列データの月次パーティション

### 5.3 キャッシュ戦略

- 組織メンバーシップ情報のRedisキャッシュ
- RLSポリシー結果のメモ化