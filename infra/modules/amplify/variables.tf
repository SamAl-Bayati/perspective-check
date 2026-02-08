variable "project_name" {
  type = string
}

variable "app_name" {
  type    = string
  default = ""
}

variable "repository" {
  type    = string
  default = ""
}

variable "github_access_token" {
  type      = string
  default   = ""
  sensitive = true
}

variable "primary_branch_name" {
  type = string
}

variable "branch_api_base_urls" {
  type = map(string)
}

variable "production_branch_names" {
  type    = set(string)
  default = ["prod", "main"]
}

variable "tags" {
  type    = map(string)
  default = {}
}
