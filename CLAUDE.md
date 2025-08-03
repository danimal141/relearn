# CLAUDE.md - Relearn System v2

## プロジェクト概要

**Relearn v2** - 過去のSNS投稿から新たな学びを再発見するシステム。Google Driveに保存したスクリーンショットを管理し、Cloudflare WorkersとD1を使ったモダンなアーキテクチャで構築。

## 現在の実装状況

### ✅ 実装済み（v2.0.0）
1. **Google Drive連携**: 画像取得、ファイル移動、権限管理の基本機能
2. **データベース基盤**: Prisma + Cloudflare D1によるHTTP経由でのDB操作
3. **Cloudflare Workers対応**: Workers環境でのネイティブD1バインディング利用可能
4. **型安全性**: TypeScript strict mode + exactOptionalPropertyTypesによる厳密な型チェック
5. **開発環境**: BiomeによるリンティングとフォーマッティングのCLIツール
6. **関数型アプローチ**: AsyncResult型による関数型エラーハンドリング

### 🚧 未実装（将来拡張予定）
1. **画像解析**: OCR/テキスト抽出機能
2. **AI機能**: 学びや洞察の自動生成
3. **通知システム**: Slack自動通知
4. **自動化**: GitHub Actionsワークフロー
5. **分析ダッシュボード**: データ分析・可視化機能

## 基本要件

1. **手動作業**: スクリーンショットを個人Googleアカウントのマイドライブ内`relearn_screenshots/`フォルダに保存
2. **画像管理**: Google Drive APIによるファイル取得・移動・権限管理
3. **データ管理**: Cloudflare D1 + Prismaによる型安全なデータ操作
4. **実行環境**: Cloudflare Workersによるサーバーレス実行
5. **分析対応**: CloudflareダッシュボードでSQL分析可能

## システムアーキテクチャ（現在実装）

```
マイドライブ/relearn_screenshots/
    ↓
Google Drive API (画像取得・管理)
    ↓
Cloudflare Workers (サーバーレス実行)
    ↓
Prisma + D1 Adapter (型安全なDB操作)
    ↓
Cloudflare D1 (データ保存)
```

### 将来拡張予定
```
... (上記に加えて)
    ↓
Gemini API (OCR・学び生成)
    ↓
Slack Webhook (通知)
    ↓
GitHub Actions (自動実行)
```

## 技術スタック

- **言語**: TypeScript (strict mode + exactOptionalPropertyTypes)
- **パッケージマネージャー**: npm
- **フォーマッター/リンター**: Biome (Prettier + ESLintの統合ツール)
- **実行環境**: Cloudflare Workers + Node.js 22.0.0+
- **データベース**: Cloudflare D1 (SQLite互換) + Prisma ORM
- **APIs**:
  - Google Drive API (画像取得・移動・権限管理)
  - [未実装] Gemini API (OCR・学び生成)
  - [未実装] Slack Webhook API (通知)
- **主要ライブラリ**:
  - `googleapis`: Drive API操作
  - `@prisma/client` + `@prisma/adapter-d1`: D1データベース操作
  - `@cloudflare/workers-types`: Workers型定義
  - `@slack/webhook`: Slack通知 (未実装)
- **開発ツール**:
  - `wrangler`: Cloudflare開発・デプロイツール
  - `tsx`: TypeScript実行
  - `prisma`: データベーススキーマ管理

## プロジェクト構成

```
relearn/
├── src/
│   ├── cloudflare/          # Cloudflare関連（D1、Workers）
│   ├── googledrive/         # Google Drive連携
│   ├── relearn/             # コアビジネスロジック
│   ├── slack/               # Slack連携（準備済み、未実装）
│   ├── scripts/             # 開発・テストスクリプト
│   ├── index.ts             # エントリーポイント
│   └── types.ts             # 共通型定義
├── prisma/                  # データベーススキーマ・マイグレーション
├── 設定ファイル群（package.json、tsconfig.json、biome.json、wrangler.toml等）
└── 環境設定（.env.sample、README.md）
```

### 設定ファイル

プロジェクトの設定詳細は各ファイルを参照：

- **package.json**: 依存関係とスクリプト設定（Node.js 22.0.0+、Prisma、Biome等）
- **tsconfig.json**: TypeScript設定（strict mode、exactOptionalPropertyTypes有効）
- **biome.json**: フォーマット・リント設定（Prettier + ESLint統合）
- **wrangler.toml**: Cloudflare Workers・D1データベース設定
- **prisma/schema.prisma**: データベーススキーマ定義

## データベース設計

### 現在実装（v2.0.0）

- **Prismaスキーマ**: `prisma/schema.prisma`参照
- **テーブル**: processed_images（画像ファイル管理）
- **マイグレーション**: `prisma/migrations/init/migration.sql`参照

### 将来拡張予定のテーブル設計

OCRやSlack機能実装時に以下のテーブルを追加予定：

```sql
-- OCRテキストデータ
CREATE TABLE posts (
    id TEXT PRIMARY KEY,
    processed_image_id TEXT NOT NULL,
    content TEXT NOT NULL,
    ocr_cached_at DATETIME,
    platform TEXT DEFAULT 'x',
    character_count INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (processed_image_id) REFERENCES processed_images(id)
);

-- 学び（キャッシュ）
CREATE TABLE learnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id TEXT NOT NULL,
    learning_text TEXT NOT NULL,
    prompt_type TEXT DEFAULT 'default',
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id)
);

-- Slack送信履歴
CREATE TABLE slack_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id TEXT NOT NULL,
    learning_id INTEGER,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT 1,
    FOREIGN KEY (post_id) REFERENCES posts(id),
    FOREIGN KEY (learning_id) REFERENCES learnings(id)
);
```

## 環境変数設定

設定詳細は`.env.sample`ファイル参照

### 現在利用中
- **GOOGLE_SERVICE_ACCOUNT_KEY**: Google Drive APIサービスアカウント認証
- **GOOGLE_DRIVE_FOLDER_ID**: relearn_screenshotsフォルダID
- **CLOUDFLARE_ACCOUNT_ID**: CloudflareアカウントID
- **CLOUDFLARE_API_TOKEN**: Cloudflare APIトークン
- **CLOUDFLARE_DATABASE_ID**: D1データベースID
- **SLACK_WEBHOOK_URL**: Slack通知用（準備済み、未使用）

### 将来実装予定
- **GEMINI_API_KEY**: AI機能用APIキー

## 主要機能（現在実装）

### 1. Google Drive連携
- **ファイル取得**: 指定フォルダからランダム画像取得
- **ファイル移動**: 処理済み画像の移動・権限管理
- **重複チェック**: Drive File IDによる処理済み画像の管理

### 2. データベース操作
- **Prisma + D1**: 型安全なデータベース操作
- **HTTPクライアント**: 開発環境でのREST API経由アクセス
- **Workersバインディング**: 本番環境でのネイティブD1操作

### 将来実装予定の機能

- **OCR処理**: 画像からテキスト抽出
- **AI学び生成**: 抽出テキストから洞察生成
- **Slack通知**: 自動的な日次通知
- **GitHub Actions**: ワークフロー自動化

## セットアップ手順

詳細なセットアップ手順については **[docs/setup.md](./docs/setup.md)** を参照してください。

### 概要
1. **Google Cloud Platform**: Drive API + サービスアカウント設定
2. **Cloudflare**: アカウント作成 + D1データベース作成
3. **Slack**: Webhook URL取得（将来機能用）
4. **環境変数設定**: `.env.sample`を参考に設定
5. **データベース初期化**: `npm run db:create`、`npm run db:migrate:dev`

## 開発コマンド

詳細は`package.json`のscriptsセクション参照

```bash
# 開発・ビルド
npm run dev              # 開発実行
npm run dev:watch        # ファイル監視での開発実行
npm run build            # TypeScriptビルド
npm run type-check       # 型チェックのみ

# コード品質
npm run format           # Biomeフォーマット
npm run lint             # Biomeリント
npm run check            # フォーマット・リント一括実行

# データベース
npm run db:generate      # Prismaクライアント生成
npm run db:create        # D1データベース作成
npm run db:migrate:dev   # ローカル環境マイグレーション
npm run db:migrate:prod  # 本番環境マイグレーション
npm run db:test          # データベース接続テスト
```

## 運用フロー

1. **日常運用**
   - スクショをマイドライブ/`relearn_screenshots/`にアップロード（手動）
   - 毎日夜9時にSlack通知（自動）
   - 未送信を優先、全て送信済みならランダムに選択

2. **分析**
   - Cloudflareダッシュボードで随時確認
   - 月次レポートはSQLクエリで生成
   - 同じ投稿の送信回数も分析可能

3. **メンテナンス**
   - エラー時はGitHub Actionsログを確認
   - D1の容量は5GBまで無料

## エラーハンドリング

- Gemini APIエラー → キャッシュがあれば利用、なければスキップ
- D1接続エラー → リトライ後、GitHub Actionsでアラート
- Slack送信エラー → エラーログを記録、次回再試行

## コード規約

- **TypeScript**: strict modeで型安全性を確保
- **フォーマット**: Biomeで自動整形（`npm run format`）
- **リント**: Biomeで品質チェック（`npm run lint`）
- **インポート**: 自動整理・ソート
- **エラー処理**: 必ずtry-catchでラップ
- **環境変数**: 起動時に必須チェック
- **ログ**: エラーは詳細に、成功は簡潔に
- **コミット前**: `npm run check`で検証
