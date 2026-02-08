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

resource "aws_amplify_branch" "this" {
  for_each = var.branch_api_base_urls

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
