# Requirements

## Project Idea
A web app named PerspectiveCheck focused on inspecting 3D files with a lightweight, fast AWS deployment baseline.

## Functional Requirements
- Provide a frontend scaffold for PerspectiveCheck with API connectivity checks
- Provide a backend scaffold with a health endpoint
- Provide infrastructure as code scaffolding for AWS Amplify and AWS Lambda + API Gateway
- Set a path for 3D inspection support for STL, 3MF, OBJ, FBX, glTF, and GLB
- Provide CI checks for linting, type checks, build, tests, and infra validation

## Non Functional Requirements
- Lightweight dependency footprint and fast local startup
- Reliable baseline quality gates for pull requests
- Clear environment configuration and no committed secrets
- AWS deployment guidance for frontend and backend
- Remote state split per environment for safe infra changes
- Baseline logging and tracing for deployed backend resources
