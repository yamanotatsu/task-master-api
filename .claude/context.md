# 現在のコンテキスト

このドキュメントは、Task Master AIプロジェクトの現在の開発状態と進行中の作業を記録します。

## 現在のブランチ

**`refactor/cleanup-unused-files`**

リファクタリングブランチで、使用されていないファイルのクリーンアップを行っています。

## 進行中の変更

### 削除されたファイル
以下のファイルが削除予定です：

#### APIドキュメント
- `api/POSTMAN_TESTING_GUIDE.md` - Postmanテストガイド（不要）

#### 依存性注入版のAPIルート
- `api/routes/analysis-di.js`
- `api/routes/dependencies-di.js`
- `api/routes/generate-tasks-di.js`
- `api/routes/subtasks-di.js`
- `api/routes/task-expansion-di.js`
- `api/routes/tasks-di.js`
- `api/server-di.js`
- `api/utils/dependency-factory.js`

これらのDI（依存性注入）実装は、テスト用に作成されましたが、現在は標準実装に統一されています。

#### テストファイル
- `mcp-test.js` - MCPテスト用ファイル
- `test-config-manager.js` - 設定マネージャーのテスト
- `test-version-check-full.js` - バージョンチェックのフルテスト
- `test-version-check.js` - バージョンチェックのテスト
- `scripts/test-claude-errors.js` - Claudeエラーテスト
- `scripts/test-claude.js` - Claudeテスト

#### その他
- `output.json` - 一時的な出力ファイル
- `projects/default/tasks.json.bak` - バックアップファイル
- `scripts/task-complexity-report.json` - 複雑度レポート

### 変更されたファイル
- `frontend/task-master-ui/.gitignore` - gitignore設定の更新
- `frontend/task-master-ui/package.json` - フロントエンド依存関係の更新

## 最近のコミット履歴

1. `3660482` - Merge pull request #28 from yamanotatsu/test/github-worktree
2. `3914ff6` - feat: Update AI services with improved error handling
3. `0b76219` - chore: Update taskmaster configuration
4. `ba17c07` - chore: Update .gitignore
5. `d5135a9` - chore: Update dependencies

## 開発の優先事項

### 高優先度
1. **コードクリーンアップ**: 使用されていないファイルの削除
2. **ドキュメント整備**: `.claude/`ディレクトリ構造の確立
3. **API統合**: DI版と標準版の統一

### 中優先度
1. **テストカバレッジ**: 80%目標の達成
2. **パフォーマンス最適化**: AI呼び出しのキャッシュ改善
3. **エラーハンドリング**: より詳細なエラーメッセージ

### 低優先度
1. **UI/UX改善**: フロントエンドの使いやすさ向上
2. **新機能追加**: ガントチャート表示機能
3. **国際化**: 多言語対応

## 技術的負債

### 要対応項目
1. **認証システム**: JWT認証の実装が未完了
2. **WebSocket**: リアルタイム通知機能の実装
3. **テスト**: E2Eテストのカバレッジ拡大
4. **型安全性**: TypeScript移行の検討

### リファクタリング候補
1. **AIサービス層**: プロバイダー固有ロジックの抽象化強化
2. **エラーハンドリング**: 統一されたエラー型の定義
3. **設定管理**: 環境別設定の改善

## 環境情報

- **作業ディレクトリ**: `/Users/yamanotatsuki/Desktop/taskmaster/claude-task-master`
- **プラットフォーム**: macOS Darwin 23.5.0
- **Node.js**: v20.18.0（推奨）
- **npm**: v10.x
- **現在の日付**: 2025年6月6日

## 次のステップ

1. **即時対応**
   - 削除予定ファイルのクリーンアップ完了
   - ブランチのmainへのマージ準備

2. **短期目標**（1-2週間）
   - テストカバレッジの向上
   - ドキュメントの更新と整理
   - パフォーマンスボトルネックの特定と改善

3. **中期目標**（1-2ヶ月）
   - 認証システムの実装
   - WebSocket統合
   - TypeScript移行の開始

## 注意事項

### 破壊的変更
- DI版APIの削除により、これらのエンドポイントに依存するテストは修正が必要

### 互換性
- Node.js v14.0.0以上が必要
- ES Modules使用のため、CommonJS環境では動作しない

### セキュリティ
- APIキーの環境変数管理を徹底
- 本番環境でのRow Level Security設定が必要

## コントリビューター向け情報

### ブランチ戦略
- `main`: 安定版
- `develop`: 開発版
- `feature/*`: 新機能開発
- `refactor/*`: リファクタリング
- `fix/*`: バグ修正

### コミット規約
- feat: 新機能
- fix: バグ修正
- docs: ドキュメント
- style: フォーマット
- refactor: リファクタリング
- test: テスト追加/修正
- chore: ビルドプロセスや補助ツール

### レビュープロセス
1. PRを作成
2. 自動テストの通過確認
3. コードレビュー（最低1名）
4. マージ

---

*このファイルは定期的に更新してください。特に大きな変更や新しい開発方針が決まった際は、必ず反映するようにしてください。*