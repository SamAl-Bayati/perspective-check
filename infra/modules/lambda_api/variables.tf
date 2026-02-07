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

variable "tags" {
  type    = map(string)
  default = {}
}
