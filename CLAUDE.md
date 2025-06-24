# Claude Code 開発ガイドライン

## PR作成・mainブランチへのプッシュ前チェックリスト

### 1. コードフォーマット確認

#### Prettierチェック
```bash
# フロントエンドディレクトリで実行
cd frontend/task-master-ui
npx prettier --check .

# フォーマットエラーがある場合は修正
npx prettier --write .
```

#### よくあるフォーマットエラー
- インデント（タブ vs スペース）
- 末尾のカンマ
- セミコロンの有無
- 改行コード

### 2. ビルド確認

#### ローカルビルドテスト
```bash
# フロントエンド
cd frontend/task-master-ui
npm run build

# バックエンド
cd ../../api
npm test
```

#### よくあるビルドエラーと対処法

**TypeScriptエラー**
- 型定義の不整合
- 未使用の変数
- インポートエラー

**Next.jsエラー**
- 動的インポートの問題
- サーバーサイド/クライアントサイドの区別
- 環境変数の参照

### 3. 環境変数の確認

#### 必須環境変数（フロントエンド）
```bash
# .env.local または Vercel環境変数に設定必要
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=https://your-api-url.com
```

#### 環境変数関連の注意点
- `NEXT_PUBLIC_`プレフィックスが必要（クライアントサイドで使用する場合）
- ビルド時に環境変数が必要な場合は、条件付き初期化を実装
- Supabaseクライアントは`typeof window !== 'undefined'`でチェック

### 4. 依存関係の確認

```bash
# package-lock.jsonの更新確認
npm install

# 脆弱性チェック
npm audit

# 不要な依存関係の確認
npm ls
```

### 5. テスト実行

```bash
# フロントエンドテスト
cd frontend/task-master-ui
npm test

# バックエンドテスト
cd ../../api
npm test
```

### 6. Git操作のベストプラクティス

#### コミット前の確認
```bash
# 変更内容の確認
git status
git diff --staged

# 部分的なステージング（関連する変更をグループ化）
git add -p
```

#### コミットメッセージ規約
```
<type>(<scope>): <subject>

<body>

<footer>
```

**type例**
- feat: 新機能
- fix: バグ修正
- docs: ドキュメント
- style: フォーマット修正
- refactor: リファクタリング
- test: テスト追加・修正
- chore: ビルドプロセスやツールの変更

### 7. GitHub Actions対策

#### format-checkアクション対策
1. 必ずPrettierを実行してからコミット
2. `.prettierrc`の設定を確認
3. `.prettierignore`で除外ファイルを管理

#### ビルドアクション対策
1. ローカルで`npm run build`が成功することを確認
2. 環境変数のモック化（必要に応じて）
3. 型エラーがないことを確認

### 8. Vercelデプロイ対策

#### ビルド前チェック
```bash
# Vercel CLIでのビルドテスト（オプション）
vercel build
```

#### よくあるVercelエラー
1. **環境変数エラー**
   - Vercelプロジェクト設定で環境変数を追加
   - ビルド時のみ必要な変数は条件付きで参照

2. **動的インポートエラー**
   - `dynamic(() => import())`を使用
   - SSRを無効化: `{ ssr: false }`

3. **メモリエラー**
   - ビルドサイズの最適化
   - 不要な依存関係の削除

### 9. PR作成時のチェックリスト

- [ ] すべてのテストが通っている
- [ ] Prettierフォーマットが適用されている
- [ ] ビルドが成功する
- [ ] 環境変数のドキュメントが更新されている
- [ ] 破壊的変更がある場合は明記
- [ ] 関連するIssueがリンクされている

### 10. トラブルシューティング

#### CI/CDが失敗した場合
1. エラーログを詳細に確認
2. ローカルで同じコマンドを実行して再現
3. 環境差異を考慮（Node.jsバージョン、OS等）

#### 緊急時の対応
```bash
# 直前のコミットを取り消す（プッシュ前）
git reset --soft HEAD~1

# プッシュ済みの場合（履歴は残る）
git revert HEAD
git push
```

## 開発フロー推奨手順

1. 機能開発・バグ修正を実施
2. ローカルテストを実行
3. Prettierでフォーマット
4. ビルド確認
5. コミット（意味のある単位で）
6. プッシュ前に最終確認
7. PR作成
8. CI/CD結果を確認
9. 必要に応じて修正

この手順に従うことで、スムーズなデプロイとマージが可能になります。