# 実装タスク一覧（AI開発用プロンプト付き）

## フェーズ1: 基礎実装（2-3週間）

### TASK-001: プロジェクト一覧コンポーネントの実装

**説明**: Notion風の展開可能なプロジェクト一覧UIを実装する

**AIプロンプト**:
```
Next.js 15のApp Routerを使用して、Notion風のプロジェクト一覧コンポーネントを実装してください。

要件:
1. プロジェクトごとに展開/折りたたみ可能なグループ表示
2. 各プロジェクトに表示する情報:
   - プロジェクトアイコン（絵文字）
   - プロジェクト名
   - タスク数
   - 右端に3点メニュー（hover時のみ表示）
3. 展開時はそのプロジェクトのタスク一覧を表示
4. Tailwind CSSを使用したスタイリング
5. TypeScriptで型安全な実装

実装ファイル:
- components/dashboard/ProjectList.tsx
- components/dashboard/ProjectItem.tsx
- types/project.ts

参考にするべき既存コード:
- frontend/task-master-ui/lib/api.ts（API型定義）
- frontend/task-master-ui/components/ui/（UIコンポーネント）

パフォーマンス要件:
- React.memoを使用してプロジェクトアイテムを最適化
- 展開状態はローカルステートで管理
```

**依存関係**: なし

---

### TASK-002: タスクテーブルコンポーネントの実装

**説明**: 階層構造対応のタスクテーブルを実装する

**AIプロンプト**:
```
階層構造（親タスク・サブタスク）に対応したタスクテーブルコンポーネントを実装してください。

要件:
1. タスクの表示列:
   - 展開/折りたたみアイコン（サブタスクがある場合）
   - チェックボックス
   - タスク名（クリック可能）
   - ステータスバッジ
   - 担当者アバター
   - 期限
   - 3点メニュー（hover時）
2. サブタスクは親タスクよりインデントして表示
3. ドラッグ&ドロップによる並び替え対応（将来実装用のフック設置）
4. バッチ選択機能（チェックボックス）

実装ファイル:
- components/dashboard/TaskTable.tsx
- components/dashboard/TaskRow.tsx
- components/dashboard/SubtaskRow.tsx
- hooks/useTaskSelection.ts

UI要件:
- ホバー時に背景色をgray-50に変更
- 期限切れタスクは赤文字で表示
- ステータスごとに異なる色のバッジ

アクセシビリティ:
- キーボードナビゲーション対応
- 適切なaria-label設定
```

**依存関係**: TASK-001

---

### TASK-003: サイドパネルコンポーネントの実装

**説明**: タスク詳細表示用のスライドインサイドパネルを実装する

**AIプロンプト**:
```
タスク詳細を表示するスライドインサイドパネルを実装してください。

要件:
1. アニメーション仕様:
   - 右からスライドイン（300ms ease-out）
   - オーバーレイ背景（半透明黒）
   - ESCキーまたは外側クリックで閉じる
2. レイアウト:
   - 幅640px固定
   - ヘッダー部にタスク名と閉じるボタン
   - 2カラムレイアウト（メイン情報/メタ情報）
3. 含める機能:
   - インライン編集可能なタスク名
   - リッチテキストエディタ（説明欄）
   - サブタスク管理UI
   - コメントセクション
   - 担当者選択
   - 期限設定
   - 依存関係管理

実装ファイル:
- components/task-detail/TaskDetailPanel.tsx
- components/task-detail/TaskDetailHeader.tsx
- components/task-detail/TaskDetailContent.tsx
- components/task-detail/TaskDetailSidebar.tsx
- hooks/useTaskDetail.ts

状態管理:
- タスクの更新はオプティミスティックUIで実装
- APIコール中はローディング表示
- エラー時は適切なエラーメッセージ表示

ライブラリ:
- Radix UIのDialogコンポーネントをベースに実装
- アニメーションはframer-motionを使用
```

**依存関係**: TASK-002

---

### TASK-004: 検索・フィルタリング機能の実装

**説明**: グローバル検索とフィルタリング機能を実装する

**AIプロンプト**:
```
プロジェクト・タスクの検索とフィルタリング機能を実装してください。

要件:
1. 検索機能:
   - リアルタイム検索（デバウンス300ms）
   - プロジェクト名、タスク名、説明を対象
   - 検索結果のハイライト表示
   - 検索ボックスは常に表示

2. フィルタリング機能:
   - ドロップダウンメニューで複数条件選択
   - フィルタ条件:
     * 担当者（複数選択可）
     * ステータス（複数選択可）
     * 期限（今日/今週/今月/期限切れ）
     * 優先度
   - アクティブなフィルタ数をバッジで表示

実装ファイル:
- components/dashboard/SearchBar.tsx
- components/dashboard/FilterDropdown.tsx
- hooks/useSearch.ts
- hooks/useFilter.ts
- utils/searchUtils.ts

パフォーマンス最適化:
- useMemoで検索結果をキャッシュ
- 仮想スクロールで大量データに対応
- Web Workerでの検索処理（オプション）

状態管理:
- URLクエリパラメータと同期
- ブラウザバックで前の検索状態に戻れる
```

**依存関係**: TASK-001, TASK-002

---

## フェーズ2: 機能拡張（2週間）

### TASK-005: ビュー切り替えタブの実装

**説明**: リスト/ボード/ガント/カレンダービューの切り替えUIを実装する

**AIプロンプト**:
```
Notion風のビュー切り替えタブUIを実装してください。

要件:
1. タブデザイン:
   - マテリアルデザイン風のタブUI
   - アクティブタブにアンダーラインとハイライト
   - 未実装ビューはグレーアウト表示
2. 初期実装:
   - リストビューのみ機能
   - 他のビューは「Coming Soon」表示
3. 状態管理:
   - 選択したビューをローカルストレージに保存
   - プロジェクトごとに最後に選択したビューを記憶

実装ファイル:
- components/dashboard/ViewTabs.tsx
- components/views/ListView.tsx
- components/views/BoardView.tsx（スタブ）
- components/views/GanttView.tsx（スタブ）
- components/views/CalendarView.tsx（スタブ）
- hooks/useViewPreference.ts

アニメーション:
- タブ切り替え時にフェードイン/アウト
- アンダーラインの移動アニメーション
```

**依存関係**: TASK-001, TASK-002

---

### TASK-006: サブタスク管理機能の強化

**説明**: サブタスクの追加・編集・削除機能を実装する

**AIプロンプト**:
```
サブタスク管理機能を強化し、インラインでの追加・編集を可能にしてください。

要件:
1. サブタスク追加:
   - 「+ サブタスクを追加」ボタン
   - Enterキーで連続追加可能
   - AIによるサブタスク自動生成オプション
2. サブタスク編集:
   - タスク名のインライン編集
   - 担当者と期限の簡易設定
   - ドラッグ&ドロップで順序変更
3. UI/UX:
   - チェックボックス付きリスト形式
   - 完了したサブタスクは自動的に下部に移動
   - プログレスバーで完了率を表示

実装ファイル:
- components/task-detail/SubtaskManager.tsx
- components/task-detail/SubtaskItem.tsx
- components/task-detail/SubtaskProgress.tsx
- hooks/useSubtasks.ts

AI統合:
- 「AIでサブタスクを生成」ボタン
- 生成されたサブタスクのプレビューと編集
- /api/v1/tasks/:id/expand エンドポイントを使用
```

**依存関係**: TASK-003

---

### TASK-007: 依存関係管理UIの実装

**説明**: タスク間の依存関係を視覚的に管理するUIを実装する

**AIプロンプト**:
```
タスクの依存関係を管理するUIコンポーネントを実装してください。

要件:
1. 依存関係の表示:
   - 「ブロックしているタスク」セクション
   - 「ブロックされているタスク」セクション
   - 各タスクはクリック可能なリンク
2. 依存関係の追加:
   - 「+ 依存関係を追加」ボタン
   - タスク検索モーダル
   - 循環依存のチェックと警告
3. 視覚的表現:
   - 矢印アイコンで関係性を表現
   - 依存関係があるタスクは特別なバッジ表示

実装ファイル:
- components/task-detail/DependencyManager.tsx
- components/task-detail/DependencyItem.tsx
- components/modals/TaskSearchModal.tsx
- hooks/useDependencies.ts

API統合:
- POST /api/v1/tasks/:id/dependencies
- DELETE /api/v1/tasks/:id/dependencies/:dependencyId
- POST /api/v1/tasks/validate-dependencies

エラーハンドリング:
- 循環依存検出時の警告表示
- 削除時の確認ダイアログ
```

**依存関係**: TASK-003

---

### TASK-008: バッチ操作機能の実装

**説明**: 複数タスクの一括操作機能を実装する

**AIプロンプト**:
```
複数タスクを選択して一括操作する機能を実装してください。

要件:
1. 選択機能:
   - 各行のチェックボックス
   - ヘッダーの全選択チェックボックス
   - Shift+クリックで範囲選択
2. バッチ操作バー:
   - 選択したタスク数を表示
   - 操作ボタン:
     * ステータス一括変更
     * 担当者一括変更
     * 一括削除
     * 選択解除
3. UI/UX:
   - 選択時に固定フローティングバー表示
   - アニメーション付きの表示/非表示
   - 操作実行時のプログレス表示

実装ファイル:
- components/dashboard/BatchActionBar.tsx
- components/dashboard/TaskSelectionProvider.tsx
- hooks/useBatchOperations.ts
- utils/selectionUtils.ts

API統合:
- POST /api/v1/tasks/batch-update
- 楽観的更新でUXを改善
- エラー時のロールバック処理
```

**依存関係**: TASK-002

---

## フェーズ3: 高度な機能（1-2週間）

### TASK-009: ドラッグ&ドロップの実装

**説明**: タスクの並び替えとプロジェクト間移動を実装する

**AIプロンプト**:
```
@dnd-kit/sortableを使用してドラッグ&ドロップ機能を実装してください。

要件:
1. ドラッグ可能な要素:
   - タスク（プロジェクト内での並び替え）
   - タスク（プロジェクト間での移動）
   - サブタスク（親タスク内での並び替え）
2. 視覚的フィードバック:
   - ドラッグ中の要素の半透明化
   - ドロップ可能エリアのハイライト
   - ドラッグプレビューの表示
3. 制約:
   - サブタスクは他のタスクの子にできない
   - 依存関係がある場合の警告

実装ファイル:
- components/dashboard/DraggableTaskList.tsx
- components/dashboard/DraggableTaskItem.tsx
- hooks/useDragAndDrop.ts
- utils/dndUtils.ts

パフォーマンス:
- 仮想化リストでの実装
- スムーズなアニメーション（60fps維持）
- 大量アイテムでの最適化
```

**依存関係**: TASK-002

---

### TASK-010: パフォーマンス最適化

**説明**: 大量データでのパフォーマンスを最適化する

**AIプロンプト**:
```
1000以上のタスクでもスムーズに動作するよう最適化してください。

要件:
1. 仮想スクロール:
   - @tanstack/react-virtualの導入
   - 可視領域のみレンダリング
   - スムーズなスクロール体験
2. データフェッチング最適化:
   - React Query (TanStack Query)の導入
   - 無限スクロール実装
   - キャッシュ戦略の実装
3. レンダリング最適化:
   - React.memoの適切な使用
   - useMemo/useCallbackの最適化
   - 不要な再レンダリング防止

実装ファイル:
- components/dashboard/VirtualTaskList.tsx
- hooks/useInfiniteProjects.ts
- hooks/useOptimizedTasks.ts
- utils/performanceUtils.ts

計測と監視:
- React DevToolsでのプロファイリング
- Web Vitalsの計測
- パフォーマンスバジェットの設定
```

**依存関係**: 全タスク

---

### TASK-011: エラーハンドリングとローディング状態

**説明**: 包括的なエラーハンドリングとローディング状態を実装する

**AIプロンプト**:
```
ユーザーフレンドリーなエラーハンドリングとローディング状態を実装してください。

要件:
1. ローディング状態:
   - スケルトンスクリーン
   - プログレスインジケーター
   - 操作ごとの部分的ローディング
2. エラーハンドリング:
   - エラーバウンダリの実装
   - トースト通知
   - リトライ機能
   - オフライン対応
3. エラーメッセージ:
   - ユーザーフレンドリーな日本語メッセージ
   - 具体的な対処法の提示
   - サポート連絡先の表示

実装ファイル:
- components/common/ErrorBoundary.tsx
- components/common/SkeletonLoader.tsx
- components/common/ErrorMessage.tsx
- hooks/useErrorHandler.ts
- providers/ToastProvider.tsx

デザイン:
- エラーは赤系統で統一
- 成功は緑系統で統一
- 警告は黄系統で統一
```

**依存関係**: 全タスク

---

## フェーズ4: 統合とテスト（1週間）

### TASK-012: 統合テストとE2Eテスト

**説明**: 全機能の統合テストとE2Eテストを実装する

**AIプロンプト**:
```
Playwrightを使用してE2Eテストを実装してください。

テストケース:
1. 基本フロー:
   - プロジェクト作成から完了まで
   - タスクの作成・編集・削除
   - サブタスク管理
2. 高度な機能:
   - 検索とフィルタリング
   - バッチ操作
   - ドラッグ&ドロップ
3. エラーケース:
   - ネットワークエラー
   - 権限エラー
   - バリデーションエラー

実装ファイル:
- tests/e2e/dashboard.spec.ts
- tests/e2e/task-management.spec.ts
- tests/e2e/search-filter.spec.ts
- tests/fixtures/testData.ts

CI/CD統合:
- GitHub Actionsでの自動実行
- ビジュアルリグレッションテスト
- パフォーマンステスト
```

**依存関係**: 全タスク

---

## 実装優先順位

1. **必須（MVP）**: TASK-001, TASK-002, TASK-003
2. **高**: TASK-004, TASK-006, TASK-011
3. **中**: TASK-005, TASK-007, TASK-008
4. **低**: TASK-009, TASK-010, TASK-012

## 技術スタック補足

- **フレームワーク**: Next.js 15.3.3 (App Router)
- **言語**: TypeScript 5.x
- **スタイリング**: Tailwind CSS v4
- **UIライブラリ**: Radix UI
- **状態管理**: React Hooks + Context API（必要に応じてZustand）
- **データフェッチング**: TanStack Query（Phase 3で導入）
- **アニメーション**: Framer Motion
- **テスト**: Jest + React Testing Library + Playwright