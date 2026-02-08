project_name      = "perspective-check"
environment       = "dev"
aws_region        = "us-east-1"
deploy_amplify    = false
deploy_lambda_api = true

github_repository                       = "https://github.com/SamAl-Bayati/perspective-check"
github_access_token                     = ""
amplify_app_name                        = "perspective-check"
amplify_primary_branch_name             = "dev"
amplify_additional_branch_api_base_urls = {}
amplify_production_branch_names         = ["prod"]
frontend_api_base_url                   = ""

lambda_function_name                  = "perspective-check-api-dev"
lambda_handler                        = "bootstrap"
lambda_runtime                        = "provided.al2023"
lambda_architecture                   = "arm64"
lambda_zip_path                       = "../backend/build/lambda.zip"
lambda_log_retention_days             = 14
api_access_log_retention_days         = 14
api_throttling_burst_limit            = 100
api_throttling_rate_limit             = 50
lambda_reserved_concurrent_executions = -1
enable_lambda_tracing                 = true
api_cors_allow_origins                = ["*"]
api_cors_allow_methods                = ["GET", "OPTIONS"]
api_cors_allow_headers                = ["content-type", "authorization"]
