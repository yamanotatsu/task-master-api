# UI/UX設計仕様書

## 1. デザイン原則

### 1.1 ビジュアルデザイン原則
- **クリーンでモダン**: 余白を効果的に使用し、視覚的なノイズを最小限に
- **階層の明確化**: インデント、色、サイズで情報の重要度を表現
- **一貫性**: Notionライクな親しみやすいインターフェース
- **アクセシビリティ**: 高コントラスト、適切なフォントサイズ

### 1.2 インタラクションデザイン原則
- **即時フィードバック**: すべての操作に視覚的な反応
- **非破壊的操作**: 取り消し可能、確認ダイアログの適切な使用
- **コンテキスト維持**: 画面遷移を最小限に、サイドパネルの活用
- **効率的な操作**: キーボードショートカット、バッチ操作

## 2. カラーパレット

```css
/* プライマリカラー */
--primary-blue: #0066CC;
--primary-blue-hover: #0052A3;
--primary-blue-light: #E6F0FF;

/* セカンダリカラー */
--secondary-gray: #6B7280;
--secondary-gray-light: #F3F4F6;

/* ステータスカラー */
--status-todo: #9CA3AF;      /* 未着手 */
--status-progress: #3B82F6;  /* 進行中 */
--status-review: #F59E0B;    /* レビュー中 */
--status-done: #10B981;      /* 完了 */

/* セマンティックカラー */
--danger: #EF4444;
--warning: #F59E0B;
--success: #10B981;
--info: #3B82F6;

/* 背景・ボーダー */
--bg-primary: #FFFFFF;
--bg-secondary: #F9FAFB;
--bg-tertiary: #F3F4F6;
--border-default: #E5E7EB;
--border-hover: #D1D5DB;
```

## 3. タイポグラフィ

```css
/* フォントファミリー */
--font-primary: 'Inter', 'Noto Sans JP', sans-serif;
--font-mono: 'JetBrains Mono', monospace;

/* フォントサイズ */
--text-xs: 12px;
--text-sm: 14px;
--text-base: 16px;
--text-lg: 18px;
--text-xl: 20px;
--text-2xl: 24px;

/* フォントウェイト */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;

/* 行間 */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

## 4. コンポーネント設計

### 4.1 統合ダッシュボード

#### レイアウト構造
```
┌─────────────────────────────────────────────────────┐
│ Header (固定, 64px)                                 │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │ Action Bar (56px)                               │ │
│ │ [+ 新規プロジェクト] [検索...] [フィルタ ▼]    │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ View Tabs                                       │ │
│ │ [リスト] [ボード] [ガント] [カレンダー]        │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Project List (スクロール可能)                   │ │
│ │ ▼ 🚀 プロジェクトA (15タスク)              ⋯  │ │
│ │   ├─ □ タスク1    進行中  @田中  12/25        │ │
│ │   ├─ ▶ タスク2    未着手  @山田  12/26        │ │
│ │   └─ □ タスク3    完了    @鈴木  12/24        │ │
│ │ ▶ 📊 プロジェクトB (8タスク)               ⋯  │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

#### コンポーネント詳細

**1. Action Bar**
- 高さ: 56px
- 背景: white
- 下ボーダー: 1px solid var(--border-default)
- パディング: 0 24px
- 要素配置: flexbox, align-items: center, gap: 16px

**2. 新規プロジェクトボタン**
```tsx
<button className="
  px-4 py-2 
  bg-primary-blue text-white 
  rounded-md 
  hover:bg-primary-blue-hover 
  transition-colors
  flex items-center gap-2
">
  <PlusIcon className="w-4 h-4" />
  新規プロジェクト
</button>
```

**3. 検索ボックス**
```tsx
<div className="
  relative flex-1 max-w-md
">
  <SearchIcon className="
    absolute left-3 top-1/2 -translate-y-1/2 
    w-4 h-4 text-gray-400
  " />
  <input
    type="text"
    placeholder="プロジェクトやタスクを検索..."
    className="
      w-full pl-10 pr-4 py-2
      border border-gray-300 rounded-md
      focus:outline-none focus:ring-2 focus:ring-primary-blue
    "
  />
</div>
```

### 4.2 プロジェクト/タスクリスト

#### プロジェクト行
```tsx
<div className="
  group
  px-4 py-3
  border-b border-gray-200
  hover:bg-gray-50
  cursor-pointer
  flex items-center gap-3
">
  <ChevronIcon className="
    w-4 h-4 text-gray-400
    transition-transform
    {isExpanded ? 'rotate-90' : ''}
  " />
  <span className="text-2xl">{project.icon}</span>
  <span className="font-semibold text-gray-900 flex-1">
    {project.name}
  </span>
  <span className="text-sm text-gray-500">
    {project.taskCount}タスク
  </span>
  <button className="
    opacity-0 group-hover:opacity-100
    p-1 rounded hover:bg-gray-200
    transition-opacity
  ">
    <MoreHorizontalIcon className="w-4 h-4" />
  </button>
</div>
```

#### タスク行
```tsx
<div className="
  group
  pl-12 pr-4 py-2
  hover:bg-gray-50
  flex items-center gap-3
  border-b border-gray-100
">
  {/* 展開アイコン（サブタスクがある場合） */}
  <div className="w-4">
    {task.subtasks.length > 0 && (
      <ChevronIcon className="w-4 h-4 text-gray-400" />
    )}
  </div>
  
  {/* チェックボックス */}
  <Checkbox 
    checked={task.completed}
    className="shrink-0"
  />
  
  {/* タスク名 */}
  <span className={`
    flex-1 text-gray-900
    ${task.completed ? 'line-through text-gray-500' : ''}
  `}>
    {task.name}
  </span>
  
  {/* ステータスバッジ */}
  <StatusBadge status={task.status} />
  
  {/* 担当者アバター */}
  <Avatar user={task.assignee} size="sm" />
  
  {/* 期限 */}
  <span className={`
    text-sm
    ${isOverdue ? 'text-red-500' : 'text-gray-500'}
  `}>
    {formatDate(task.dueDate)}
  </span>
  
  {/* アクションメニュー */}
  <button className="
    opacity-0 group-hover:opacity-100
    p-1 rounded hover:bg-gray-200
  ">
    <MoreHorizontalIcon className="w-4 h-4" />
  </button>
</div>
```

### 4.3 サイドパネル

#### アニメーション仕様
```css
/* オーバーレイ */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 40;
  animation: fadeIn 200ms ease-out;
}

/* パネル */
.side-panel {
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  width: 640px;
  background: white;
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.1);
  z-index: 50;
  animation: slideIn 300ms ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
```

#### パネル構造
```tsx
<div className="h-full flex flex-col">
  {/* ヘッダー */}
  <div className="
    px-6 py-4 
    border-b border-gray-200
    flex items-center justify-between
  ">
    <h2 className="text-xl font-semibold">
      {task.name}
    </h2>
    <button onClick={onClose}>
      <XIcon className="w-5 h-5" />
    </button>
  </div>
  
  {/* コンテンツ */}
  <div className="flex-1 overflow-y-auto">
    <div className="grid grid-cols-[1fr,300px]">
      {/* メインカラム */}
      <div className="p-6 border-r border-gray-200">
        {/* ステータス */}
        <StatusDropdown value={task.status} />
        
        {/* 説明 */}
        <RichTextEditor 
          value={task.description}
          className="mt-6"
        />
        
        {/* サブタスク */}
        <SubtaskList 
          tasks={task.subtasks}
          className="mt-6"
        />
        
        {/* コメント */}
        <CommentSection 
          comments={task.comments}
          className="mt-6"
        />
      </div>
      
      {/* サイドバー */}
      <div className="p-6 space-y-6">
        {/* 担当者 */}
        <AssigneeSelect value={task.assignee} />
        
        {/* 期限 */}
        <DatePicker value={task.dueDate} />
        
        {/* 依存関係 */}
        <DependencyManager 
          dependencies={task.dependencies}
        />
        
        {/* AI分析 */}
        <ComplexityAnalysis 
          score={task.complexity}
        />
      </div>
    </div>
  </div>
</div>
```

## 5. インタラクションパターン

### 5.1 ホバー効果
- 行ホバー: 背景色を`gray-50`に変更
- ボタンホバー: `opacity: 0 → 1`のトランジション
- リンクホバー: アンダーラインまたは色の変更

### 5.2 フォーカス状態
- インプット: `ring-2 ring-primary-blue`
- ボタン: `ring-2 ring-offset-2 ring-primary-blue`
- チェックボックス: `ring-2 ring-primary-blue`

### 5.3 ローディング状態
```tsx
// スケルトンローディング
<div className="animate-pulse">
  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
  <div className="h-4 bg-gray-200 rounded w-1/2" />
</div>

// スピナー
<div className="
  animate-spin 
  h-5 w-5 
  border-2 border-gray-300 
  border-t-primary-blue 
  rounded-full
" />
```

### 5.4 エラー状態
```tsx
<div className="
  p-4 
  bg-red-50 
  border border-red-200 
  rounded-md
  flex items-start gap-3
">
  <ExclamationIcon className="
    w-5 h-5 text-red-500 shrink-0
  " />
  <div>
    <p className="text-sm font-medium text-red-800">
      エラーが発生しました
    </p>
    <p className="text-sm text-red-700 mt-1">
      {errorMessage}
    </p>
  </div>
</div>
```

## 6. レスポンシブデザイン

### 6.1 ブレークポイント
```css
/* モバイル: 〜767px */
/* タブレット: 768px〜1023px */
/* デスクトップ: 1024px〜 */
```

### 6.2 レスポンシブ対応
- **デスクトップ**: フル機能、サイドパネル表示
- **タブレット**: 簡略化されたテーブル、モーダル形式の詳細
- **モバイル**: カード形式の表示、スワイプ操作対応

## 7. アニメーション仕様

### 7.1 基本的なトランジション
```css
/* デフォルトトランジション */
transition: all 200ms ease-out;

/* ホバーエフェクト */
transition: background-color 150ms ease-out;

/* 展開/折りたたみ */
transition: height 300ms ease-out;
```

### 7.2 マイクロインタラクション
- チェックボックス: チェック時にスケールアニメーション
- ボタンクリック: 押下時に軽いスケールダウン
- ドラッグ&ドロップ: 要素の影とスケールアップ

## 8. アクセシビリティ仕様

### 8.1 キーボードナビゲーション
- `Tab`: 次の要素へフォーカス
- `Shift+Tab`: 前の要素へフォーカス
- `Enter/Space`: ボタンやリンクの実行
- `Esc`: モーダル/サイドパネルを閉じる
- `Arrow keys`: リスト内の移動

### 8.2 スクリーンリーダー対応
```tsx
<button
  aria-label="タスクを展開"
  aria-expanded={isExpanded}
>
  <ChevronIcon />
</button>

<div
  role="region"
  aria-label="タスク詳細"
  aria-live="polite"
>
  {/* コンテンツ */}
</div>
```

### 8.3 カラーコントラスト
- 通常テキスト: 最小4.5:1
- 大きなテキスト: 最小3:1
- アクティブUI要素: 最小3:1

## 9. パフォーマンス最適化

### 9.1 遅延読み込み
```tsx
// 仮想スクロール
import { VirtualList } from '@tanstack/react-virtual';

// 画像の遅延読み込み
<img loading="lazy" src={avatarUrl} />

// コンポーネントの遅延読み込み
const TaskDetail = lazy(() => import('./TaskDetail'));
```

### 9.2 最適化テクニック
- React.memoによるコンポーネントのメモ化
- useMemoによる計算結果のキャッシュ
- useCallbackによる関数の再生成防止
- デバウンスによる検索の最適化