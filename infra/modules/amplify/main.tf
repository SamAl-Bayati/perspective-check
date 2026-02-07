resource "aws_amplify_app" "this" {
  name       = "${var.project_name}-${var.environment}"
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

  environment_variables = var.api_base_url != "" ? {
    AMPLIFY_MONOREPO_APP_ROOT = "frontend"
    VITE_API_BASE_URL         = var.api_base_url
    } : {
    AMPLIFY_MONOREPO_APP_ROOT = "frontend"
  }

  tags = var.tags
}

resource "aws_amplify_branch" "this" {
  app_id            = aws_amplify_app.this.id
  branch_name       = var.branch
  framework         = "React"
  stage             = "PRODUCTION"
  enable_auto_build = true
}
