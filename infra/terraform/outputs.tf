output "s3_bucket_name" {
  description = "S3 bucket for screenshot assets"
  value       = aws_s3_bucket.assets.bucket
}

output "s3_region" {
  description = "S3 region"
  value       = var.aws_region
}

output "s3_prefix" {
  description = "Object key prefix granted to the service"
  value       = var.s3_prefix
}

output "service_iam_user_name" {
  description = "IAM user for the backend service"
  value       = aws_iam_user.service.name
}

output "service_access_key_id" {
  description = "Access key ID (only when create_access_key=true)"
  value       = var.create_access_key ? aws_iam_access_key.service[0].id : null
}

output "service_secret_access_key" {
  description = "Secret access key (only when create_access_key=true). Handle securely."
  value       = var.create_access_key ? aws_iam_access_key.service[0].secret : null
  sensitive   = true
}
