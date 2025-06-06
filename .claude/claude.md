# Task Master - Claude Code Guidelines

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 📚 Documentation Structure

**IMPORTANT: Always refer to these documents FIRST before making any changes to understand the current system design and context.**

For comprehensive project information, refer to the following documents:

### 📋 [`project.md`](./project.md) - Project Overview
- プロジェクトの目的と主要機能
- 技術スタックと開発環境要件
- **更新が必要な場合**: 新機能追加、技術スタック変更、ライセンス変更時

### 🏗️ [`architecture.md`](./architecture.md) - System Architecture
- システム構成図とデータフロー
- デザインパターンと設計原則
- コーディング規約と命名規則
- **更新が必要な場合**: 新コンポーネント追加、アーキテクチャ変更、設計パターン変更時

### 🔌 [`api.md`](./api.md) - API Specifications
- 全エンドポイントの詳細仕様
- リクエスト/レスポンス形式
- エラーコードとサンプル
- **更新が必要な場合**: 新エンドポイント追加、既存API変更、エラーコード追加時

### 💾 [`database.md`](./database.md) - Database Design
- テーブル構造とER図
- インデックスとリレーション
- トリガーとRLS設定
- **更新が必要な場合**: テーブル変更、カラム追加/削除、新規インデックス作成時

### 📦 [`dependencies.md`](./dependencies.md) - Dependencies
- 使用ライブラリと用途
- バージョン情報と特殊設定
- **更新が必要な場合**: 新規ライブラリ追加、バージョンアップ、依存関係削除時

### 🎯 [`context.md`](./context.md) - Current Context
- 現在の開発状態とブランチ
- 進行中の作業と優先事項
- **更新が必要な場合**: ブランチ切り替え、新タスク開始、優先順位変更時

**⚠️ CRITICAL: When making changes to the codebase, you MUST update the corresponding documentation files. This is not optional.**

## 🚀 Common Development Commands

### Core Development
```bash
# Install dependencies
npm install

# Run tests
npm test                  # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report (target: 80%)
npm run test:fails       # Run only failing tests

# Run specific test categories
npm test tests/api        # Run API tests only
npm test tests/unit       # Run unit tests only
npm test tests/integration # Run integration tests only

# Run end-to-end tests
npm run test:e2e         # Run full e2e test suite
npm run test:e2e-report  # Run e2e tests with analysis report

# Code formatting
npm run format           # Format all code
npm run format-check     # Check code formatting

# Start servers
npm run mcp-server       # Start MCP server for editor integration
npm run api              # Start REST API server
npm run api:dev          # Start API server with hot reload
npm run api:db           # Start database-backed API server
npm run api:db:dev       # Start database-backed API with hot reload
```

### Frontend Development
```bash
cd frontend/task-master-ui
npm install              # Install frontend dependencies
npm run dev              # Start Next.js dev server (port 3000)
npm run build            # Build for production
npm run lint             # Run ESLint
```

### Testing Individual Components
```bash
# Run specific test file
npm test path/to/test.js

# Run tests matching pattern
npm test -- --testNamePattern="pattern"

# Debug tests
node --inspect-brk --experimental-vm-modules node_modules/.bin/jest --runInBand
```

## 🔑 Key Files to Understand

- `/mcp-server/src/core/task-master-core.js` - Core task management logic
- `/scripts/modules/task-manager.js` - CLI task operations
- `/api/routes/` - REST API endpoints
- `/scripts/modules/ai-services-unified.js` - AI provider abstraction
- `/mcp-server/src/tools/` - MCP tool definitions
- `/src/ai-providers/` - Provider-specific AI implementations

## 💡 Development Workflow

When implementing features:
1. Check existing patterns in similar components
2. Add appropriate tests (unit and integration)
3. Update documentation if adding new commands or APIs
4. Ensure MCP server compatibility for editor features
5. Consider multi-provider support for AI operations

## 🧪 Testing Strategy

### API Test Structure
- **Unit Tests** (`/tests/unit/`): Test individual functions with mocked dependencies
- **Integration Tests** (`/tests/integration/`): Test complete workflows
- **E2E Tests** (`/tests/e2e/`): Test full functionality with real data
- **Test Fixtures** (`/tests/fixtures/`): Reusable test data and edge cases

### Running API Tests
```bash
# Run all API tests with detailed output
npm test tests/api/

# Run with specific pattern
npm test tests/api/unit/tasks.test.js

# Generate coverage report
npm run test:coverage -- tests/api/
```

## 🔧 Configuration Management

### Project Configuration (`.taskmasterconfig`)
- Model selections (main, research, fallback)
- AI parameters (temperature, max tokens)
- Project settings (name, version, default subtasks)
- Managed via `task-master models` command

### API Keys (Environment Variables)
- Store in `.env` for CLI usage
- Store in `mcp.json` env section for MCP usage
- Never commit API keys to repository
- Required keys depend on selected AI providers

## 📝 Important Patterns

- **Error Handling**: All AI operations have fallback mechanisms and retry logic
- **File Operations**: Always use absolute paths, maintain backup files (.bak)
- **Testing**: Mock file system operations, use fixtures for consistent test data
- **Async Operations**: Heavy use of async/await for file I/O and AI calls
- **API Response Format**: Consistent structure with `success`, `data`, and `error` fields
- **Silent Mode**: MCP operations wrap console output to prevent interference with JSON responses

## 🔄 Documentation Maintenance

### 必須の更新手順

When you make ANY changes to the codebase, follow this checklist:

1. **コード変更前**:
   - [ ] 該当するドキュメントを読んで現在の設計を理解する
   - [ ] `context.md`で現在の開発状態を確認する
   - [ ] 変更が既存の設計原則に従っているか確認する

2. **コード変更時の必須更新**:
   - **新機能追加** → 
     - [ ] `project.md`の「主要機能」セクションを更新
     - [ ] `architecture.md`にコンポーネントを追加
     - [ ] 該当する場合は`api.md`にエンドポイントを追加
   
   - **API変更** → 
     - [ ] `api.md`のエンドポイント仕様を更新
     - [ ] リクエスト/レスポンス例を更新
     - [ ] エラーコードを追加（新規の場合）
   
   - **データベース変更** → 
     - [ ] `database.md`のテーブル定義を更新
     - [ ] ER図を更新（大きな変更の場合）
     - [ ] マイグレーションスクリプトの情報を追加
   
   - **依存関係変更** → 
     - [ ] `dependencies.md`に新規ライブラリを追加
     - [ ] バージョン情報と用途を明記
     - [ ] 特殊な設定があれば記載
   
   - **アーキテクチャ変更** → 
     - [ ] `architecture.md`のシステム構成図を更新
     - [ ] データフロー図を更新
     - [ ] 新しいデザインパターンを文書化

3. **コード変更後**:
   - [ ] `context.md`の「進行中の変更」セクションを更新
   - [ ] 次のステップや注意事項を記載
   - [ ] 技術的負債があれば追加

### 📝 更新テンプレート

各ドキュメント更新時は以下の形式で記載：

```markdown
## [日付] - [変更内容の要約]

### 変更内容
- 具体的な変更点1
- 具体的な変更点2

### 影響範囲
- 影響を受けるコンポーネント
- 破壊的変更の有無

### 関連ファイル
- `path/to/changed/file.js`
- `path/to/another/file.js`
```

**⚠️ REMEMBER: Documentation is as important as code. Outdated documentation is worse than no documentation.**