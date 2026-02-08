variable "aws_region" {
  description = "AWS region where state resources live"
  type        = string
}

variable "state_bucket_name" {
  description = "S3 bucket name for OpenTofu remote state"
  type        = string
}

variable "lock_table_name" {
  description = "DynamoDB table name for OpenTofu state locking"
  type        = string
}

variable "create_state_bucket" {
  description = "Whether to create the S3 state bucket"
  type        = bool
  default     = true
}

variable "create_lock_table" {
  description = "Whether to create the DynamoDB lock table"
  type        = bool
  default     = true
}

variable "project_name" {
  description = "Project tag value"
  type        = string
  default     = "perspective-check"
}

variable "environment" {
  description = "Environment tag value for shared backend resources"
  type        = string
  default     = "shared"
}

variable "tags" {
  description = "Additional tags for state resources"
  type        = map(string)
  default     = {}
}
