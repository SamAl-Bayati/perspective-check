# Architecture Decisions

- Vite + React + TypeScript was selected for fast startup, fast rebuilds, and low bundle overhead
- Go + Gin was selected for backend performance, low memory usage, and minimal dependencies
- OpenTofu was selected to keep IaC portable while targeting AWS services directly
- GitHub Actions CI was selected for simple repository-native quality gates
- AWS Amplify is the default frontend host and Lambda + API Gateway is the default backend host for a serverless, low-maintenance baseline
- OpenTofu state is configured for remote S3 backend with environment-specific backend config files
- Lambda tracing and API Gateway access logs are enabled by default for baseline observability
