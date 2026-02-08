locals {
  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "opentofu"
  }

  amplify_primary_branch_name  = var.amplify_primary_branch_name != "" ? var.amplify_primary_branch_name : var.environment
  amplify_primary_api_base_url = var.deploy_lambda_api ? module.lambda_api[0].api_endpoint : var.frontend_api_base_url
  amplify_branch_api_base_urls = merge(
    var.amplify_additional_branch_api_base_urls,
    {
      (local.amplify_primary_branch_name) = local.amplify_primary_api_base_url
    }
  )
}

module "amplify" {
  source = "./modules/amplify"
  count  = var.deploy_amplify ? 1 : 0

  project_name            = var.project_name
  app_name                = var.amplify_app_name
  repository              = var.github_repository
  github_access_token     = var.github_access_token
  primary_branch_name     = local.amplify_primary_branch_name
  branch_api_base_urls    = local.amplify_branch_api_base_urls
  production_branch_names = var.amplify_production_branch_names
  tags                    = local.tags
}

module "lambda_api" {
  source = "./modules/lambda_api"
  count  = var.deploy_lambda_api ? 1 : 0

  function_name                         = var.lambda_function_name
  handler                               = var.lambda_handler
  runtime                               = var.lambda_runtime
  architecture                          = var.lambda_architecture
  zip_path                              = var.lambda_zip_path
  environment                           = var.environment
  lambda_log_retention                  = var.lambda_log_retention_days
  api_access_log_retention              = var.api_access_log_retention_days
  api_throttling_burst_limit            = var.api_throttling_burst_limit
  api_throttling_rate_limit             = var.api_throttling_rate_limit
  lambda_reserved_concurrent_executions = var.lambda_reserved_concurrent_executions
  enable_lambda_tracing                 = var.enable_lambda_tracing
  api_cors_allow_origins                = var.api_cors_allow_origins
  api_cors_allow_methods                = var.api_cors_allow_methods
  api_cors_allow_headers                = var.api_cors_allow_headers
  tags                                  = local.tags
}
