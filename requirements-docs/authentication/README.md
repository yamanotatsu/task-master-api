# Task Master 認証・組織管理システム ドキュメント

このディレクトリには、Task Masterアプリケーションの認証・組織管理システムに関する詳細なドキュメントが含まれています。

## ドキュメント一覧

1. **[01-authentication-overview.md](./01-authentication-overview.md)**
   - システム概要とアーキテクチャ
   - 認証フローの詳細
   - 技術スタックの説明

2. **[02-database-schema.md](./02-database-schema.md)**
   - データベーススキーマ設計
   - RLS（Row Level Security）ポリシー
   - マイグレーション計画

3. **[03-api-endpoints.md](./03-api-endpoints.md)**
   - APIエンドポイントの詳細仕様
   - リクエスト/レスポンス形式
   - エラーハンドリング

4. **[04-frontend-integration.md](./04-frontend-integration.md)**
   - フロントエンド統合ガイド
   - React/Next.jsコンポーネント実装
   - 状態管理とルーティング

5. **[05-security-guidelines.md](./05-security-guidelines.md)**
   - セキュリティベストプラクティス
   - 実装ガイドライン
   - 監査チェックリスト

6. **[06-test-plan.md](./06-test-plan.md)**
   - テスト計画と戦略
   - ユニット/統合/E2Eテスト
   - テストシナリオ

7. **[TASKS-authentication.md](./TASKS-authentication.md)**
   - AI向けタスク分解
   - 実装フェーズとプロンプト
   - 作業見積もり

## 実装フェーズ

### Phase 1: データベース基盤（3日）
- Supabaseスキーマ設計と実装
- RLSポリシーの設定
- 既存データの移行計画

### Phase 2: バックエンドAPI実装（5日）
- 認証エンドポイント
- 組織管理エンドポイント
- ミドルウェアとRBAC

### Phase 3: フロントエンド実装（4日）
- 認証コンポーネント
- 保護されたルート
- 組織管理UI

### Phase 4: 招待システムとメンバー管理（3日）
- 招待フロー実装
- メンバー管理機能
- 通知システム基盤

### Phase 5: テストとドキュメント（2.5日）
- 統合テスト
- セキュリティ監査
- 最終ドキュメント更新

## 開始方法

1. まず[01-authentication-overview.md](./01-authentication-overview.md)を読んでシステム全体を理解してください
2. [TASKS-authentication.md](./TASKS-authentication.md)でタスクの詳細と実装順序を確認してください
3. 各フェーズのタスクを順番に実装してください

## 重要な注意事項

- **セキュリティファースト**: すべての実装でセキュリティを最優先に考慮してください
- **後方互換性**: 既存のAPIとの互換性を維持してください
- **段階的実装**: 各フェーズを完了してから次に進んでください
- **テスト駆動**: 各機能の実装前にテストを書いてください