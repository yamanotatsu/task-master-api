# TaskMaster API テスト実装ガイド

このドキュメントは、TaskMaster APIの全エンドポイントをテストするための包括的な実装方針を定義します。

## 目次
1. [テスト構造の概要](#テスト構造の概要)
2. [テストのカテゴリー分類](#テストのカテゴリー分類)
3. [共通のテストパターン](#共通のテストパターン)
4. [モック戦略](#モック戦略)
5. [テストデータ管理](#テストデータ管理)
6. [各APIエンドポイントのテスト要件](#各apiエンドポイントのテスト要件)
7. [実装手順](#実装手順)

## テスト構造の概要

### ディレクトリ構造
```
tests/api/
├── unit/           # 個別のルートハンドラーのユニットテスト
├── integration/    # ルート間の統合テスト
├── e2e/           # エンドツーエンドテスト
├── fixtures/      # テストデータ
├── helpers/       # テストヘルパー関数
└── API_TEST_IMPLEMENTATION_GUIDE.md (このファイル)
```

### ファイル命名規則
- ユニットテスト: `{route-name}.test.js` (例: `tasks.test.js`)
- 統合テスト: `{feature-name}.integration.test.js` (例: `task-dependencies.integration.test.js`)
- E2Eテスト: `{flow-name}.e2e.test.js` (例: `project-lifecycle.e2e.test.js`)

## テストのカテゴリー分類

### 1. ユニットテスト
各APIルートハンドラーの個別機能をテスト
- HTTPリクエスト/レスポンスの検証
- バリデーションロジック
- エラーハンドリング
- 個別のビジネスロジック

### 2. 統合テスト
複数のコンポーネント間の連携をテスト
- 依存関係の管理
- タスクとサブタスクの関係
- プロジェクト初期化フロー
- データの一貫性

### 3. E2Eテスト
実際のユーザーシナリオをテスト
- PRDからタスク生成までの完全なフロー
- タスクの作成→展開→完了のライフサイクル
- 複雑な依存関係の解決

## 共通のテストパターン

### 基本的なテスト構造
```javascript
import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../api/server.js';

// モックのセットアップ
jest.mock('../../mcp-server/src/core/direct-functions/list-tasks.js');
jest.mock('../../api/utils/logger.js');

// テストデータのインポート
import { mockTasks, mockProject } from '../fixtures/api-test-data.js';

describe('API Route: /api/v1/tasks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 環境変数のセットアップ
    process.env.PROJECT_NAME = 'test-project';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/v1/tasks', () => {
    test('正常系: タスクリストを取得', async () => {
      // Arrange
      const mockResponse = { success: true, data: mockTasks };
      listTasksDirect.mockResolvedValue(mockResponse);

      // Act
      const response = await request(app)
        .get('/api/v1/tasks')
        .expect('Content-Type', /json/)
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        success: true,
        data: mockTasks
      });
      expect(listTasksDirect).toHaveBeenCalledWith(
        expect.any(String),
        undefined,
        'list'
      );
    });

    test('異常系: エラーハンドリング', async () => {
      // Arrange
      listTasksDirect.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      const response = await request(app)
        .get('/api/v1/tasks')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR',
          message: expect.any(String)
        })
      });
    });
  });
});
```

### 共通のアサーションパターン
```javascript
// レスポンス構造の検証
expect(response.body).toMatchObject({
  success: true,
  data: expect.any(Object)
});

// エラーレスポンスの検証
expect(response.body).toMatchObject({
  success: false,
  error: {
    code: expect.any(String),
    message: expect.any(String),
    details: expect.any(Object) // オプション
  }
});

// 関数呼び出しの検証
expect(mockFunction).toHaveBeenCalledWith(
  expect.stringContaining('projects'),
  expect.objectContaining({ id: 'task_001' })
);
```

## モック戦略

### 1. Direct Functions のモック
```javascript
// すべてのDirect関数をモック
jest.mock('../../mcp-server/src/core/direct-functions/add-task.js', () => ({
  addTaskDirect: jest.fn()
}));
```

### 2. ファイルシステムのモック
```javascript
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn(),
  access: jest.fn()
}));
```

### 3. AI サービスのモック
```javascript
jest.mock('../../scripts/modules/ai-services-unified.js', () => ({
  default: {
    callAI: jest.fn().mockResolvedValue({
      choices: [{ message: { content: 'Mocked AI response' } }]
    })
  }
}));
```

### 4. ロガーのモック（常に適用）
```javascript
jest.mock('../../api/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));
```

## テストデータ管理

### fixtures/api-test-data.js
```javascript
export const mockTasks = [
  {
    id: 'task_001',
    title: 'Setup project structure',
    description: 'Initial project setup',
    status: 'pending',
    priority: 'high',
    dependencies: [],
    subtasks: []
  },
  // ... more tasks
];

export const mockProject = {
  name: 'test-project',
  path: '/projects/test-project',
  config: {
    aiProvider: 'anthropic',
    template: 'basic'
  }
};

export const mockPRD = `
# Product Requirements Document
## Overview
Test PRD content for automated task generation...
`;

export const createMockTask = (overrides = {}) => ({
  id: `task_${Date.now()}`,
  title: 'Default Task',
  description: 'Default description',
  status: 'pending',
  priority: 'medium',
  dependencies: [],
  subtasks: [],
  ...overrides
});
```

## 各APIエンドポイントのテスト要件

### 1. タスク管理 (/api/v1/tasks)
#### GET /api/v1/tasks
- [ ] 全タスクの取得（フィルターなし）
- [ ] ステータスでのフィルタリング
- [ ] フォーマット指定（list/detailed）
- [ ] 空のタスクリストの処理
- [ ] 無効なフィルターのエラーハンドリング

#### GET /api/v1/tasks/:id
- [ ] 存在するタスクの取得
- [ ] 存在しないタスクでの404エラー
- [ ] 無効なタスクIDでのバリデーションエラー

#### POST /api/v1/tasks
- [ ] 必須フィールドのみでのタスク作成
- [ ] 全フィールド指定でのタスク作成
- [ ] バリデーションエラー（タイトル欠如）
- [ ] 優先度の妥当性検証
- [ ] 依存関係の妥当性検証

#### PUT /api/v1/tasks/:id
- [ ] 部分更新の成功
- [ ] 全フィールド更新の成功
- [ ] 存在しないタスクでの404エラー
- [ ] 無効なステータス遷移の防止
- [ ] 循環依存の検出

#### DELETE /api/v1/tasks/:id
- [ ] タスクの正常削除
- [ ] 関連ファイルの削除確認
- [ ] 存在しないタスクでの404エラー
- [ ] 依存されているタスクの削除制限

#### PATCH /api/v1/tasks/:id/status
- [ ] 有効なステータス変更
- [ ] 無効なステータス値でのエラー
- [ ] 依存関係によるブロック状態の確認

### 2. タスク生成 (/api/v1/generate-tasks-from-prd)
- [ ] 正常なPRDからのタスク生成
- [ ] タスク数の指定（1-100の範囲）
- [ ] リサーチモードの有効/無効
- [ ] 空のPRDでのエラー
- [ ] 範囲外のタスク数でのバリデーションエラー
- [ ] AI呼び出しの失敗処理

### 3. タスク展開 (/api/v1/tasks/:id/expand)
- [ ] 単一タスクの展開
- [ ] サブタスク数の指定
- [ ] リサーチモードの適用
- [ ] 既に展開済みタスクの処理
- [ ] 無効なタスクIDでのエラー
- [ ] AI呼び出しの失敗処理

### 4. サブタスク管理
#### POST /api/v1/tasks/:id/subtasks
- [ ] サブタスクの追加
- [ ] 必須フィールドの検証
- [ ] 親タスクの存在確認

#### PUT /api/v1/tasks/:id/subtasks/:subtaskId
- [ ] サブタスクの更新
- [ ] 存在確認
- [ ] 部分更新のサポート

#### DELETE /api/v1/tasks/:id/subtasks/:subtaskId
- [ ] サブタスクの削除
- [ ] カスケード削除の確認

### 5. 依存関係管理
#### POST /api/v1/tasks/:id/dependencies
- [ ] 依存関係の追加
- [ ] 循環依存の検出
- [ ] 自己参照の防止

#### DELETE /api/v1/tasks/:id/dependencies/:depId
- [ ] 依存関係の削除
- [ ] 存在確認

#### POST /api/v1/tasks/validate-dependencies
- [ ] 全体の依存関係検証
- [ ] 問題の詳細レポート
- [ ] 自動修正オプション

### 6. プロジェクト管理
#### POST /api/v1/projects/initialize
- [ ] 新規プロジェクトの作成
- [ ] テンプレートの適用
- [ ] 既存プロジェクトの処理
- [ ] Rooファイルの生成オプション

#### POST /api/v1/projects/generate-task-files
- [ ] タスクファイルの生成
- [ ] 既存ファイルの上書き確認
- [ ] エラー処理

### 7. 分析機能
#### GET /api/v1/tasks/next
- [ ] 次のタスクの推奨
- [ ] 依存関係の考慮
- [ ] 優先度の考慮

#### POST /api/v1/tasks/analyze-complexity
- [ ] 複雑度分析の実行
- [ ] スコアとファクターの返却
- [ ] 推奨事項の生成

#### GET /api/v1/tasks/complexity-report
- [ ] 全体レポートの生成
- [ ] 高複雑度タスクの特定
- [ ] 統計情報の計算

## 実装手順

### フェーズ1: 基盤整備
1. **テストヘルパーの作成**
   ```javascript
   // tests/api/helpers/test-utils.js
   export const createTestApp = () => {
     // テスト用のExpressアプリケーション設定
   };

   export const authenticatedRequest = (app) => {
     // 認証付きリクエストのヘルパー
   };

   export const expectErrorResponse = (response, code, statusCode = 500) => {
     expect(response.status).toBe(statusCode);
     expect(response.body.success).toBe(false);
     expect(response.body.error.code).toBe(code);
   };
   ```

2. **共通フィクスチャの作成**
   - `fixtures/api-test-data.js`: 基本的なテストデータ
   - `fixtures/large-datasets.js`: パフォーマンステスト用データ
   - `fixtures/edge-cases.js`: エッジケース用データ

### フェーズ2: ユニットテストの実装
1. **基本的なCRUD操作のテスト**
   - tasks.test.js
   - subtasks.test.js
   - dependencies.test.js

2. **複雑な機能のテスト**
   - generate-tasks.test.js
   - task-expansion.test.js
   - analysis.test.js

3. **プロジェクト管理のテスト**
   - projects.test.js

### フェーズ3: 統合テストの実装
1. **タスクライフサイクルテスト**
   - タスク作成→展開→完了のフロー
   - 依存関係の解決フロー

2. **プロジェクト初期化フロー**
   - PRD→タスク生成→ファイル作成

### フェーズ4: E2Eテストの実装
1. **完全なユーザーシナリオ**
   - プロジェクト開始から完了まで
   - エラーリカバリーシナリオ

### フェーズ5: パフォーマンステスト
1. **大規模データセットでのテスト**
   - 1000タスクの処理
   - 複雑な依存関係グラフ

2. **同時実行テスト**
   - 並行リクエストの処理
   - リソース競合の回避

## テスト実行コマンド

```bash
# すべてのAPIテストを実行
npm test tests/api

# ユニットテストのみ
npm test tests/api/unit

# 統合テストのみ
npm test tests/api/integration

# E2Eテストのみ
npm test tests/api/e2e

# 特定のエンドポイントのテスト
npm test tests/api/unit/tasks.test.js

# カバレッジレポート付き
npm run test:coverage -- tests/api

# ウォッチモードで開発
npm run test:watch -- tests/api
```

## テストカバレッジ目標

- 全体カバレッジ: 80%以上
- 重要なビジネスロジック: 90%以上
- エラーハンドリング: 100%

## 注意事項

1. **モックの使用**
   - 外部依存はすべてモック化
   - ファイルシステムへの実際の書き込みは避ける
   - AI APIへの実際の呼び出しは避ける

2. **テストの独立性**
   - 各テストは他のテストに依存しない
   - テスト順序に依存しない
   - グローバル状態を変更しない

3. **パフォーマンス**
   - 各テストは1秒以内に完了
   - 不要なsetTimeoutは使用しない
   - 並列実行可能な設計

4. **メンテナンス性**
   - DRY原則の適用
   - 明確なテスト名
   - 適切なコメント

## 更新履歴

- 2024-XX-XX: 初版作成
- 今後の更新はここに記録