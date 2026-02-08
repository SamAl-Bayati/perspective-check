locals {
  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}

module "amplify" {
  source = "./modules/amplify"
  count  = var.deploy_amplify ? 1 : 0

  project_name        = var.project_name
  environment         = var.environment
  repository          = var.github_repository
  github_access_token = var.github_access_token
  branch              = var.amplify_branch
  api_base_url        = var.deploy_lambda_api ? module.lambda_api[0].api_endpoint : var.frontend_api_base_url
  tags                = local.tags
}

module "lambda_api" {
  source = "./modules/lambda_api"
  count  = var.deploy_lambda_api ? 1 : 0

  function_name            = var.lambda_function_name
  handler                  = var.lambda_handler
  runtime                  = var.lambda_runtime
  architecture             = var.lambda_architecture
  zip_path                 = var.lambda_zip_path
  environment              = var.environment
  lambda_log_retention     = var.lambda_log_retention_days
  api_access_log_retention = var.api_access_log_retention_days
  enable_lambda_tracing    = var.enable_lambda_tracing
  api_cors_allow_origins   = var.api_cors_allow_origins
  api_cors_allow_methods   = var.api_cors_allow_methods
  api_cors_allow_headers   = var.api_cors_allow_headers
  tags                     = local.tags
}
