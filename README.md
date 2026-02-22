# thought-drop

最前面に常駐するデスクトップUIからメモを送信し、Node API経由でSlackに投稿するプロトタイプです。

## 構成

- `apps/desktop`: Tauri + React フロントエンド
- `services/api`: Fastify + TypeScript API（Slack webhook中継）

## ステップバイステップ実行

### 1. 前提ツールを用意

- Node.js 20 以上
- pnpm
- Rust（Tauri起動時）

### 2. 環境変数ファイルを作成

```bash
cp services/api/.env.example services/api/.env
cp apps/desktop/.env.example apps/desktop/.env
```

`services/api/.env` の `SLACK_WEBHOOK_URL` を実URLに変更してください。

### 3. 依存関係をインストール

```bash
pnpm install
```

### 4. 開発起動（API + Desktopを同時）

```bash
pnpm dev
```

## 動作確認チェック

- Desktopウィンドウが最前面で表示される
- キャラクターボタン（🐣）クリックで入力UIが開閉する
- 送信でSlackに投稿される
- 失敗時にUIにエラーメッセージが出る
