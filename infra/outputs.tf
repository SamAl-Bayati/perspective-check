output "amplify_app_id" {
  description = "Amplify app id"
  value       = var.deploy_amplify ? module.amplify[0].app_id : null
}

output "amplify_branch_url" {
  description = "Amplify primary branch URL"
  value       = var.deploy_amplify ? module.amplify[0].primary_branch_url : null
}

output "amplify_branch_urls" {
  description = "Amplify branch URLs"
  value       = var.deploy_amplify ? module.amplify[0].branch_urls : {}
}

output "lambda_function_name" {
  description = "Lambda function name"
  value       = var.deploy_lambda_api ? module.lambda_api[0].lambda_function_name : null
}

output "api_endpoint" {
  description = "API Gateway endpoint"
  value       = var.deploy_lambda_api ? module.lambda_api[0].api_endpoint : null
}

output "lambda_log_group_name" {
  description = "Lambda CloudWatch log group"
  value       = var.deploy_lambda_api ? module.lambda_api[0].lambda_log_group_name : null
}

output "api_access_log_group_name" {
  description = "API Gateway access log group"
  value       = var.deploy_lambda_api ? module.lambda_api[0].api_access_log_group_name : null
}
