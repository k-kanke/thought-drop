# thought-drop

最前面に常駐するデスクトップUIからメモを送信し、Node API経由でSlackに投稿するプロトタイプです。

## 構成

- `apps/desktop`: Tauri + React フロントエンド
- `apps/web`: React + Vite Webフロントエンド
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

DBスキーマは起動時に自動で適用されます（`initial schema + migrations`）。
手動で適用だけ先に行いたい場合は、ルートで以下を実行:

```bash
make migrate
```

### 2.1 SQLiteを直接確認する

```bash
sqlite3 services/data/memos.db
```

対話モードでの基本コマンド:

```sql
.tables
.schema memos
.schema assets
SELECT id, applied_at FROM schema_migrations ORDER BY id;
SELECT id, content, created_at FROM memos ORDER BY id DESC LIMIT 5;
.quit
```

### 3. デスクトップアプリのセットアップと起動（別ターミナル）

```bash
cd apps/desktop
pnpm install
cp .env.example .env
pnpm tauri dev
```

`apps/desktop/.env` は通常そのままでOKです（`VITE_API_BASE_URL=http://127.0.0.1:3001`）。

### 4. Webフロントエンドのセットアップと起動（任意・別ターミナル）

```bash
cd apps/web
pnpm install
pnpm dev
```

ルートから実行する場合:

```bash
pnpm -C apps/web install
pnpm -C apps/web dev
```

## 動作確認チェック

- Desktopウィンドウが最前面で表示される
- キャラクターボタン（🐣）クリックで入力UIが開閉する
- 送信でSlackに投稿される（API経由）
- 失敗時にUIにエラーメッセージが出る

## AWS (Terraform)

S3にスクリーンショット保存するための最小構成は `infra/terraform` にあります。

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```
