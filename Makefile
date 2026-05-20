.PHONY: db-up db-down db-logs db-status migrate prisma-generate prisma-studio dev-api dev-web build-api build-web health-check

# Database Commands
db-up:
	docker compose up -d

db-down:
	docker compose down

db-logs:
	docker compose logs -f

db-status:
	docker compose ps

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

build-api:
	npm --prefix api run build

build-web:
	npm --prefix web run build

health-check:
	npx tsx --env-file=.env -e "import('./api/src/index.ts').then(m => m.app.request('/api/health').then(r => r.json().then(j => console.log('Response Status:', r.status, '\nResponse Body:\n', JSON.stringify(j, null, 2)))))"
