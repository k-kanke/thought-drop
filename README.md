# thought-drop

最前面に常駐するデスクトップUIからメモを送信し、Node API経由でSlackに投稿するプロトタイプです。

## 構成

- `apps/desktop`: Tauri + React フロントエンド
- `services`: Node.js + Express + TypeScript API（Slack webhook中継）

## ローカルでの起動方法

### 1. 前提ツール

- Node.js 20 以上
- pnpm
- Rust（Tauri起動時のみ）

### 2. バックエンドのセットアップと起動

```bash
cd services
npm install
cp .env.example .env
```

`services/.env` の `SLACK_WEBHOOK_URL` を実URLに設定してから起動:

```bash
npm run dev
```

### 3. デスクトップアプリのセットアップと起動（別ターミナル）

```bash
cd apps/desktop
pnpm install
cp .env.example .env
pnpm tauri dev
```

`apps/desktop/.env` は通常そのままでOKです（`VITE_API_BASE_URL=http://127.0.0.1:3001`）。

## 動作確認チェック

- Desktopウィンドウが最前面で表示される
- キャラクターボタン（🐣）クリックで入力UIが開閉する
- 送信でSlackに投稿される（API経由）
- 失敗時にUIにエラーメッセージが出る
