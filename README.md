# Modern Webdev Template

Reusable, performance-focused web template with a minimal frontend, a lightweight Go API, and AWS deployment scaffolding.

## Why this stack
- Vite + React + TypeScript keeps frontend iteration fast with low build overhead
- Tailwind v4 keeps CSS payloads lean with utility-first styling
- Go + Gin provides a fast, small-footprint API baseline
- OpenTofu modules target AWS Amplify and Lambda + API Gateway for serverless deployment
- GitHub Actions runs quality checks on every push and pull request

## Repository layout
- `frontend/` React + TypeScript + Vite + Tailwind placeholder UI
- `backend/` Go + Gin API scaffold with `/health`
- `infra/` OpenTofu AWS scaffolding for Amplify and Lambda + API Gateway
- `infra/backend/` environment-specific remote state backend config examples
- `docs/` requirements, decisions, and developer setup notes
- `.github/workflows/ci.yml` CI checks for frontend, backend, and infra

## Local development
### Run backend
```bash
cd backend
cp .env.example .env
go run ./cmd/api
```

### Run frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend defaults to `http://localhost:5173`, backend defaults to `http://localhost:8080`.

## Full verification sweep
```bash
cd frontend
npm install
npm run lint
npm run typecheck
npm run build

cd ../backend
go test ./...

cd ../infra
tofu fmt -check -recursive
tofu init -backend=false
tofu validate
```

## Instant AWS deploy path

### 1) Bootstrap remote state backend once
Create an S3 bucket and DynamoDB lock table for OpenTofu state.

```bash
aws s3api create-bucket \
  --bucket YOUR_TOFU_STATE_BUCKET \
  --region us-east-1

aws s3api put-bucket-versioning \
  --bucket YOUR_TOFU_STATE_BUCKET \
  --versioning-configuration Status=Enabled

aws dynamodb create-table \
  --table-name YOUR_TOFU_LOCK_TABLE \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

For Lambda packaging, make sure `python3` is available for creating the zip artifact.

### 2) Configure environment files
```bash
cd infra
cp backend/dev.s3.tfbackend.example backend/dev.s3.tfbackend
cp env/dev.tfvars.example env/dev.tfvars
```

In `infra/backend/dev.s3.tfbackend`, set:
- `bucket`
- `dynamodb_table`
- `region`

In `infra/env/dev.tfvars`, keep both enabled for full deploy:
- `deploy_lambda_api = true`
- `deploy_amplify = true`

### 3) Build Lambda artifact
```bash
cd backend
mkdir -p build
GOOS=linux GOARCH=arm64 go build -tags lambda.norpc -o build/bootstrap ./cmd/lambda
cd build
python3 -m zipfile -c lambda.zip bootstrap
```

### 4) Initialize OpenTofu with remote state for `dev`
```bash
cd infra
tofu init -reconfigure -backend-config=backend/dev.s3.tfbackend
```

### 5) Deploy backend and frontend resources
```bash
cd infra
tofu plan -var-file=env/dev.tfvars
tofu apply -var-file=env/dev.tfvars
```

### 6) Confirm backend endpoint
When both `deploy_lambda_api` and `deploy_amplify` are `true`, `VITE_API_BASE_URL` is wired into Amplify automatically from the Lambda API output.

After apply:
```bash
cd infra
tofu output api_endpoint
```

If you deploy Amplify separately from Lambda, set:
- `frontend_api_base_url` in `env/dev.tfvars`

When Amplify rebuilds, the frontend health panel shows `Connected to backend successfully`.

## Observability defaults included
- Lambda tracing enabled with X-Ray (`tracing_config.mode = Active`)
- Lambda CloudWatch log group with retention
- API Gateway HTTP API access logs to CloudWatch
- API Gateway detailed metrics enabled on default route settings
- Trace visibility is provided through Lambda X-Ray segments and request IDs in API Gateway access logs

Outputs:
- `lambda_log_group_name`
- `api_access_log_group_name`
- `api_endpoint`

## Remote state split by environment
- `infra/backend/dev.s3.tfbackend.example`
- `infra/backend/prod.s3.tfbackend.example`
- `infra/env/dev.tfvars.example`
- `infra/env/prod.tfvars.example`

Use:
```bash
cd infra
tofu init -reconfigure -backend-config=backend/dev.s3.tfbackend
tofu plan -var-file=env/dev.tfvars
tofu apply -var-file=env/dev.tfvars
```

or:
```bash
cd infra
tofu init -reconfigure -backend-config=backend/prod.s3.tfbackend
tofu plan -var-file=env/prod.tfvars
tofu apply -var-file=env/prod.tfvars
```

## GitHub configuration checklist
This template ships with CI only and does not deploy automatically.

Required secrets and variables for `.github/workflows/ci.yml`:
- None

Optional secrets and variables for future CD:
- `AWS_ROLE_TO_ASSUME` (optional)
  - Source: IAM role ARN with GitHub OIDC trust policy
  - Used by: `aws-actions/configure-aws-credentials` in a deploy workflow
- `AWS_REGION` (optional variable)
  - Source: target AWS region, for example `us-east-1`
  - Used by: deploy workflow AWS CLI/OpenTofu steps
- `GH_PAT_FOR_AMPLIFY` (optional)
  - Source: GitHub PAT for private repo integration in Amplify
  - Used by: OpenTofu variable `github_access_token`

## What is intentionally not implemented
- No product features beyond placeholder UI and health endpoint
- No persistent storage, auth, or business logic
- No automatic production CD pipeline

## Next implementation steps
1. Add real feature routes and service layer in `backend/internal`
2. Add frontend route structure and feature modules in `frontend/src`
3. Add integration tests for frontend to backend connectivity
4. Add environment promotion workflow with approval gates
5. Add alarms and dashboards for Lambda errors and latency
