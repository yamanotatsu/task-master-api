# Claude Code 開発ガイド

このドキュメントは、Claude Codeを使用してTask Master APIプロジェクトを開発する際の包括的なガイドです。

## プロジェクト概要

Task Master APIは、AI駆動型のタスク管理システムです。詳細については以下のドキュメントを参照してください：

- **[プロジェクト概要](./project.md)** - プロジェクトの目的、主要機能、技術スタック、開発環境の要件
- **[アーキテクチャ設計](./architecture.md)** - システム構成、コンポーネント設計、データフロー、設計原則
- **[API仕様](./api.md)** - RESTful APIの詳細な仕様、エンドポイント、リクエスト/レスポンス形式
- **[データベース設計](./database.md)** - ファイルベースストレージの構造、スキーマ定義、データアクセスパターン
- **[依存関係](./dependencies.md)** - 使用ライブラリ、バージョン情報、設定方法

## Claude Code 使用時の重要な指示

### 1. コード規約の遵守

このプロジェクトでは以下のコーディング規約を遵守してください：

```javascript
// ✅ 良い例: async/awaitを使用
async function createTask(taskData) {
  const validated = validateTaskData(taskData);
  const task = await taskService.create(validated);
  return task;
}

// ❌ 悪い例: コールバックの使用
function createTask(taskData, callback) {
  validateTaskData(taskData, (err, validated) => {
    if (err) return callback(err);
    taskService.create(validated, callback);
  });
}
```

### 2. エラーハンドリング

すべてのエラーは適切にハンドリングし、ユーザーフレンドリーなメッセージを返すこと：

```javascript
try {
  const result = await riskyOperation();
  return { success: true, data: result };
} catch (error) {
  logger.error('Operation failed:', error);
  return {
    success: false,
    error: {
      code: 'OPERATION_FAILED',
      message: 'ユーザー向けのエラーメッセージ'
    }
  };
}
```

### 3. AIプロバイダーの使用

AI機能を実装する際は、統一されたインターフェースを使用すること：

```javascript
import { aiServiceManager } from './ai-service-manager.js';

// プロバイダーに依存しない実装
const response = await aiServiceManager.generateText({
  prompt: 'タスクを生成してください',
  model: 'claude-3-opus', // または設定から取得
  maxTokens: 1000
});
```

### 4. ファイル操作

ファイルベースストレージを操作する際の注意点：

- 必ずアトミックな書き込みを行う（一時ファイル経由）
- 読み込み前にファイルの存在を確認
- 適切なエラーハンドリング
- パストラバーサル攻撃への対策

### 5. テストの作成

新しい機能を追加する際は、必ず対応するテストを作成すること：

```javascript
describe('TaskManager', () => {
  it('should create a new task', async () => {
    const taskData = { title: 'Test Task' };
    const task = await taskManager.create(taskData);
    expect(task).toHaveProperty('id');
    expect(task.title).toBe('Test Task');
  });
});
```

## ドキュメントの更新

コードに変更を加えた際は、関連するドキュメントも必ず更新してください：

### APIエンドポイントの追加・変更
→ **[api.md](./api.md)** を更新

### データ構造の変更
→ **[database.md](./database.md)** を更新

### 新しい依存関係の追加
→ **[dependencies.md](./dependencies.md)** を更新

### アーキテクチャの変更
→ **[architecture.md](./architecture.md)** を更新

### 新機能の追加
→ **[project.md](./project.md)** の主要機能セクションを更新

## 開発フロー

### 1. 機能開発の手順

1. 要件を理解し、影響範囲を特定
2. 関連するドキュメントを確認
3. テストファーストで開発
4. 実装
5. ドキュメントの更新
6. コードレビュー

### 2. バグ修正の手順

1. バグを再現するテストを作成
2. バグを修正
3. 回帰テストを実行
4. 必要に応じてドキュメントを更新

### 3. リファクタリング

1. 既存のテストが通ることを確認
2. 小さな単位でリファクタリング
3. 各ステップでテストを実行
4. パフォーマンスへの影響を確認

## よくある質問と回答

### Q: 新しいAIプロバイダーを追加するには？

1. `src/ai-providers/` に新しいプロバイダーファイルを作成
2. 統一インターフェースを実装
3. `ai-service-manager.js` に登録
4. テストを追加
5. [dependencies.md](./dependencies.md) を更新

### Q: 新しいAPIエンドポイントを追加するには？

1. `api/routes/` に新しいルートファイルを作成
2. `api/server.js` でルートを登録
3. 適切なエラーハンドリングを実装
4. テストを追加
5. [api.md](./api.md) を更新

### Q: タスクのデータ構造を変更するには？

1. マイグレーション関数を作成
2. 既存データとの互換性を確保
3. バリデーションロジックを更新
4. テストを更新
5. [database.md](./database.md) を更新

## セキュリティガイドライン

1. **APIキーの管理**: 環境変数でのみ管理、コードにハードコードしない
2. **入力検証**: すべての入力データを検証
3. **エラー情報**: 本番環境では詳細なエラー情報を隠蔽
4. **ファイルアクセス**: パストラバーサル攻撃への対策を実装
5. **依存関係**: 定期的な脆弱性スキャンを実行

## パフォーマンス最適化

1. **キャッシング**: 頻繁にアクセスされるデータはメモリにキャッシュ
2. **非同期処理**: I/O操作は必ず非同期で実行
3. **バッチ処理**: 複数の操作はできる限りバッチ化
4. **適切なインデックス**: データ構造に応じた効率的なアクセスパターン

## トラブルシューティング

問題が発生した場合は、以下の順序で確認してください：

1. エラーログを確認
2. 環境変数が正しく設定されているか確認
3. 依存関係が正しくインストールされているか確認
4. テストを実行して問題を特定
5. 関連するドキュメントを参照

## 貢献ガイドライン

1. **コードスタイル**: Prettierの設定に従う
2. **コミットメッセージ**: Conventional Commitsに従う
3. **プルリクエスト**: 明確な説明とテストを含める
4. **ドキュメント**: 変更に応じてドキュメントを更新
5. **レビュー**: 他の開発者のレビューを受ける

---

このガイドは、プロジェクトの進化に合わせて定期的に更新されます。
最新の情報については、各個別のドキュメントを参照してください。