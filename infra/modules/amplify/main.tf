resource "aws_amplify_app" "this" {
  name       = var.app_name != "" ? var.app_name : var.project_name
  platform   = "WEB"
  repository = var.repository != "" ? var.repository : null

  access_token = var.github_access_token != "" ? var.github_access_token : null

  build_spec = <<-YAML
    version: 1
    applications:
      - appRoot: frontend
        frontend:
          phases:
            preBuild:
              commands:
                - npm ci
            build:
              commands:
                - npm run build
          artifacts:
            baseDirectory: dist
            files:
              - '**/*'
          cache:
            paths:
              - node_modules/**/*
  YAML

  environment_variables = {
    AMPLIFY_MONOREPO_APP_ROOT = "frontend"
  }

  tags = var.tags
}

locals {
  primary_api_base_url = try(var.branch_api_base_urls[var.primary_branch_name], "")
  additional_branch_api_base_urls = {
    for branch_name, api_base_url in var.branch_api_base_urls :
    branch_name => api_base_url if branch_name != var.primary_branch_name
  }
}

moved {
  from = aws_amplify_branch.this["prod"]
  to   = aws_amplify_branch.this
}

moved {
  from = aws_amplify_branch.this["dev"]
  to   = aws_amplify_branch.additional["dev"]
}

resource "aws_amplify_branch" "this" {
  app_id                      = aws_amplify_app.this.id
  branch_name                 = var.primary_branch_name
  framework                   = "React"
  stage                       = contains(var.production_branch_names, var.primary_branch_name) ? "PRODUCTION" : "DEVELOPMENT"
  enable_auto_build           = true
  enable_pull_request_preview = false
  environment_variables = local.primary_api_base_url != "" ? {
    VITE_API_BASE_URL = local.primary_api_base_url
  } : {}
}

resource "aws_amplify_branch" "additional" {
  for_each = local.additional_branch_api_base_urls

  app_id                      = aws_amplify_app.this.id
  branch_name                 = each.key
  framework                   = "React"
  stage                       = contains(var.production_branch_names, each.key) ? "PRODUCTION" : "DEVELOPMENT"
  enable_auto_build           = true
  enable_pull_request_preview = false
  environment_variables = each.value != "" ? {
    VITE_API_BASE_URL = each.value
  } : {}
}
