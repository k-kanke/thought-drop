locals {
  name_prefix = "${var.project}-${var.environment}"
}

resource "random_id" "bucket_suffix" {
  byte_length = 3
}

locals {
  effective_bucket_name = coalesce(var.bucket_name, "${local.name_prefix}-assets-${random_id.bucket_suffix.hex}")
}

resource "aws_s3_bucket" "assets" {
  bucket        = local.effective_bucket_name
  force_destroy = var.bucket_force_destroy

  tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_s3_bucket_public_access_block" "assets" {
  bucket = aws_s3_bucket.assets.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "assets" {
  bucket = aws_s3_bucket.assets.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_iam_user" "service" {
  name = "${local.name_prefix}-service"

  tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

data "aws_iam_policy_document" "service_s3" {
  statement {
    sid    = "ListBucket"
    effect = "Allow"

    actions = [
      "s3:ListBucket",
    ]

    resources = [
      aws_s3_bucket.assets.arn,
    ]

    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values   = ["${var.s3_prefix}*"]
    }
  }

  statement {
    sid    = "ObjectRW"
    effect = "Allow"

    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
    ]

    resources = [
      "${aws_s3_bucket.assets.arn}/${var.s3_prefix}*",
    ]
  }
}

resource "aws_iam_user_policy" "service_s3" {
  name   = "${local.name_prefix}-s3-assets"
  user   = aws_iam_user.service.name
  policy = data.aws_iam_policy_document.service_s3.json
}

resource "aws_iam_access_key" "service" {
  count = var.create_access_key ? 1 : 0

  user = aws_iam_user.service.name
}
