locals {
  tags = merge(
    {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "opentofu"
      Component   = "remote-state"
    },
    var.tags
  )
}

resource "aws_s3_bucket" "state" {
  count = var.create_state_bucket ? 1 : 0

  bucket        = var.state_bucket_name
  force_destroy = false

  lifecycle {
    prevent_destroy = true
  }

  tags = local.tags
}

resource "aws_s3_bucket_versioning" "state" {
  count = var.create_state_bucket ? 1 : 0

  bucket = aws_s3_bucket.state[0].id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  count = var.create_state_bucket ? 1 : 0

  bucket = aws_s3_bucket.state[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "state" {
  count = var.create_state_bucket ? 1 : 0

  bucket = aws_s3_bucket.state[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_dynamodb_table" "locks" {
  count = var.create_lock_table ? 1 : 0

  name         = var.lock_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  lifecycle {
    prevent_destroy = true
  }

  tags = local.tags
}
