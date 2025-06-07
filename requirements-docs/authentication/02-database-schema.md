# データベーススキーマ詳細設計

## 1. スキーマ概要

Task Master認証システムのデータベース設計は、Supabase Auth（auth.*）と統合され、マルチテナント対応の組織管理を実現します。

## 2. テーブル定義

### 2.1 organizations（組織）

```sql
CREATE TABLE organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_organizations_name ON organizations(name);
CREATE INDEX idx_organizations_created_at ON organizations(created_at);
```

**説明**:
- 組織（会社、チーム、個人ワークスペース）を表す
- 将来的にサブスクリプション情報などを追加可能

### 2.2 profiles（ユーザープロファイル）

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_profiles_full_name ON profiles(full_name);
```

**説明**:
- auth.usersテーブルの拡張情報
- 認証情報以外のユーザー情報を保存

### 2.3 organization_members（組織メンバー）

```sql
CREATE TABLE organization_members (
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (organization_id, profile_id)
);

-- インデックス
CREATE INDEX idx_org_members_profile_id ON organization_members(profile_id);
CREATE INDEX idx_org_members_role ON organization_members(role);
CREATE INDEX idx_org_members_joined_at ON organization_members(joined_at);
```

**説明**:
- ユーザーと組織の多対多リレーション
- ロールベースアクセス制御の基盤

### 2.4 invitations（招待）

```sql
CREATE TABLE invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_expires_at ON invitations(expires_at);
CREATE INDEX idx_invitations_organization_id ON invitations(organization_id);
```

**説明**:
- 未登録ユーザーへの招待管理
- トークンベースの招待リンク
- 有効期限と承認状態の管理

### 2.5 既存テーブルの変更

#### projects テーブル

```sql
-- 組織IDを追加
ALTER TABLE projects 
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- 既存データのマイグレーション
UPDATE projects SET organization_id = (
  SELECT id FROM organizations WHERE name = 'Default Organization'
) WHERE organization_id IS NULL;

-- NOT NULL制約を追加
ALTER TABLE projects 
ALTER COLUMN organization_id SET NOT NULL;

-- インデックスを追加
CREATE INDEX idx_projects_organization_id ON projects(organization_id);
```

#### tasks テーブル

```sql
-- 担当者IDを追加
ALTER TABLE tasks 
ADD COLUMN assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- インデックスを追加
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
```

#### members テーブル（既存）

```sql
-- project_membersテーブルに変更（組織メンバーと区別）
ALTER TABLE members RENAME TO project_members;

-- profile_idへの参照を追加
ALTER TABLE project_members 
ADD COLUMN profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- 既存のuser_idからprofile_idへのマイグレーション
-- （実装時に詳細なマイグレーションスクリプトが必要）
```

## 3. トリガーとファンクション

### 3.1 ユーザープロファイル自動作成

```sql
-- プロファイル作成関数
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガー
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 3.2 更新タイムスタンプ自動更新

```sql
-- 更新時刻を自動更新する関数
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルにトリガーを設定
CREATE TRIGGER update_organizations_updated_at 
  BEFORE UPDATE ON organizations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 3.3 組織削除時のクリーンアップ

```sql
-- 組織削除時の関連データクリーンアップ
CREATE OR REPLACE FUNCTION cleanup_organization_data()
RETURNS TRIGGER AS $$
BEGIN
  -- プロジェクト、タスク等は外部キー制約でカスケード削除される
  -- 必要に応じて追加のクリーンアップ処理を記述
  
  -- 削除ログを記録（監査用）
  INSERT INTO audit_logs (action, table_name, record_id, user_id)
  VALUES ('DELETE', 'organizations', OLD.id, auth.uid());
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_organization_delete
  BEFORE DELETE ON organizations
  FOR EACH ROW EXECUTE FUNCTION cleanup_organization_data();
```

## 4. Row Level Security (RLS) ポリシー

### 4.1 organizations テーブル

```sql
-- RLSを有効化
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- メンバーは所属する組織を参照可能
CREATE POLICY "Members can view their organizations" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE profile_id = auth.uid()
    )
  );

-- 管理者は組織情報を更新可能
CREATE POLICY "Admins can update organizations" ON organizations
  FOR UPDATE USING (
    id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE profile_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- 新規組織作成は認証済みユーザーのみ
CREATE POLICY "Authenticated users can create organizations" ON organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
```

### 4.2 profiles テーブル

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のプロファイルを管理
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- 同じ組織のメンバーのプロファイルを参照可能
CREATE POLICY "Organization members can view profiles" ON profiles
  FOR SELECT USING (
    id IN (
      SELECT om2.profile_id 
      FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.profile_id = auth.uid()
    )
  );
```

### 4.3 organization_members テーブル

```sql
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- メンバーは所属組織のメンバー一覧を参照可能
CREATE POLICY "Members can view organization members" ON organization_members
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE profile_id = auth.uid()
    )
  );

-- 管理者はメンバーを追加・更新・削除可能
CREATE POLICY "Admins can manage members" ON organization_members
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE profile_id = auth.uid() 
      AND role = 'admin'
    )
  );
```

### 4.4 projects テーブル（更新）

```sql
-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Enable all operations" ON projects;

-- 新しいポリシーを作成
CREATE POLICY "Organization members can view projects" ON projects
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can create projects" ON projects
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Project admins can update projects" ON projects
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE profile_id = auth.uid() 
      AND role = 'admin'
    )
    OR
    id IN (
      SELECT project_id 
      FROM project_members 
      WHERE profile_id = auth.uid() 
      AND role = 'admin'
    )
  );
```

### 4.5 tasks テーブル（更新）

```sql
-- タスクの参照ポリシー
CREATE POLICY "Users can view tasks in their projects" ON tasks
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE organization_id IN (
        SELECT organization_id 
        FROM organization_members 
        WHERE profile_id = auth.uid()
      )
    )
    OR
    assignee_id = auth.uid()
  );

-- タスクの作成・更新ポリシー
CREATE POLICY "Project members can manage tasks" ON tasks
  FOR ALL USING (
    project_id IN (
      SELECT project_id 
      FROM project_members 
      WHERE profile_id = auth.uid()
    )
  );
```

## 5. インデックス戦略

### 5.1 パフォーマンス最適化のためのインデックス

```sql
-- 複合インデックス
CREATE INDEX idx_org_members_profile_org 
  ON organization_members(profile_id, organization_id);

CREATE INDEX idx_projects_org_created 
  ON projects(organization_id, created_at DESC);

CREATE INDEX idx_tasks_project_status 
  ON tasks(project_id, status);

CREATE INDEX idx_tasks_assignee_status 
  ON tasks(assignee_id, status) 
  WHERE assignee_id IS NOT NULL;

-- 部分インデックス
CREATE INDEX idx_invitations_pending 
  ON invitations(organization_id, email) 
  WHERE accepted_at IS NULL AND expires_at > NOW();
```

## 6. データマイグレーション計画

### 6.1 既存データの移行手順

1. **デフォルト組織の作成**
   ```sql
   INSERT INTO organizations (id, name, description)
   VALUES (
     'default-org-uuid',
     'Default Organization',
     '既存データ用のデフォルト組織'
   );
   ```

2. **既存membersデータの移行**
   ```sql
   -- プロファイル作成
   INSERT INTO profiles (id, full_name)
   SELECT DISTINCT user_id, name 
   FROM members;
   
   -- デフォルト組織へのメンバー追加
   INSERT INTO organization_members (organization_id, profile_id, role)
   SELECT 
     'default-org-uuid',
     user_id,
     CASE WHEN role = 'admin' THEN 'admin' ELSE 'member' END
   FROM members;
   ```

3. **プロジェクトの組織紐付け**
   ```sql
   UPDATE projects 
   SET organization_id = 'default-org-uuid' 
   WHERE organization_id IS NULL;
   ```

### 6.2 バックアップとロールバック計画

```sql
-- マイグレーション前のバックアップ
CREATE TABLE members_backup AS SELECT * FROM members;
CREATE TABLE projects_backup AS SELECT * FROM projects;

-- ロールバック用スクリプト
-- （必要に応じて実装）
```

## 7. 監査とセキュリティ

### 7.1 監査ログテーブル

```sql
CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

### 7.2 セキュリティビュー

```sql
-- ユーザーの組織一覧（セキュアビュー）
CREATE VIEW user_organizations AS
SELECT 
  o.*,
  om.role,
  om.joined_at
FROM organizations o
JOIN organization_members om ON o.id = om.organization_id
WHERE om.profile_id = auth.uid();

-- プロジェクトアクセス権限ビュー
CREATE VIEW user_accessible_projects AS
SELECT DISTINCT
  p.*,
  CASE 
    WHEN om.role = 'admin' THEN 'org_admin'
    WHEN pm.role = 'admin' THEN 'project_admin'
    WHEN pm.role IS NOT NULL THEN pm.role
    ELSE 'viewer'
  END as effective_role
FROM projects p
JOIN organization_members om ON p.organization_id = om.organization_id
LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.profile_id = auth.uid()
WHERE om.profile_id = auth.uid();
```