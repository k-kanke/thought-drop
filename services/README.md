# thought-drop / services

Node.js + Express + TypeScript によるバックエンドサーバー。
メモの保存・Slack送信・履歴管理を担当する。

## セットアップ

```bash
cd services
npm install
cp .env.example .env
# .env を編集して SLACK_WEBHOOK_URL と USER_NAME を設定
npm run dev
```

## 環境変数

| 変数名 | 必須 | 説明 |
|---|---|---|
| `SLACK_WEBHOOK_URL` | ✅ | Slack の Incoming Webhook URL |
| `USER_NAME` | - | Slackメッセージに表示する名前（未設定時はホスト名） |
| `PORT` | - | ポート番号（デフォルト: 3001） |

## API

### POST `/api/memo`
メモを保存してSlackに送信する。

**リクエスト**
```json
{
  "content": "Prismaのマイグレーションが通らない",
  "status": "詰まり",
  "timestamp": "2026-02-22T06:00:00.000Z"
}
```

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `content` | string | ✅ | メモ本文 |
| `status` | string | - | 集中 / 調査中 / 詰まり / レビュー待ち |
| `timestamp` | string | - | ISO8601（省略時はサーバー時刻） |

**レスポンス**
```json
{ "message": "Memo sent to Slack successfully", "id": 1 }
```

| ステータス | 意味 |
|---|---|
| 200 | 保存・送信ともに成功 |
| 207 | 保存は成功、Slack送信は失敗 |
| 400 | `content` が不正 |
| 500 | サーバーエラー |

---

### GET `/api/memo/last`
最後にメモを送った時刻を返す。デスクトップアプリの声かけ判定に使用する。

**レスポンス**
```json
{ "last_memo_at": "2026-02-22T06:13:32.146Z" }
```

メモが1件もない場合は `last_memo_at: null`。

---

### GET `/api/memo`
メモ履歴を新しい順で返す。

**クエリパラメータ**

| パラメータ | デフォルト | 最大 | 説明 |
|---|---|---|---|
| `limit` | 20 | 100 | 取得件数 |
| `offset` | 0 | - | スキップ件数 |

**レスポンス**
```json
{
  "memos": [
    {
      "id": 2,
      "content": "APIの設計を確認中",
      "status": null,
      "sent_to_slack": 1,
      "created_at": "2026-02-22T06:13:32.146Z"
    }
  ]
}
```

## Slackメッセージ形式

```
🚨 [詰まり] Prismaのマイグレーションが通らない
_田中 · 2026-02-22 15:30:00 JST_
```

ステータス絵文字の対応：

| ステータス | 絵文字 |
|---|---|
| 集中 | 🎯 |
| 調査中 | 🔍 |
| 詰まり | 🚨 |
| レビュー待ち | ⏳ |
| （未設定） | 📝 |
