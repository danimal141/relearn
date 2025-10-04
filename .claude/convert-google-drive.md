# Google Drive移行プラン

## 変更概要
Dropboxベースの画像共有システムをGoogle Driveベースに変更します。Slack側の仕組みは変更不要です（共有リンクを投稿すれば自動的にプレビュー表示されます）。

## 主な変更内容

### 1. Google Drive Adapterの作成 (`src/googledrive/adapter.ts`)
- Google Drive APIクライアントの初期化
- 指定フォルダ内の画像ファイルをランダムに取得（最大5ファイル）
- Google Driveの共有リンクを生成
- 学習済みファイルをtmpフォルダに移動
- tmpフォルダからファイルを復活させる機能

### 2. Executorの更新 (`src/relearn/executor.ts`)
- `DbxAdapter`を`GoogleDriveAdapter`に置き換え

### 3. エントリーポイントの更新 (`src/index.ts`)
- Dropbox関連の環境変数・初期化をGoogle Drive用に変更

### 4. 依存関係の更新 (`package.json`)
- `dropbox`パッケージを削除
- `googleapis`パッケージを追加

### 5. 既存ファイルの削除
- `src/dropbox/adapter.ts`を削除

## 必要な環境変数
- `GOOGLE_DRIVE_CREDENTIALS`: Google Drive APIの認証情報（JSON文字列またはファイルパス）
- `GOOGLE_DRIVE_FOLDER_ID`: 対象フォルダのID
- `SLACK_WEBHOOK_URL`: 既存のまま使用

## Slack側
変更なし（`SlackAdapter`はそのまま使用）
