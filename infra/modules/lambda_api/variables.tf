variable "function_name" {
  type = string
}

variable "handler" {
  type    = string
  default = "bootstrap"
}

variable "runtime" {
  type    = string
  default = "provided.al2023"
}

variable "architecture" {
  type    = string
  default = "arm64"

  validation {
    condition     = contains(["arm64", "x86_64"], var.architecture)
    error_message = "architecture must be either arm64 or x86_64."
  }
}

variable "zip_path" {
  type = string
}

variable "environment" {
  type = string
}

variable "lambda_log_retention" {
  type    = number
  default = 14
}

variable "api_access_log_retention" {
  type    = number
  default = 14
}

variable "enable_lambda_tracing" {
  type    = bool
  default = true
}

variable "api_cors_allow_origins" {
  type    = list(string)
  default = ["*"]
}

variable "api_cors_allow_methods" {
  type    = list(string)
  default = ["GET", "OPTIONS"]
}

variable "api_cors_allow_headers" {
  type    = list(string)
  default = ["content-type", "authorization"]
}

variable "tags" {
  type    = map(string)
  default = {}
}
