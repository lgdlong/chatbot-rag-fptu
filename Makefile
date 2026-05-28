.PHONY: db-up db-down db-logs db-status db-reset migrate prisma-generate prisma-studio install dev-api dev-web dev-all worker build-api build-web build-all lint-api lint-web test clean health-check

# Install Dependencies
install:
	npm --prefix api install
	npm --prefix web install

# Database Commands
db-up:
	docker compose up -d

db-down:
	docker compose down

db-logs:
	docker compose logs -f

db-status:
	docker compose ps

db-reset:
	docker compose down -v
	docker compose up -d

# Prisma Database & Migration Commands
migrate:
	npx --prefix api prisma db push --schema=api/prisma/schema.prisma

prisma-generate:
	npx --prefix api prisma generate --schema=api/prisma/schema.prisma

prisma-studio:
	npx --prefix api prisma studio --schema=api/prisma/schema.prisma

# Development Commands
dev-api:
	npm --prefix api run dev

dev-web:
	npm --prefix web run dev

dev-all:
	@echo "Starting API, Web, and Worker..."
	@npm --prefix api run dev & \
	npm --prefix web run dev & \
	powershell -NoProfile -ExecutionPolicy Bypass -File services/ingestion-worker/run.ps1

# Ingestion Worker
worker:
	powershell -NoProfile -ExecutionPolicy Bypass -File services/ingestion-worker/run.ps1

# Build Commands
build-api:
	npm --prefix api run build

build-web:
	npm --prefix web run build

build-all: build-api build-web

# Lint Commands
lint-api:
	npm --prefix api run lint

lint-web:
	npm --prefix web run lint

# Test Commands
test:
	npm --prefix api run test

# Clean Commands
clean:
	rm -rf api/dist web/.next
	rm -rf api/node_modules/.cache

# Health Check
health-check:
	npx tsx --env-file=.env -e "import('./api/src/index.ts').then(m => m.app.request('/api/health').then(r => r.json().then(j => console.log('Response Status:', r.status, '\nResponse Body:\n', JSON.stringify(j, null, 2)))))"

# Docker Build & Push Targets (Production)
docker-build:
	docker build -t lgdlong/chatbot-swd-api:latest ./api
	docker build -t lgdlong/chatbot-swd-worker:latest ./services/ingestion-worker

docker-push:
	docker push lgdlong/chatbot-swd-api:latest
	docker push lgdlong/chatbot-swd-worker:latest

docker-all: docker-build docker-push
