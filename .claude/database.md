# データベース設計

## 概要

Task Master APIは、従来のリレーショナルデータベースやNoSQLデータベースではなく、ファイルベースのJSONストレージを採用しています。これにより、セットアップの簡素化、ポータビリティの向上、依存関係の削減を実現しています。

### ストレージアーキテクチャの選択理由

1. **シンプルさ**: データベースサーバーの設定や管理が不要
2. **ポータビリティ**: プロジェクトフォルダをコピーするだけでデータも移行可能
3. **透明性**: データ構造がJSONファイルとして直接確認可能
4. **バージョン管理**: Gitでデータ構造の変更を追跡可能
5. **低レイテンシ**: ローカルファイルシステムへの直接アクセス

## テーブル構造（JSONスキーマ）

### 1. tasks.json - メインタスクテーブル

```json
{
  "tasks": [
    {
      "id": 1,
      "title": "string (必須) - タスクのタイトル",
      "description": "string - タスクの簡潔な説明",
      "details": "string - 詳細な実装方針やメモ",
      "testStrategy": "string - テスト戦略",
      "priority": "enum: high | medium | low",
      "status": "enum: pending | in-progress | completed | blocked",
      "dependencies": [2, 3],
      "subtasks": [
        {
          "id": 1,
          "title": "string - サブタスクのタイトル",
          "description": "string - サブタスクの説明",
          "assignee": "string - 担当者名",
          "status": "enum: pending | completed",
          "dependencies": []
        }
      ],
      "createdAt": "ISO 8601 datetime",
      "updatedAt": "ISO 8601 datetime",
      "completedAt": "ISO 8601 datetime (null if not completed)"
    }
  ],
  "metadata": {
    "version": "1.0",
    "lastModified": "ISO 8601 datetime",
    "totalTasks": 10,
    "projectName": "string",
    "projectDescription": "string"
  }
}
```

### 2. config.json - プロジェクト設定

```json
{
  "project": {
    "name": "string - プロジェクト名",
    "description": "string - プロジェクトの説明",
    "createdAt": "ISO 8601 datetime",
    "version": "string - 設定バージョン"
  },
  "preferences": {
    "defaultPriority": "enum: high | medium | low",
    "aiProvider": "string - デフォルトAIプロバイダー",
    "expandSubtasks": 5,
    "useResearchMode": false
  },
  "telemetry": {
    "enabled": true,
    "lastSync": "ISO 8601 datetime"
  }
}
```

### 3. telemetry.json - 使用統計

```json
{
  "sessions": [
    {
      "id": "uuid",
      "timestamp": "ISO 8601 datetime",
      "userId": "string",
      "commandName": "string",
      "modelUsed": "string",
      "providerName": "string",
      "inputTokens": 0,
      "outputTokens": 0,
      "totalTokens": 0,
      "totalCost": 0.00,
      "currency": "USD",
      "processingTime": 0,
      "success": true,
      "error": null
    }
  ]
}
```

## ER図（論理モデル）

```
┌─────────────────┐
│     Task        │
├─────────────────┤
│ id (PK)         │
│ title           │
│ description     │
│ details         │
│ testStrategy    │
│ priority        │
│ status          │
│ createdAt       │
│ updatedAt       │
│ completedAt     │
└─────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐     N:M    ┌─────────────────┐
│    Subtask      │◄────────────│  TaskDependency │
├─────────────────┤             ├─────────────────┤
│ id (PK)         │             │ taskId (FK)     │
│ taskId (FK)     │             │ dependsOnId (FK)│
│ title           │             └─────────────────┘
│ description     │
│ assignee        │
│ status          │
└─────────────────┘
```

## インデックス設計

ファイルベースストレージのため、従来のデータベースインデックスは存在しませんが、以下の最適化を実装しています：

1. **IDによる高速アクセス**: タスクIDをキーとしたメモリ内マップ
2. **ステータスフィルタリング**: ステータス別のタスクリストキャッシュ
3. **依存関係グラフ**: メモリ内での依存関係の事前計算

## リレーション

### 1. タスクとサブタスクの関係
- **関係性**: 1対多（1つのタスクが複数のサブタスクを持つ）
- **参照整合性**: 親タスク削除時にサブタスクも削除
- **制約**: サブタスクは必ず親タスクを持つ

### 2. タスク間の依存関係
- **関係性**: 多対多（自己参照）
- **制約**: 循環依存の禁止
- **検証**: 依存関係追加時に循環チェック

### 3. サブタスク間の依存関係
- **関係性**: 多対多（同一タスク内のサブタスク間のみ）
- **制約**: 異なるタスクのサブタスク間の依存は不可

## データアクセスパターン

### 読み取り操作
```javascript
// ファイル全体を読み込み、メモリにキャッシュ
const data = JSON.parse(await fs.readFile('tasks.json', 'utf8'));

// 特定のタスクを検索
const task = data.tasks.find(t => t.id === taskId);

// フィルタリング
const pendingTasks = data.tasks.filter(t => t.status === 'pending');
```

### 書き込み操作
```javascript
// 1. 現在のデータを読み込み
const data = JSON.parse(await fs.readFile('tasks.json', 'utf8'));

// 2. データを更新
data.tasks.push(newTask);
data.metadata.lastModified = new Date().toISOString();
data.metadata.totalTasks = data.tasks.length;

// 3. アトミックな書き込み（一時ファイル経由）
await fs.writeFile('tasks.json.tmp', JSON.stringify(data, null, 2));
await fs.rename('tasks.json.tmp', 'tasks.json');
```

## トランザクション管理

ファイルベースのため、ACIDトランザクションは完全にはサポートされませんが、以下の対策を実装：

1. **アトミック性**: 一時ファイルを使用した置換操作
2. **一貫性**: アプリケーションレベルでの検証
3. **独立性**: ファイルロック（実装予定）
4. **永続性**: OSレベルのファイルシステム保証

## バックアップとリカバリ

### 自動バックアップ
```javascript
// 重要な操作前にバックアップを作成
await fs.copyFile('tasks.json', `tasks.json.bak.${timestamp}`);
```

### 手動バックアップ
```bash
# プロジェクトディレクトリ全体をバックアップ
tar -czf project-backup-$(date +%Y%m%d).tar.gz projects/
```

### リカバリ手順
1. バックアップファイルを確認
2. 現在のファイルを別名で保存
3. バックアップファイルをリストア
4. データ整合性を確認

## パフォーマンス最適化

### 1. メモリキャッシュ
- 頻繁にアクセスされるデータはメモリに保持
- ファイル変更時にキャッシュを無効化

### 2. 差分更新
- 大規模なタスクリストでは差分のみを更新（実装予定）

### 3. 非同期I/O
- すべてのファイル操作は非同期で実行
- 複数の読み取り操作は並列化

## データ移行

### バージョンアップ時の移行
```javascript
// マイグレーション例
async function migrateV1ToV2(data) {
  // 新しいフィールドの追加
  data.tasks = data.tasks.map(task => ({
    ...task,
    createdAt: task.createdAt || new Date().toISOString(),
    updatedAt: task.updatedAt || new Date().toISOString()
  }));
  
  // メタデータの更新
  data.metadata.version = "2.0";
  
  return data;
}
```

## セキュリティ考慮事項

### 1. アクセス制御
- ファイルシステムのパーミッションに依存
- 読み取り専用モードのサポート

### 2. データ検証
- 入力データのスキーマ検証
- JSONパースエラーの適切な処理

### 3. パストラバーサル対策
```javascript
// プロジェクトパスの検証
const safePath = path.normalize(projectPath);
if (!safePath.startsWith(baseProjectDir)) {
  throw new Error('Invalid project path');
}
```

## 制限事項

1. **同時書き込み**: ファイルロックが未実装のため、同時書き込みで競合の可能性
2. **大規模データ**: 数千タスクを超えるとパフォーマンスが低下
3. **部分更新**: ファイル全体の読み書きが必要
4. **リアルタイム同期**: 複数クライアント間のリアルタイム同期は未対応

## 将来の拡張計画

1. **SQLiteへの移行オプション**: より高度なクエリが必要な場合
2. **インクリメンタル更新**: 差分のみの保存
3. **圧縮ストレージ**: 大規模プロジェクト向け
4. **分散ロック**: 複数プロセス間の同期
5. **イベントソーシング**: 変更履歴の完全な追跡