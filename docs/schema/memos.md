# memos

## Description

<details>
<summary><strong>Table Definition</strong></summary>

```sql
CREATE TABLE memos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  status TEXT,
  sent_to_slack INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT
);
```

</details>

## Columns

| Name | Type | Default | Nullable | Extra Definition | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | ---------------- | -------- | ------- | ------- |
| id | integer |  | false | PRIMARY KEY AUTOINCREMENT | [assets](assets.md) |  | Memo ID |
| content | text |  | false |  |  |  | Memo content |
| status | text |  | true |  |  |  | Memo status label |
| sent_to_slack | integer | 0 | false | DEFAULT |  |  | Slack sent flag (0/1) |
| created_at | text | `strftime('%Y-%m-%dT%H:%M:%SZ', 'now')` | false | DEFAULT |  |  | Created at (UTC ISO8601) |
| updated_at | text |  | true |  |  |  | Updated at (UTC ISO8601) |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| (inline) | PRIMARY KEY | PRIMARY KEY (id AUTOINCREMENT) |

## Indexes

| Name | Definition |
| ---- | ---------- |
| idx_memos_created_at | INDEX ON memos(created_at DESC) |

## Relations

```mermaid
erDiagram

"memos" ||--o{ "assets" : "FOREIGN KEY (memo_id) REFERENCES memos (id)"

"memos" {
  integer id PK "Memo ID"
  text content "Memo content"
  text status "Memo status label"
  integer sent_to_slack "Slack sent flag (0/1)"
  text created_at "Created at (UTC ISO8601)"
  text updated_at "Updated at (UTC ISO8601)"
}
"assets" {
  integer id PK "Asset ID"
  integer memo_id FK "Parent memo ID"
}
```

---

> Generated manually based on `services/data/memos.db`
