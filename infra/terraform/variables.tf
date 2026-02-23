variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-1"
}

variable "project" {
  description = "Project identifier used for naming"
  type        = string
  default     = "thought-drop"
}

variable "environment" {
  description = "Environment name (e.g. dev/stg/prod)"
  type        = string
  default     = "dev"
}

variable "bucket_name" {
  description = "Optional fixed bucket name. If null, a generated unique name is used."
  type        = string
  default     = null
}

variable "bucket_force_destroy" {
  description = "Allow bucket destroy even if objects exist"
  type        = bool
  default     = false
}

variable "s3_prefix" {
  description = "Object prefix the service can access"
  type        = string
  default     = "uploads/"
}

variable "create_access_key" {
  description = "Create an IAM access key for the service user (stored in Terraform state)."
  type        = bool
  default     = false
}
