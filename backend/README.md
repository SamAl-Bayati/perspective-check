# Backend

## Stack
- Go 1.22
- Gin HTTP router
- AWS Lambda adapter for API Gateway

## Local run
```bash
cp .env.example .env
go run ./cmd/api
```

Default API URL: `http://localhost:8080`

Health endpoint: `GET /health`

## Tests
```bash
go test ./...
```

## Lambda package
From repo root:
```bash
make lambda-package
```
