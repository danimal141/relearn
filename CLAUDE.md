# CLAUDE.md - Relearn System

## プロジェクト概要

**Relearn** - 過去のSNS投稿から新たな学びを再発見するシステム。スクリーンショットを自動的にテキスト化し、毎日夜9時に学びと共にSlackに通知。過去の自分の投稿や保存した投稿から継続的に価値を引き出す。

## 要件

1. **手動作業**: スクリーンショットを個人Googleアカウントのマイドライブ内`relearn_screenshots/`フォルダに保存
2. **自動処理**: Gemini APIでテキスト抽出（OCR）
3. **データ管理**: Cloudflare D1にテキストと学びをキャッシュ
4. **自動通知**: 毎日夜9時にSlackに投稿（未送信優先、送信済みの再送信OK）
5. **分析対応**: CloudflareダッシュボードでSQL分析可能

## システムアーキテクチャ

```
マイドライブ/relearn_screenshots/
    ↓
GitHub Actions (1時間ごと)
    ↓
Gemini API (テキスト抽出)
    ↓
Cloudflare D1 (データ保存)
    ↓
GitHub Actions (毎日夜9時)
    ↓
Gemini API (学び生成)
    ↓
Slack (通知)
```

## 技術スタック

- **言語**: TypeScript
- **パッケージマネージャー**: npm
- **フォーマッター/リンター**: Biome
- **実行環境**: GitHub Actions
- **データベース**: Cloudflare D1（SQLite互換）
- **APIs**:
  - Google Drive API（画像取得）
  - Gemini API（OCR・学び生成）
  - Slack Webhook API（通知）
- **主要ライブラリ**:
  - `googleapis`: Drive API操作
  - `@google/generative-ai`: Gemini API
  - `@slack/webhook`: Slack通知

## プロジェクト構成

```
relearn/
├── src/
│   ├── types/           # 型定義
│   │   └── index.ts
│   ├── services/        # ビジネスロジック
│   │   ├── d1-client.ts
│   │   ├── drive-service.ts
│   │   ├── gemini-service.ts
│   │   ├── relearn-service.ts
│   │   └── slack-service.ts
│   ├── commands/        # CLIコマンド
│   │   ├── scan-drive.ts
│   │   └── notify-slack.ts
│   └── config.ts        # 設定
├── .github/
│   └── workflows/
│       ├── scan-drive.yml
│       └── daily-slack.yml
├── biome.json           # Biome設定
├── tsconfig.json        # TypeScript設定
├── package.json         # npm設定
├── .env.example         # 環境変数サンプル
└── README.md
```

### package.json

```json
{
  "name": "relearn",
  "version": "1.0.0",
  "description": "Learn from your past social media posts",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/commands/scan-drive.ts",
    "scan-drive": "tsx src/commands/scan-drive.ts",
    "notify-slack": "tsx src/commands/notify-slack.ts",
    "build": "tsc",
    "format": "biome format --write .",
    "lint": "biome lint .",
    "check": "biome check --apply ."
  },
  "dependencies": {
    "@google/generative-ai": "^0.2.0",
    "@slack/webhook": "^7.0.2",
    "googleapis": "^130.0.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.5.0",
    "@types/node": "^20.10.6",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "allowSyntheticDefaultImports": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### biome.json

```json
{
  "$schema": "https://biomejs.dev/schemas/1.5.0/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": {
        "noForEach": "off"
      },
      "style": {
        "noNonNullAssertion": "off"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "formatWithErrors": false,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100,
    "lineEnding": "lf"
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "jsxQuoteStyle": "double",
      "semicolons": "always",
      "trailingComma": "all",
      "arrowParentheses": "always"
    }
  }
}
```

### テーブル構成

```sql
-- スクリーンショット管理
CREATE TABLE screenshots (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    drive_file_id TEXT UNIQUE,  -- 重複防止用
    drive_link TEXT,            -- Google Driveの共有リンク
    uploaded_at DATETIME NOT NULL,
    processed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_drive_file_id ON screenshots(drive_file_id);

-- 投稿データ（OCRキャッシュ含む）
CREATE TABLE posts (
    id TEXT PRIMARY KEY,
    screenshot_id TEXT NOT NULL,
    content TEXT NOT NULL,
    ocr_cached_at DATETIME,
    platform TEXT DEFAULT 'x',
    character_count INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (screenshot_id) REFERENCES screenshots(id)
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

## 環境変数（GitHub Secrets）

```bash
# Google Drive API (個人アカウント用)
GOOGLE_APPLICATION_CREDENTIALS  # サービスアカウントJSON
GOOGLE_DRIVE_FOLDER_ID         # relearn_screenshots/フォルダのID

# Cloudflare D1
CLOUDFLARE_API_TOKEN           # API トークン
CLOUDFLARE_ACCOUNT_ID          # アカウントID
CLOUDFLARE_D1_DATABASE_ID      # D1データベースID

# APIs
GEMINI_API_KEY                 # Gemini API キー
SLACK_WEBHOOK_URL              # Slack Webhook URL
```

## 主要機能の実装

### 1. Drive スキャン処理

```typescript
// src/services/relearn-service.ts
class RelearnService {
  async processScreenshot(file: drive_v3.Schema$File) {
    // 1. Drive File IDで重複チェック
    const existing = await this.db.get(
      'SELECT id FROM screenshots WHERE drive_file_id = ?',
      [file.id]
    );

    if (existing) {
      console.log(`✅ ${file.name} は既に処理済みです`);
      return;
    }

    // 2. Google Driveの共有リンクを生成
    const driveLink = `https://drive.google.com/file/d/${file.id}/view`;

    // 3. 新規スクリーンショットとして登録（リンク付き）
    // 4. OCRキャッシュをチェック
    // 5. なければGemini APIでテキスト抽出
    // 6. 結果をD1に保存
  }
}
```

**処理フロー:**
1. マイドライブ/`relearn_screenshots/`から画像リストを取得
2. 各画像のDrive File IDでD1に存在確認
3. 未登録の画像のみ処理
4. Google Driveの共有リンクを生成・保存
5. キャッシュがなければGemini APIでテキスト抽出
6. プロンプト: `この画像のテキストを抽出。SNS投稿なら本文のみ`
7. 結果をpostsテーブルに保存

### 2. Slack通知処理

```typescript
// src/services/notification-service.ts
class NotificationService {
  async sendDailyPost() {
    // 1. 未送信の投稿を優先的に取得
    // 2. 未送信がなければ、全投稿からランダムに選択
    // 3. 学びのキャッシュをチェック
    // 4. なければGemini APIで学び生成
    // 5. Slackに送信（セキュリティのためDriveリンクは含めない）
    // 6. 送信履歴を記録（同じ投稿の複数回送信OK）
  }

  formatSlackMessage(post: PostWithScreenshot, learning: string) {
    // 画像付き投稿かどうかを判定（Geminiの抽出結果から）
    const hasImages = post.content.includes('[画像:') ||
                     post.content.includes('写真') ||
                     post.content.includes('画像');

    return {
      blocks: [
        // ... 既存のブロック ...
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: hasImages
                ? `📷 画像付き投稿 | *文字数:* ${post.character_count}`
                : `*文字数:* ${post.character_count}`
            }
          ]
        }
      ]
    };
  }
}
```

**投稿選択ロジック:**
```sql
-- 未送信の投稿がある場合（Driveリンク付き）
SELECT p.*, s.filename, s.drive_link
FROM posts p
JOIN screenshots s ON p.screenshot_id = s.id
LEFT JOIN slack_history sh ON p.id = sh.post_id
WHERE sh.id IS NULL
ORDER BY RANDOM()
LIMIT 1;

-- 未送信がない場合（全投稿からランダム、Driveリンク付き）
SELECT p.*, s.filename, s.drive_link
FROM posts p
JOIN screenshots s ON p.screenshot_id = s.id
ORDER BY RANDOM()
LIMIT 1;
```

**学び生成プロンプト:**
```
以下のSNS投稿から得られる学びや洞察を、1-2文で簡潔に日本語でまとめてください。
ビジネス、人生、技術、コミュニケーションなど、どんな観点からでも構いません。
建設的で前向きな学びを抽出してください。

投稿内容:
{content}

学び:
```

### 3. キャッシュ戦略

- **OCR結果**: 一度抽出したら永続的にキャッシュ
- **学び**: post_idとprompt_typeの組み合わせでキャッシュ
- **メリット**: Gemini API使用量を最小限に抑える

## GitHub Actions ワークフロー

### scan-drive.yml（1時間ごと）

```yaml
on:
  schedule:
    - cron: '0 * * * *'
  workflow_dispatch:

jobs:
  scan:
    steps:
      - Google Driveから画像取得
      - Gemini APIでOCR（キャッシュ利用）
      - D1に保存
```

### daily-slack.yml（毎日夜9時 JST）

```yaml
on:
  schedule:
    - cron: '0 12 * * *'  # UTC 12:00 = JST 21:00
  workflow_dispatch:

jobs:
  notify:
    steps:
      - D1から投稿を選択（未送信優先、送信済みもOK）
      - Gemini APIで学び生成（キャッシュ利用）
      - Slackに送信
      - 送信履歴をD1に記録
```

## Slack通知フォーマット

```
📚 Relearn - 今日の学び直し

[投稿内容]

──────────────────

💡 今日の学び
[生成された学び]

📷 画像付き投稿 | 文字数: 256
```

※ セキュリティのため、Google Driveリンクは内部的に保存していますが、Slackには表示されません。必要な場合は管理者にお問い合わせください。

## 分析方法

### Cloudflareダッシュボード

1. Storage & Databases > D1 > relearn-db
2. Consoleタブで直接SQL実行
3. 結果をCSVエクスポート可能

### 分析クエリ例

```sql
-- 月別投稿統計
SELECT
  strftime('%Y-%m', created_at) as month,
  COUNT(*) as posts,
  AVG(character_count) as avg_chars
FROM posts
GROUP BY month
ORDER BY month DESC;

-- 人気の投稿（共有回数順）
SELECT
  p.content,
  COUNT(sh.id) as total_shares,
  MAX(sh.sent_at) as last_sent
FROM posts p
JOIN slack_history sh ON p.id = sh.post_id
GROUP BY p.id
ORDER BY total_shares DESC
LIMIT 10;

-- 未送信の投稿
SELECT
  p.*,
  s.filename,
  p.created_at
FROM posts p
JOIN screenshots s ON p.screenshot_id = s.id
LEFT JOIN slack_history sh ON p.id = sh.post_id
WHERE sh.id IS NULL
ORDER BY p.created_at DESC;
```

## セットアップ手順

### 1. Google Drive設定

1. **フォルダ作成**
   - マイドライブに`relearn_screenshots`フォルダを作成
   - フォルダを右クリック → 「リンクを取得」
   - URLから`folders/`以降のIDをコピー（例: `1A2B3C4D5E6F7G8H9I0J`）

2. **Google Cloud Projectの作成**
   ```
   1. https://console.cloud.google.com にアクセス
   2. 「プロジェクトを作成」をクリック
   3. プロジェクト名: relearn（任意）
   4. 「作成」をクリック
   ```

3. **Google Drive APIの有効化**
   ```
   1. 左メニュー → 「APIとサービス」 → 「ライブラリ」
   2. 「Google Drive API」を検索
   3. 「有効にする」をクリック
   ```

4. **サービスアカウントの作成**
   ```
   1. 左メニュー → 「APIとサービス」 → 「認証情報」
   2. 「認証情報を作成」 → 「サービスアカウント」
   3. サービスアカウント名: relearn-service（任意）
   4. 「作成して続行」 → 「完了」
   5. 作成したサービスアカウントをクリック
   6. 「キー」タブ → 「鍵を追加」 → 「新しい鍵を作成」
   7. 「JSON」を選択 → 「作成」
   8. JSONファイルがダウンロードされる（重要：安全に保管）
   ```

5. **フォルダをサービスアカウントと共有（重要）**
   ```
   1. Google Driveで`relearn_screenshots`フォルダを右クリック
   2. 「共有」を選択
   3. サービスアカウントのメール（例: relearn-service@project-id.iam.gserviceaccount.com）を入力
   4. 権限: 「閲覧者」を選択
   5. 「送信」をクリック
   ```

### 2. Gemini API設定

1. **APIキーの取得**
   ```
   1. https://makersuite.google.com/app/apikey にアクセス
   2. 「Create API key」をクリック
   3. APIキーをコピー（重要：安全に保管）
   ```

### 3. Cloudflare設定

1. **アカウント作成**
   ```
   1. https://cloudflare.com でアカウント作成（無料）
   2. ダッシュボードでAccount IDを確認（右サイドバー）
   ```

2. **API トークンの作成**
   ```
   1. 「My Profile」 → 「API Tokens」
   2. 「Create Token」 → 「Custom token」
   3. Token name: relearn-token
   4. Permissions:
      - Account > Cloudflare D1 > Edit
   5. 「Continue to summary」 → 「Create Token」
   6. トークンをコピー（重要：一度しか表示されない）
   ```

3. **Wrangler CLIのインストール**
   ```bash
   npm install -g wrangler
   wrangler login
   ```

4. **D1データベースの作成**
   ```bash
   wrangler d1 create relearn-db
   ```
   出力されたdatabase_idをメモ

5. **スキーマの適用**
   ```bash
   # schema.sqlファイルを作成（後述の内容）
   wrangler d1 execute relearn-db --file=./schema.sql
   ```

### 4. Slack設定

1. **Slack Appの作成**
   ```
   1. https://api.slack.com/apps にアクセス
   2. 「Create New App」 → 「From scratch」
   3. App Name: Relearn
   4. ワークスペースを選択
   ```

2. **Incoming Webhookの設定**
   ```
   1. 左メニュー → 「Incoming Webhooks」
   2. 「Activate Incoming Webhooks」をON
   3. 「Add New Webhook to Workspace」
   4. 投稿先チャンネルを選択
   5. Webhook URLをコピー
   ```

### 5. GitHubリポジトリ設定

1. **リポジトリ作成**
   ```bash
   git init relearn
   cd relearn
   ```

2. **プロジェクトファイルの作成**
   ```bash
   # package.json, tsconfig.json, biome.json等を作成（前述の内容）
   npm install
   ```

3. **環境変数ファイルの作成**
   ```bash
   cp .env.example .env
   # .envファイルに実際の値を設定（ローカルテスト用）
   ```

4. **GitHub Secretsの設定**
   ```
   1. GitHubでリポジトリを作成してpush
   2. Settings → Secrets and variables → Actions
   3. 以下のSecretsを追加:
      - GOOGLE_APPLICATION_CREDENTIALS: サービスアカウントJSONの内容全体
      - GOOGLE_DRIVE_FOLDER_ID: relearn_screenshotsフォルダのID
      - CLOUDFLARE_API_TOKEN: Cloudflare APIトークン
      - CLOUDFLARE_ACCOUNT_ID: CloudflareアカウントID
      - CLOUDFLARE_D1_DATABASE_ID: D1データベースID
      - GEMINI_API_KEY: Gemini APIキー
      - SLACK_WEBHOOK_URL: Slack Webhook URL
   ```

### 6. 初回テスト

1. **ローカルでの動作確認**
   ```bash
   # テスト画像をGoogle Driveにアップロード
   # その後実行
   npm run scan-drive
   ```

2. **GitHub Actionsの有効化**
   ```
   1. GitHubリポジトリ → Actions
   2. ワークフローが表示されることを確認
   3. 必要に応じて手動実行でテスト
   ```

### schema.sql

```sql
-- Cloudflare D1用のスキーマ
CREATE TABLE IF NOT EXISTS screenshots (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    drive_file_id TEXT UNIQUE,
    uploaded_at DATETIME NOT NULL,
    processed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    screenshot_id TEXT NOT NULL,
    content TEXT NOT NULL,
    ocr_cached_at DATETIME,
    platform TEXT DEFAULT 'x',
    character_count INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (screenshot_id) REFERENCES screenshots(id)
);

CREATE TABLE IF NOT EXISTS learnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id TEXT NOT NULL,
    learning_text TEXT NOT NULL,
    prompt_type TEXT DEFAULT 'default',
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id)
);

CREATE TABLE IF NOT EXISTS slack_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id TEXT NOT NULL,
    learning_id INTEGER,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT 1,
    FOREIGN KEY (post_id) REFERENCES posts(id),
    FOREIGN KEY (learning_id) REFERENCES learnings(id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_drive_file_id ON screenshots(drive_file_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
CREATE INDEX IF NOT EXISTS idx_slack_history_sent_at ON slack_history(sent_at);
```

## 開発コマンド

```bash
# 開発時（ファイル監視）
npm run dev

# コード整形
npm run format

# リントチェック
npm run lint

# 整形とリントを一括実行
npm run check

# TypeScriptビルド
npm run build

# 本番実行
npm run scan-drive
npm run notify-slack
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
