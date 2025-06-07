# Task Master 認証・組織管理システム 要件定義書

このディレクトリには、Task Master アプリケーションの認証・組織管理システムに関する詳細な要件定義書が含まれています。

## ドキュメント構成

1. **[01-authentication-overview.md](./01-authentication-overview.md)**
   - 認証システムの全体概要
   - ビジネス要件と技術的目標
   - システムアーキテクチャ

2. **[02-database-schema.md](./02-database-schema.md)**
   - データベーススキーマの詳細設計
   - テーブル定義とリレーション
   - RLS（Row Level Security）ポリシー

3. **[03-api-endpoints.md](./03-api-endpoints.md)**
   - APIエンドポイントの詳細仕様
   - リクエスト/レスポンスフォーマット
   - エラーハンドリング

4. **[04-frontend-integration.md](./04-frontend-integration.md)**
   - フロントエンド統合ガイド
   - 認証フローの実装
   - UIコンポーネント設計

5. **[05-security-guidelines.md](./05-security-guidelines.md)**
   - セキュリティ実装ガイドライン
   - ベストプラクティス
   - 脆弱性対策

6. **[TASKS-authentication.md](./TASKS-authentication.md)**
   - AI向けタスク分解
   - 実装タスクの詳細
   - 各タスクのプロンプト

## 実装フェーズ

### Phase 1: 基本認証機能
- ユーザー登録・ログイン
- JWT認証
- 基本的なRLS実装

### Phase 2: 組織管理
- 組織の作成・管理
- メンバー招待機能
- ロールベースアクセス制御

### Phase 3: 高度な機能
- ソーシャルログイン
- 二要素認証
- セッション管理の最適化

## 関連リソース

- [Supabase Auth ドキュメント](https://supabase.com/docs/guides/auth)
- [既存のプロジェクト要件定義書](../README.md)
- [フロントエンド設計仕様](../frontend-redesign/)