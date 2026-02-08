# Infrastructure

## Stack
- OpenTofu (Terraform-compatible IaC)
- AWS Amplify for frontend hosting
- AWS Lambda + API Gateway for backend API

## Prerequisites
- OpenTofu `1.6+`
- AWS credentials configured in your shell
- S3 bucket and DynamoDB table for remote state locking

## Initial setup
1. Create backend config files
```bash
cp backend/dev.s3.tfbackend.example backend/dev.s3.tfbackend
cp backend/prod.s3.tfbackend.example backend/prod.s3.tfbackend
```

2. Create environment variable files
```bash
cp env/dev.tfvars.example env/dev.tfvars
cp env/prod.tfvars.example env/prod.tfvars
```

3. Initialize infra for an environment
```bash
tofu init -reconfigure -backend-config=backend/dev.s3.tfbackend
```

## Deploy commands
Dev:
```bash
tofu plan -var-file=env/dev.tfvars
tofu apply -var-file=env/dev.tfvars
```

Prod:
```bash
tofu init -reconfigure -backend-config=backend/prod.s3.tfbackend
tofu plan -var-file=env/prod.tfvars
tofu apply -var-file=env/prod.tfvars
```

## Validation
```bash
tofu fmt -check -recursive
tofu init -backend=false
tofu validate
```
