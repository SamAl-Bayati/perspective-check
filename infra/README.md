# Infrastructure (OpenTofu)

This folder contains AWS infrastructure scaffolding for:
- Amplify hosting (frontend)
- Lambda + API Gateway (backend)
- Remote state backend split by environment

Amplify ownership model:
- `prod` state manages a single shared Amplify app and both `prod` and `dev` branches
- `dev` state manages backend infrastructure only

## Prerequisites
- OpenTofu 1.6+
- AWS credentials configured in your shell
- S3 bucket and DynamoDB table for remote state

## Remote state configuration
Backend is declared as `s3` in `versions.tf` and environment-specific backend configs are provided as examples:
- `backend/dev.s3.tfbackend.example`
- `backend/prod.s3.tfbackend.example`

You can provision the remote state resources with OpenTofu from `bootstrap/`:
```bash
cd bootstrap
tofu init -backend=false
tofu apply \
  -var="aws_region=us-east-1" \
  -var="state_bucket_name=perspectivecheck-portfolio-tofu-state" \
  -var="lock_table_name=perspectivecheck-portfolio-tofu-locks"
```

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

## GitHub Actions CD
`.github/workflows/deploy.yml` deploys automatically on pushes to `dev` and `prod`, and also supports manual dispatch.

Workflow behavior:
- Runs frontend, backend, and infra checks
- Builds Lambda artifact (`make lambda-package`)
- Checks for state bucket and lock table
- Bootstraps missing state resources via `infra/bootstrap`
- Initializes backend state key for target environment
- Runs `tofu plan` and `tofu apply` with `env/dev.tfvars.example` or `env/prod.tfvars.example`
- Publishes `api_endpoint` and `amplify_branch_url` in the workflow summary

Branch mapping:
- `prod` deploys the shared Amplify app named `perspective-check`
- `prod` creates/updates Amplify branches `prod` and `dev`
- `prod` branch API URL is taken from the `prod` Lambda API output
- in CI, the `dev` branch API URL is loaded automatically from `dev` remote state output `api_endpoint`
- for manual local `prod` applies, set `amplify_additional_branch_api_base_urls` in `env/prod.tfvars`

Configure these GitHub variables and secrets in each GitHub Environment (`dev`, `prod`):
- Variable `AWS_REGION` for target region, for example `us-east-1`
- Variable `TF_STATE_BUCKET` for remote state bucket name
- Variable `TF_LOCK_TABLE` for DynamoDB lock table name
- Optional variable `TF_STATE_KEY_PREFIX` for backend key prefix, defaults to `perspective-check`
- Secret `AWS_DEPLOY_ROLE_ARN` for IAM role assumed by GitHub OIDC
- Optional secret `AMPLIFY_GITHUB_TOKEN` only if `github_access_token` is needed for a private repo

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
