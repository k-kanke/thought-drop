# Terraform (S3 + IAM)

このディレクトリはスクリーンショット保存向けの AWS リソースを作成します。

- S3 バケット（非公開、Versioning有効、SSE-S3有効）
- Backend 用 IAM ユーザー
- IAM ポリシー（`uploads/` prefix に対する read/write）

## 1. 前提

- Terraform 1.5+
- AWS 認証済み（`aws configure` または `AWS_PROFILE`）

## 2. 実行

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

## 3. 取得値

```bash
terraform output s3_bucket_name
terraform output s3_region
terraform output s3_prefix
terraform output service_iam_user_name
```

`create_access_key = true` の場合のみ:

```bash
terraform output service_access_key_id
terraform output -raw service_secret_access_key
```

注意: access key を Terraform で作ると secret が state に残ります。
本番は IAM ロール運用を推奨します。

## 4. services 側 `.env` 想定

```env
AWS_REGION=ap-northeast-1
S3_BUCKET=<terraform output s3_bucket_name>
S3_PREFIX=uploads/
AWS_ACCESS_KEY_ID=<必要時>
AWS_SECRET_ACCESS_KEY=<必要時>
```
