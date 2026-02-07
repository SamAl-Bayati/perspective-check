# Infrastructure (OpenTofu)

This folder contains AWS infrastructure scaffolding for:
- Amplify hosting (frontend)
- Lambda + API Gateway (backend)
- Remote state backend split by environment

## Prerequisites
- OpenTofu 1.6+
- AWS credentials configured in your shell
- Existing S3 bucket and DynamoDB table for remote state

## Remote state configuration
Backend is declared as `s3` in `versions.tf` and environment-specific backend configs are provided as examples:
- `backend/dev.s3.tfbackend.example`
- `backend/prod.s3.tfbackend.example`

Create real backend files:
```bash
cp backend/dev.s3.tfbackend.example backend/dev.s3.tfbackend
cp backend/prod.s3.tfbackend.example backend/prod.s3.tfbackend
```

Initialize per environment:
```bash
tofu init -reconfigure -backend-config=backend/dev.s3.tfbackend
# or
tofu init -reconfigure -backend-config=backend/prod.s3.tfbackend
```

## Environment variables for resources
- `env/dev.tfvars.example`
- `env/prod.tfvars.example`

Copy and customize:
```bash
cp env/dev.tfvars.example env/dev.tfvars
cp env/prod.tfvars.example env/prod.tfvars
```

If deploying Amplify without Lambda in the same apply, set `frontend_api_base_url` in the tfvars file.

## Commands
### Format and validate only
```bash
tofu fmt -check -recursive
tofu init -backend=false
tofu validate
```

### Plan and apply for dev
```bash
tofu init -reconfigure -backend-config=backend/dev.s3.tfbackend
tofu plan -var-file=env/dev.tfvars
tofu apply -var-file=env/dev.tfvars
```

### Plan and apply for prod
```bash
tofu init -reconfigure -backend-config=backend/prod.s3.tfbackend
tofu plan -var-file=env/prod.tfvars
tofu apply -var-file=env/prod.tfvars
```

## Observability included for Lambda/API Gateway
- Lambda X-Ray tracing toggle: `enable_lambda_tracing`
- Lambda log retention: `lambda_log_retention_days`
- API Gateway access log retention: `api_access_log_retention_days`

Key outputs:
- `api_endpoint`
- `lambda_log_group_name`
- `api_access_log_group_name`
