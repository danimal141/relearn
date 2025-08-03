# Relearn v2 セットアップガイド

Relearn v2の詳細なセットアップ手順について説明します。

## 前提条件

- Node.js 22.0.0以上
- npm
- Git

## 必要なアカウント・サービス

1. **Google Cloud Platform**: Google Drive API用
2. **Cloudflare**: D1データベース用
3. **Slack**: 通知機能用（将来実装）

## 1. Google Drive設定

### 1-1. フォルダ作成

1. Google Driveにアクセス
2. マイドライブに`relearn_screenshots`フォルダを作成
3. フォルダを右クリック → 「リンクを取得」
4. URLから`folders/`以降のIDをコピー（例: `1A2B3C4D5E6F7G8H9I0J`）
5. このIDを`GOOGLE_DRIVE_FOLDER_ID`として後で使用

### 1-2. Google Cloud Projectの作成

1. [Google Cloud Console](https://console.cloud.google.com) にアクセス
2. 「プロジェクトを作成」をクリック
3. プロジェクト名: relearn（任意）
4. 「作成」をクリック
5. 作成したプロジェクトを選択

### 1-3. Google Drive APIの有効化

1. 左メニュー → 「APIとサービス」 → 「ライブラリ」
2. 「Google Drive API」を検索
3. 「有効にする」をクリック

### 1-4. サービスアカウントの作成

1. 左メニュー → 「APIとサービス」 → 「認証情報」
2. 「認証情報を作成」 → 「サービスアカウント」
3. サービスアカウント名: `relearn-service`（任意）
4. 「作成して続行」 → 「完了」
5. 作成したサービスアカウントをクリック
6. 「キー」タブ → 「鍵を追加」 → 「新しい鍵を作成」
7. 「JSON」を選択 → 「作成」
8. JSONファイルがダウンロードされる（**重要：安全に保管**）

### 1-5. フォルダをサービスアカウントと共有（重要）

1. Google Driveで`relearn_screenshots`フォルダを右クリック
2. 「共有」を選択
3. サービスアカウントのメールアドレスを入力
   - 例: `relearn-service@project-id.iam.gserviceaccount.com`
4. 権限: 「閲覧者」を選択
5. 「送信」をクリック

**注意**: この共有設定を忘れると、APIからフォルダにアクセスできません。

## 2. Cloudflare設定

### 2-1. アカウント作成

1. [Cloudflare](https://cloudflare.com) でアカウント作成（無料）
2. ダッシュボードでAccount IDを確認（右サイドバーに表示）
3. このIDを`CLOUDFLARE_ACCOUNT_ID`として後で使用

### 2-2. API トークンの作成

1. 「My Profile」 → 「API Tokens」
2. 「Create Token」 → 「Custom token」
3. 設定:
   - Token name: `relearn-token`
   - Permissions:
     - Account > Cloudflare D1 > Edit
   - Account Resources: Include > All accounts
4. 「Continue to summary」 → 「Create Token」
5. トークンをコピー（**重要：一度しか表示されない**）
6. このトークンを`CLOUDFLARE_API_TOKEN`として使用

### 2-3. Wrangler CLIのインストール

```bash
# グローバルインストール
npm install -g wrangler

# Cloudflareにログイン
wrangler login
```

### 2-4. D1データベースの作成

```bash
# データベース作成
wrangler d1 create relearn-db
```

出力例:
```
✅ Successfully created DB 'relearn-db'!

[[d1_databases]]
binding = "DB"
database_name = "relearn-db"
database_id = "a9c5bf31-696f-4b74-817e-d4146a628922"
```

`database_id`をコピーして`CLOUDFLARE_DATABASE_ID`として使用

### 2-5. wrangler.tomlの設定

プロジェクトルートの`wrangler.toml`ファイルで、database_idを実際の値に更新:

```toml
[[d1_databases]]
binding = "DB"
database_name = "relearn-db"
database_id = "a9c5bf31-696f-4b74-817e-d4146a628922"  # 実際のIDに置き換え
```

## 3. Slack設定（将来機能用）

### 3-1. Slack Appの作成

1. [Slack API](https://api.slack.com/apps) にアクセス
2. 「Create New App」 → 「From scratch」
3. App Name: `Relearn`
4. ワークスペースを選択

### 3-2. Incoming Webhookの設定

1. 左メニュー → 「Incoming Webhooks」
2. 「Activate Incoming Webhooks」をON
3. 「Add New Webhook to Workspace」
4. 投稿先チャンネルを選択
5. Webhook URLをコピー
6. このURLを`SLACK_WEBHOOK_URL`として使用

## 4. プロジェクトセットアップ

### 4-1. リポジトリのクローン・初期化

```bash
# 新規作成の場合
git clone <your-repo-url>
cd relearn

# または既存ディレクトリで
npm install
```

### 4-2. 環境変数の設定

`.env.sample`をコピーして`.env`ファイルを作成:

```bash
cp .env.sample .env
```

`.env`ファイルを編集して実際の値を設定:

```env
# Google Drive configuration
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'  # 1-4でダウンロードしたJSONの内容
GOOGLE_DRIVE_FOLDER_ID="1A2B3C4D5E6F7G8H9I0J"            # 1-1で取得したフォルダID

# Cloudflare D1 configuration
CLOUDFLARE_ACCOUNT_ID="ba881274b9c479c24ee3be87a8394d61"    # 2-1で確認したAccount ID
CLOUDFLARE_API_TOKEN="OWL2M8z4ENjlXXMI3KntT_uTutkwpEas"    # 2-2で作成したAPIトークン
CLOUDFLARE_DATABASE_ID="a9c5bf31-696f-4b74-817e-d4146a628922"  # 2-4で作成したDatabase ID

# Slack configuration (未実装機能)
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."   # 3-2で取得したWebhook URL

# Database configuration for Prisma (local development)
DATABASE_URL="file:./dev.db"

# Image processing configuration
IMAGE_COUNT=5
```

**セキュリティ注意**: `.env`ファイルは絶対にGitにコミットしないでください。

### 4-3. データベースの初期化

```bash
# Prismaクライアント生成
npm run db:generate

# D1データベースにスキーマを適用（ローカル環境）
npm run db:migrate:dev

# 本番環境にも適用する場合
npm run db:migrate:prod
```

### 4-4. 動作確認

```bash
# データベース接続テスト
npm run db:test

# 開発サーバー起動
npm run dev
```

## 5. GitHub設定（CI/CD用）

### 5-1. リポジトリの作成・プッシュ

```bash
# GitHubでリポジトリを作成後
git add .
git commit -m "Initial commit"
git push origin main
```

### 5-2. GitHub Secretsの設定

GitHubリポジトリで Settings → Secrets and variables → Actions

以下のSecretsを追加:

| Secret Name | Value | 説明 |
|-------------|-------|------|
| `GOOGLE_SERVICE_ACCOUNT_KEY` | サービスアカウントJSONの内容全体 | Google Drive API認証 |
| `GOOGLE_DRIVE_FOLDER_ID` | `1A2B3C4D5E6F7G8H9I0J` | relearn_screenshotsフォルダのID |
| `CLOUDFLARE_API_TOKEN` | `OWL2M8z4ENjlXXMI3Knt...` | Cloudflare APIトークン |
| `CLOUDFLARE_ACCOUNT_ID` | `ba881274b9c479c24ee3be...` | CloudflareアカウントID |
| `CLOUDFLARE_DATABASE_ID` | `a9c5bf31-696f-4b74-817e...` | D1データベースID |
| `SLACK_WEBHOOK_URL` | `https://hooks.slack.com/...` | Slack Webhook URL |

## 6. 初回テスト

### 6-1. 動作確認

```bash
# TypeScript型チェック
npm run type-check

# コード品質チェック
npm run check

# データベース接続テスト
npm run db:test

# 実際の処理をテスト（Google Driveにテスト画像をアップロード後）
npm run dev
```

### 6-2. 確認ポイント

1. **Google Drive接続**: テスト画像がフォルダから取得できる
2. **データベース接続**: D1への読み書きが正常に動作
3. **エラーログ**: コンソールにエラーが出ないこと

## トラブルシューティング

### よくある問題

1. **Google Drive APIエラー**
   - サービスアカウントのメールアドレスでフォルダが共有されているか確認
   - Google Drive APIが有効化されているか確認

2. **Cloudflare D1接続エラー**
   - APIトークンの権限が正しく設定されているか確認
   - Account IDとDatabase IDが正しいか確認

3. **Prismaエラー**
   - `npm run db:generate`を実行してクライアントを再生成
   - データベースのマイグレーションが正しく適用されているか確認

### ログの確認

```bash
# 詳細なログ出力
npm run dev

# データベース操作のテスト
npm run db:test
```

## 次のステップ

セットアップが完了したら:

1. Google Driveの`relearn_screenshots`フォルダにテスト画像をアップロード
2. `npm run dev`で動作確認
3. 将来実装予定の機能（OCR、Slack通知等）の開発準備

セットアップでご不明な点がありましたら、プロジェクトのREADMEまたはIssuesをご確認ください。
