.PHONY: frontend-install frontend-check backend-check infra-check verify lambda-package infra-init-dev infra-init-prod deploy-dev deploy-prod

frontend-install:
	cd frontend && npm install

frontend-check:
	cd frontend && npm run lint && npm run typecheck && npm run build

backend-check:
	cd backend && go test ./...

infra-check:
	cd infra && tofu fmt -check -recursive && tofu init -backend=false && tofu validate

verify: frontend-check backend-check infra-check

lambda-package:
	cd backend && mkdir -p build && GOOS=linux GOARCH=arm64 go build -tags lambda.norpc -o build/bootstrap ./cmd/lambda && cd build && python3 -m zipfile -c lambda.zip bootstrap

infra-init-dev:
	cd infra && tofu init -reconfigure -backend-config=backend/dev.s3.tfbackend

infra-init-prod:
	cd infra && tofu init -reconfigure -backend-config=backend/prod.s3.tfbackend

deploy-dev:
	cd infra && tofu plan -var-file=env/dev.tfvars && tofu apply -var-file=env/dev.tfvars

deploy-prod:
	cd infra && tofu plan -var-file=env/prod.tfvars && tofu apply -var-file=env/prod.tfvars
