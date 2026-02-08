# PerspectiveCheck

Web app foundation for PerspectiveCheck, with a minimal frontend, a lightweight Go API, and AWS deployment scaffolding.

## Why this stack
- Vite + React + TypeScript keeps frontend iteration fast with low build overhead
- Tailwind v4 keeps CSS payloads lean with utility-first styling
- Go + Gin provides a fast, small-footprint API baseline
- OpenTofu modules target AWS Amplify and Lambda + API Gateway for serverless deployment
- GitHub Actions runs CI checks plus branch-based CD for `dev` and `prod`

## Repository layout
- `frontend/` React + TypeScript + Vite + Tailwind placeholder UI
- `backend/` Go + Gin API scaffold with `/health`
- `infra/` OpenTofu AWS scaffolding for Amplify and Lambda + API Gateway
- `infra/bootstrap/` OpenTofu bootstrap stack for remote state bucket and lock table
- `infra/backend/` environment-specific remote state backend config examples
- `docs/` requirements, decisions, and developer setup notes
- `.github/workflows/ci.yml` CI checks for frontend, backend, and infra
- `.github/workflows/deploy.yml` CD pipeline for `dev` and `prod`

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

## Automated AWS deploy path
Pushes to `dev` and `prod` trigger `.github/workflows/deploy.yml`.

The workflow:
- runs frontend, backend, and infra checks
- builds Lambda artifact
- bootstraps remote state resources with `infra/bootstrap` when missing
- runs OpenTofu plan and apply for the target environment
- prints `api_endpoint` and `amplify_branch_url` in the job summary

### One-time GitHub setup
Create GitHub Environments named `dev` and `prod`, then set:
- Variable `AWS_REGION`
- Variable `TF_STATE_BUCKET`
- Variable `TF_LOCK_TABLE`
- Optional variable `TF_STATE_KEY_PREFIX` (defaults to `perspective-check`)
- Secret `AWS_DEPLOY_ROLE_ARN`
- Optional secret `AMPLIFY_GITHUB_TOKEN` for private repos

### Optional local fallback deploy
You can still run deployment manually from your workstation:
```bash
cd infra/bootstrap
tofu init -backend=false
tofu apply \
  -var="aws_region=us-east-1" \
  -var="state_bucket_name=YOUR_TOFU_STATE_BUCKET" \
  -var="lock_table_name=YOUR_TOFU_LOCK_TABLE"

cd ../..
make lambda-package
cd infra
tofu init -reconfigure -backend-config=backend/dev.s3.tfbackend
tofu plan -var-file=env/dev.tfvars
tofu apply -var-file=env/dev.tfvars
```

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
Required for `.github/workflows/ci.yml`:
- none

Required for `.github/workflows/deploy.yml` in each environment (`dev`, `prod`):
- Variable `AWS_REGION`
- Variable `TF_STATE_BUCKET`
- Variable `TF_LOCK_TABLE`
- Secret `AWS_DEPLOY_ROLE_ARN`

Optional for `.github/workflows/deploy.yml`:
- Variable `TF_STATE_KEY_PREFIX`
- Secret `AMPLIFY_GITHUB_TOKEN`

## What is intentionally not implemented
- No product features beyond placeholder UI and health endpoint
- No persistent storage, auth, or business logic
- No environment promotion gates or approval workflow between `dev` and `prod`

## Next implementation steps
1. Add real feature routes and service layer in `backend/internal`
2. Add frontend route structure and feature modules in `frontend/src`
3. Add integration tests for frontend to backend connectivity
4. Add environment promotion workflow with approval gates
5. Add alarms and dashboards for Lambda errors and latency
