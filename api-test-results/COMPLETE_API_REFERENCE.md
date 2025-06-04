# Task Master API 完全リファレンス

最終更新: 2025年6月4日  
バージョン: 修正版（v1.1）  
ベースURL: `http://localhost:8080`

---

## 📋 API一覧

### 1. プロジェクト管理

#### POST /api/v1/projects/initialize
**API名**: プロジェクト初期化API

**送信するリクエスト**:
```json
{
  "projectPath": "/Users/example/project/path",
  "projectName": "My Project"
}
```
- `projectPath` (文字列, 必須): プロジェクトを作成するディレクトリの絶対パス
- `projectName` (文字列, 必須): プロジェクトの表示名

**返ってくるレスポンス**:
```json
{
  "success": true,
  "data": {}
}
```
- `success` (真偽値): 処理が成功したかどうか
- `data` (オブジェクト): 初期化結果（通常は空）

**言語化するとこれはこういう時に使うAPI**:
新しいTask Masterプロジェクトを開始する時に使用する。指定したディレクトリに`tasks.json`（タスクデータ）と`.taskmasterconfig`（設定ファイル）を作成し、プロジェクトの基本構造をセットアップする。

**補足**: 
プロジェクト作成後は、同じディレクトリで他のAPIを使用してタスク管理が可能になる。

---

### 2. AIによるタスク生成

#### POST /api/v1/generate-tasks-from-prd
**API名**: PRDからタスク一括生成API

**送信するリクエスト**:
```json
{
  "prd_content": "# アプリ仕様\n\n## 概要\nユーザー認証機能付きのダッシュボードを作成する。\n\n## 機能要件\n- ログイン/ログアウト\n- データ可視化",
  "target_task_count": 5,
  "use_research_mode": false
}
```
- `prd_content` (文字列, 必須): PRD（製品要求仕様書）の内容。Markdown形式で書かれた機能仕様
- `target_task_count` (数値, オプション): 生成するタスクの目標数（デフォルト: 10）
- `use_research_mode` (真偽値, オプション): 最新技術情報を検索するかどうか（デフォルト: false）

**返ってくるレスポンス**:
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": 1,
        "title": "ユーザー認証システムの実装",
        "description": "JWT トークンベースの認証システムを構築する",
        "details": "1. ログインAPI作成\n2. JWT生成・検証\n3. ミドルウェア実装",
        "testStrategy": "単体テスト、統合テスト、セキュリティテスト",
        "priority": "high",
        "dependencies": [],
        "status": "pending",
        "subtasks": []
      }
    ],
    "metadata": {
      "projectName": "認証システム",
      "totalTasks": 5,
      "generatedAt": "2025-06-04T07:56:16.213Z"
    },
    "telemetryData": {
      "modelUsed": "claude-sonnet-4",
      "totalTokens": 3697,
      "totalCost": 0.035415,
      "processingTime": 30079
    }
  }
}
```
- `tasks` (配列): 生成されたタスクの一覧
  - `id` (数値): タスクの一意識別子
  - `title` (文字列): タスクのタイトル
  - `description` (文字列): タスクの概要説明
  - `details` (文字列): 実装の詳細手順
  - `testStrategy` (文字列): テスト戦略
  - `priority` (文字列): 優先度（high/medium/low）
  - `dependencies` (配列): 依存するタスクのID一覧
  - `status` (文字列): 現在のステータス
  - `subtasks` (配列): サブタスクの一覧
- `metadata` (オブジェクト): 生成メタ情報
- `telemetryData` (オブジェクト): AI処理の詳細情報（使用モデル、コスト等）

**言語化するとこれはこういう時に使うAPI**:
新しいプロジェクトや機能の開発を始める時に、仕様書（PRD）からタスクを自動で分解・整理したい場合に使用する。AIが仕様を理解して、実装に必要なタスクを適切な粒度で生成し、依存関係も自動設定する。

**補足**: 
`use_research_mode: true`にすると、Perplexity AIが最新の技術動向を調査してより具体的な提案を行う。

---

### 3. タスク作成

#### POST /api/v1/tasks (AI生成モード)
**API名**: AI支援タスク作成API

**送信するリクエスト**:
```json
{
  "prompt": "Reactでダッシュボード画面を作成する。Chart.jsを使用してグラフ表示機能を実装し、レスポンシブデザインに対応する。",
  "priority": "high",
  "dependencies": [1, 2]
}
```
- `prompt` (文字列, 必須): タスクの内容をAIに説明する自然言語テキスト
- `priority` (文字列, オプション): 優先度（high/medium/low、デフォルト: medium）
- `dependencies` (配列, オプション): 依存するタスクのID一覧

**返ってくるレスポンス**:
```json
{
  "success": true,
  "data": {
    "taskId": 13,
    "message": "Successfully added new task #13",
    "telemetryData": {
      "modelUsed": "claude-3-7-sonnet-20250219",
      "totalTokens": 3626,
      "totalCost": 0.026706,
      "processingTime": 22242
    }
  },
  "message": "Task created successfully"
}
```
- `taskId` (数値): 作成されたタスクのID
- `message` (文字列): 成功メッセージ
- `telemetryData` (オブジェクト): AI処理の詳細情報

**言語化するとこれはこういう時に使うAPI**:
具体的な実装方針が決まっていない状態で、大まかな要件だけからタスクを作成したい時に使用する。AIが要件を分析して、詳細な実装計画、テスト戦略、必要な技術スタックまで自動で提案してくれる。

#### POST /api/v1/tasks (手動作成モード)
**API名**: 手動タスク作成API

**送信するリクエスト**:
```json
{
  "title": "APIドキュメントの作成",
  "description": "Task Master APIの使用方法を説明するドキュメントを作成する",
  "priority": "medium",
  "details": "OpenAPI 3.0形式でAPI仕様書を作成し、Swagger UIで閲覧可能にする",
  "testStrategy": "作成したドキュメントの内容が正確で、実際のAPIと一致していることを確認"
}
```
- `title` (文字列, 必須): タスクのタイトル
- `description` (文字列, 必須): タスクの概要説明
- `priority` (文字列, オプション): 優先度
- `details` (文字列, オプション): 実装の詳細
- `testStrategy` (文字列, オプション): テスト方法

**返ってくるレスポンス**:
```json
{
  "success": true,
  "data": {
    "taskId": 14,
    "message": "Successfully added new task #14",
    "telemetryData": null
  },
  "message": "Task created successfully"
}
```

**言語化するとこれはこういう時に使うAPI**:
既に詳細が決まっているタスクを、指定した内容で正確に登録したい時に使用する。AIの解釈を介さず、入力した内容がそのまま保存される。

**補足**: 
同じエンドポイントで、`prompt`があればAI生成、`title`+`description`があれば手動作成として自動判別される。

---

### 4. タスク取得

#### GET /api/v1/tasks
**API名**: タスク一覧取得API

**送信するリクエスト**:
```
GET /api/v1/tasks
```
パラメータ不要

**返ってくるレスポンス**:
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": 1,
        "title": "プロジェクトリポジトリと開発環境のセットアップ",
        "description": "GitHubリポジトリの作成、プロジェクトの初期化、および開発環境のセットアップを行う。",
        "priority": "high",
        "dependencies": [],
        "status": "pending",
        "subtasks": []
      }
    ],
    "totalTasks": 10,
    "filteredBy": "all"
  }
}
```
- `tasks` (配列): プロジェクト内の全タスク一覧
- `totalTasks` (数値): 総タスク数
- `filteredBy` (文字列): 適用されているフィルター（通常は"all"）

**言語化するとこれはこういう時に使うAPI**:
プロジェクトの現在の状況を把握する時や、ダッシュボードでタスク一覧を表示する時に使用する。全タスクの概要情報を一度に取得できる。

#### GET /api/v1/tasks/:id
**API名**: 特定タスク詳細取得API

**送信するリクエスト**:
```
GET /api/v1/tasks/1
```
- `:id` (数値, 必須): 取得したいタスクのID

**返ってくるレスポンス**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "プロジェクトリポジトリと開発環境のセットアップ",
    "description": "GitHubリポジトリの作成、プロジェクトの初期化、および開発環境のセットアップを行う。",
    "details": "1. GitHubで新規リポジトリを作成\n2. ローカルでプロジェクトディレクトリを初期化\n3. 必要な依存関係をインストール",
    "testStrategy": "リポジトリが正しく作成され、プロジェクトが初期化できていることを確認",
    "priority": "high",
    "dependencies": [],
    "status": "pending",
    "subtasks": []
  }
}
```

**言語化するとこれはこういう時に使うAPI**:
特定のタスクの詳細情報（実装手順、テスト戦略、サブタスクなど）を確認したい時に使用する。タスク詳細画面やタスク編集画面で使用される。

---

### 5. タスク更新

#### PUT /api/v1/tasks/:id (AI更新モード)
**API名**: AI支援タスク更新API

**送信するリクエスト**:
```json
{
  "prompt": "APIドキュメントにセキュリティに関する章を追加し、認証方法とAPIキーの使用方法を詳しく説明する。また、レート制限についても記載する。",
  "research": false
}
```
- `:id` (数値, 必須): 更新するタスクのID
- `prompt` (文字列, 必須): 更新内容をAIに説明するテキスト
- `research` (真偽値, オプション): 最新情報を調査するかどうか

**返ってくるレスポンス**:
```json
{
  "success": true,
  "data": {
    "message": "Successfully updated task with ID 14 based on the prompt",
    "taskId": 14,
    "updated": true,
    "updatedTask": {
      "id": 14,
      "title": "APIドキュメントの作成",
      "details": "OpenAPI 3.0形式でAPI仕様書を作成し、Swagger UIで閲覧可能にする。セキュリティに関する章を含め、認証方法、APIキーの使用方法、およびレート制限について詳細に説明する。",
      "subtasks": [
        {
          "id": 14.1,
          "title": "セキュリティに関する章の作成",
          "description": "認証方法とAPIキーの使用方法を詳細に説明するセクションを追加",
          "status": "pending"
        }
      ]
    },
    "telemetryData": {
      "totalCost": 0.008982,
      "processingTime": 9587
    }
  }
}
```
- `updatedTask` (オブジェクト): 更新後のタスクの完全な内容
- `subtasks` (配列): AIが自動生成したサブタスク（該当する場合）

**言語化するとこれはこういう時に使うAPI**:
タスクの要件が変更された時や、追加の作業が必要になった時に、変更内容を自然言語で伝えてタスクを更新したい場合に使用する。AIが既存の内容と新しい要求を統合して、適切にタスクを拡張する。

#### PUT /api/v1/tasks/:id (手動更新モード)
**API名**: 手動タスク更新API

**送信するリクエスト**:
```json
{
  "title": "【更新】Reactダッシュボード画面の実装",
  "description": "Reactでダッシュボード画面を作成し、Chart.jsとD3.jsの両方を使用してグラフ表示機能を実装する。",
  "priority": "medium"
}
```
- 更新したいフィールドのみ指定
- `title`, `description`, `priority`, `details`, `testStrategy`など任意のフィールド

**返ってくるレスポンス**:
```json
{
  "success": true,
  "data": {
    "message": "Successfully updated task 13",
    "taskId": 13,
    "updated": true,
    "updatedTask": {
      "id": 13,
      "title": "【更新】Reactダッシュボード画面の実装",
      "description": "Reactでダッシュボード画面を作成し、Chart.jsとD3.jsの両方を使用してグラフ表示機能を実装する。",
      "priority": "medium"
    }
  }
}
```

**言語化するとこれはこういう時に使うAPI**:
タスクの特定のフィールド（タイトル、説明、優先度など）を正確に変更したい時に使用する。指定したフィールドのみが更新され、他の内容は変更されない。

**補足**: 
同じエンドポイントで、`prompt`があればAI更新、他のフィールドがあれば手動更新として自動判別される。

---

### 6. ステータス管理

#### PATCH /api/v1/tasks/:id/status
**API名**: タスクステータス更新API

**送信するリクエスト**:
```json
{
  "status": "in-progress"
}
```
- `:id` (数値, 必須): 更新するタスクのID
- `status` (文字列, 必須): 新しいステータス（pending/in-progress/done/review/deferred/cancelled）

**返ってくるレスポンス**:
```json
{
  "success": true,
  "data": {
    "message": "Successfully updated task 14 status to \"in-progress\"",
    "taskId": "14",
    "status": "in-progress",
    "tasksPath": "/path/to/tasks.json"
  },
  "message": "Task 14 status updated to in-progress"
}
```
- `taskId` (文字列): 更新されたタスクのID
- `status` (文字列): 更新後のステータス

**言語化するとこれはこういう時に使うAPI**:
タスクの進捗状況を更新する時に使用する。「作業開始」「完了」「レビュー待ち」などのステータス変更を、他の内容を変更せずに行える。カンバンボードなどでのドラッグ&ドロップ操作の実装に適している。

---

### 7. サブタスク管理

#### POST /api/v1/tasks/:id/subtasks
**API名**: サブタスク追加API

**送信するリクエスト**:
```json
{
  "title": "GitHubでリポジトリを作成",
  "description": "新規リポジトリを作成してREADMEを追加"
}
```
- `:id` (数値, 必須): 親タスクのID
- `title` (文字列, 必須): サブタスクのタイトル
- `description` (文字列, 必須): サブタスクの説明

**返ってくるレスポンス**:
```json
{
  "success": true,
  "data": {}
}
```

**言語化するとこれはこういう時に使うAPI**:
大きなタスクをより細かい作業に分解したい時に使用する。親タスクの下に子タスクを追加することで、階層的なタスク管理が可能になる。

---

### 8. タスク展開

#### POST /api/v1/tasks/:id/expand
**API名**: AIタスク自動展開API

**送信するリクエスト**:
```json
{
  "force": false,
  "targetSubtasks": 5
}
```
- `:id` (数値, 必須): 展開するタスクのID
- `force` (真偽値, オプション): 既存のサブタスクを上書きするかどうか
- `targetSubtasks` (数値, オプション): 生成するサブタスクの目標数

**返ってくるレスポンス**:
```json
{
  "success": true,
  "data": {
    "subtasksGenerated": 0
  }
}
```
- `subtasksGenerated` (数値): 実際に生成されたサブタスクの数

**言語化するとこれはこういう時に使うAPI**:
大きなタスクを、AIの力を借りて適切な粒度のサブタスクに自動分解したい時に使用する。タスクの内容を分析して、実装に必要な具体的な作業項目を自動生成する。

---

### 9. 複雑度分析

#### POST /api/v1/tasks/analyze-complexity
**API名**: タスク複雑度分析API

**送信するリクエスト**:
```json
{
  "taskId": 13
}
```
- `taskId` (数値, 必須): 分析するタスクのID

**返ってくるレスポンス**:
```json
{
  "success": false,
  "error": {
    "code": "ANALYZE_COMPLEXITY_ERROR",
    "message": "コア機能での処理エラー"
  }
}
```

**言語化するとこれはこういう時に使うAPI**:
タスクの実装難易度や必要な工数を見積もりたい時に使用する。AIがタスクの内容と依存関係を分析して、複雑度レポートを生成する。（現在、コア機能にバグがあるため一時的に利用不可）

---

## 🎯 使用パターン例

### パターン1: 新規プロジェクト開始
1. `POST /api/v1/projects/initialize` - プロジェクト作成
2. `POST /api/v1/generate-tasks-from-prd` - 仕様書からタスク一括生成
3. `GET /api/v1/tasks` - 生成されたタスクの確認

### パターン2: 個別タスクの詳細作成
1. `POST /api/v1/tasks` (AI生成) - 大まかな要件からタスク作成
2. `POST /api/v1/tasks/:id/expand` - サブタスクへの自動展開
3. `PUT /api/v1/tasks/:id` (AI更新) - 要件変更時の更新

### パターン3: 進捗管理
1. `GET /api/v1/tasks` - 現状把握
2. `PATCH /api/v1/tasks/:id/status` - ステータス更新
3. `PUT /api/v1/tasks/:id` (手動更新) - 進捗に応じた内容調整

---

## 🚀 AI機能の活用ポイント

- **prompt**は自然言語で書け、技術仕様が曖昧でも具体的な実装計画を生成
- **research_mode**を有効にすると最新技術動向も考慮した提案
- **サブタスクの自動生成**により、適切な作業粒度への分解が可能
- **依存関係の自動検出**で、タスク間の順序関係も最適化

Task Master APIは、従来の手動タスク管理とAI支援による知的なタスク管理の両方をシームレスに提供する、次世代のプロジェクト管理ツールです。