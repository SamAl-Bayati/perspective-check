output "state_bucket_name" {
  description = "Configured state bucket name"
  value       = var.state_bucket_name
}

output "lock_table_name" {
  description = "Configured lock table name"
  value       = var.lock_table_name
}
