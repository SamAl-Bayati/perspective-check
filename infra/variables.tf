variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "perspective-check"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "deploy_amplify" {
  description = "Whether to create Amplify resources"
  type        = bool
  default     = false
}

variable "deploy_lambda_api" {
  description = "Whether to create Lambda + API Gateway resources"
  type        = bool
  default     = false
}

variable "github_repository" {
  description = "Repository URL for Amplify integration"
  type        = string
  default     = ""
}

variable "github_access_token" {
  description = "GitHub token for private repository access in Amplify"
  type        = string
  default     = ""
  sensitive   = true
}

variable "amplify_branch" {
  description = "Default branch to connect in Amplify"
  type        = string
  default     = "main"
}

variable "frontend_api_base_url" {
  description = "Optional API base URL for frontend when Lambda API is not deployed by this stack"
  type        = string
  default     = ""
}

variable "lambda_function_name" {
  description = "Lambda function name"
  type        = string
  default     = "perspective-check-api"
}

variable "lambda_handler" {
  description = "Lambda entrypoint"
  type        = string
  default     = "bootstrap"
}

variable "lambda_runtime" {
  description = "Lambda runtime"
  type        = string
  default     = "provided.al2023"
}

variable "lambda_architecture" {
  description = "Lambda architecture"
  type        = string
  default     = "arm64"

  validation {
    condition     = contains(["arm64", "x86_64"], var.lambda_architecture)
    error_message = "lambda_architecture must be either arm64 or x86_64."
  }
}

variable "lambda_zip_path" {
  description = "Path to Lambda deployment zip"
  type        = string
  default     = "../backend/build/lambda.zip"
}

variable "lambda_log_retention_days" {
  description = "CloudWatch log retention for Lambda logs"
  type        = number
  default     = 14
}

variable "api_access_log_retention_days" {
  description = "CloudWatch log retention for API Gateway access logs"
  type        = number
  default     = 14
}

variable "enable_lambda_tracing" {
  description = "Enable active X-Ray tracing for Lambda"
  type        = bool
  default     = true
}

variable "api_cors_allow_origins" {
  description = "Allowed CORS origins for the backend HTTP API"
  type        = list(string)
  default     = ["*"]
}

variable "api_cors_allow_methods" {
  description = "Allowed CORS methods for the backend HTTP API"
  type        = list(string)
  default     = ["GET", "OPTIONS"]
}

variable "api_cors_allow_headers" {
  description = "Allowed CORS headers for the backend HTTP API"
  type        = list(string)
  default     = ["content-type", "authorization"]
}
