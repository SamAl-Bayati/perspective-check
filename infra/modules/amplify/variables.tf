variable "project_name" {
  type = string
}

variable "environment" {
  type = string
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

variable "branch" {
  type    = string
  default = "main"
}

variable "api_base_url" {
  type    = string
  default = ""
}

variable "tags" {
  type    = map(string)
  default = {}
}
