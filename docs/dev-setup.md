# Developer Setup

## Prerequisites
- Node.js 20+
- npm 10+
- Go 1.22+
- OpenTofu 1.6+ (optional for local infra validation)

## Local Startup
```bash
cd backend
go run ./cmd/api
```

In another terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Quality Checks
```bash
cd frontend
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

For deploy-ready infra init (remote state):

```bash
cd infra
cp backend/dev.s3.tfbackend.example backend/dev.s3.tfbackend
tofu init -reconfigure -backend-config=backend/dev.s3.tfbackend
```
