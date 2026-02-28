# ai_asks

## Description

Ask-with-screenshot requests persisted for audit and reuse. Stores optional OCR text and final LLM answer.

<details>
<summary><strong>Table Definition</strong></summary>

```sql
CREATE TABLE ai_asks (
  id                        INTEGER PRIMARY KEY AUTOINCREMENT,
  user                      TEXT,
  message                   TEXT NOT NULL,
  s3_bucket                 TEXT,
  s3_key                    TEXT,
  mime_type                 TEXT,
  ocr_text                  TEXT,
  answer                    TEXT,
  answer_model              TEXT,
  usage_prompt_tokens       INTEGER,
  usage_completion_tokens   INTEGER,
  created_at                TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX idx_ai_asks_created_at ON ai_asks(created_at DESC);
```

</details>

## Columns

| Name | Type | Default | Nullable | Extra Definition | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | ---------------- | -------- | ------- | ------- |
| id | integer |  | false | PRIMARY KEY AUTOINCREMENT |  |  | Ask ID |
| user | text |  | true |  |  |  | Request user identifier |
| message | text |  | false |  |  |  | User question text |
| s3_bucket | text |  | true |  |  |  | S3 bucket for uploaded image |
| s3_key | text |  | true |  |  |  | S3 object key for uploaded image |
| mime_type | text |  | true |  |  |  | Image MIME type |
| ocr_text | text |  | true |  |  |  | OCR extracted text (optional) |
| answer | text |  | true |  |  |  | LLM final answer |
| answer_model | text |  | true |  |  |  | Model used for answering |
| usage_prompt_tokens | integer |  | true |  |  |  | Prompt token usage (if available) |
| usage_completion_tokens | integer |  | true |  |  |  | Completion token usage (if available) |
| created_at | text | `strftime('%Y-%m-%dT%H:%M:%SZ', 'now')` | false | DEFAULT |  |  | Created at (UTC ISO8601) |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| (inline) | PRIMARY KEY | PRIMARY KEY (id AUTOINCREMENT) |

## Indexes

| Name | Definition |
| ---- | ---------- |
| idx_ai_asks_created_at | INDEX ON ai_asks(created_at DESC) |

## Relations

This table does not reference other tables.

---

> Generated manually based on migrations in `services/src/db/migrations`
