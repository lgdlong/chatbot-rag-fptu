# CLAUDE.md — Agent & Developer Instruction Guide

This file provides a direct technical reference for AI agents and developers working inside this monorepo. It details project commands, directory layout, environment rules, and engineering policies.

---

## 🛠️ CLI Command Map

The root folder provides a `Makefile` to quickly invoke workspace-specific commands. Alternatively, you can run them inside individual subdirectories.

### Global Makefile Commands (Run from root)
- Start development database: `make db-up`
- Stop development database: `make db-down`
- View database containers status: `make db-status`
- View docker database logs: `make db-logs`
- Push schema to database: `make migrate`
- Generate Prisma Client: `make prisma-generate`
- Launch Prisma Studio GUI: `make prisma-studio`
- Start Backend dev server: `make dev-api`
- Start Frontend dev server: `make dev-web`
- Build Backend api: `make build-api`
- Build Frontend web: `make build-web`
- Run Backend integration health-check: `make health-check`

### Workspace: Backend API (`api/`)
- **Working Directory (`Cwd`):** `./api`
- Initialize and install dependencies: `npm install`
- Start watch server: `npm run dev` (Runs Hono.js on Port `8000` via `tsx watch`)
- Compile typescript files: `npm run build`
- Deploy Prisma schema: `npx prisma db push`
- Generate Prisma client: `npx prisma generate`

### Workspace: Frontend Web (`web/`)
- **Working Directory (`Cwd`):** `./web`
- Initialize and install dependencies: `npm install`
- Start development application: `npm run dev` (Runs Next.js on Port `3000`)
- Validate TypeScript & ESLint rules: `npm run lint`
- Build Next.js production bundle: `npm run build`

---

## 📂 Project Monorepo Structure

```
chatbot-rag-fptu/
├── .agents/                    # Custom agent instructions, rules & skills
│   ├── rules/                  # Development & system workflow rules (e.g. git-and-commit-rules.md)
│   └── skills/                 # Custom libraries (Better Auth, Vercel React etc.)
├── api/                        # Backend Workspace (Hono.js API server)
│   ├── prisma/                 # Database schema definitions & migrations
│   └── src/                    # Hono.js core source files
│       ├── config/             # Central env validations and configs
│       ├── constants/          # Application global constants
│       ├── middlewares/        # Security, Auth & Tenant middleware
│       ├── modules/            # Domain-driven features (Auth, RAG, etc.)
│       └── utils/              # Global application helper utilities
├── database/                   # Docker-compose PostgreSQL DB configuration
├── docs/                       # Core project documentation & RAG research
├── web/                        # Frontend Workspace (Next.js 15+ App Router)
│   └── app/                    # Web layouts, pages, and dynamic RAG client UI
├── .env.example                # Centralized environment variable template
├── AGENTS.md                   # Human & Agent developer guides (Vietnamese)
├── Makefile                    # Multi-workspace developer command targets
└── README.md                   # Core product overview (Vietnamese)
```

---

## 🔒 Centralized Environment Variable Policy

> [!IMPORTANT]
> **Zero Local Environment Files Policy:**
> - **NEVER** create or use local `.env` files in `api/` or `web/` workspaces. 
> - All environment variables **MUST** reside strictly inside a single `.env` file at the **root** of the monorepo.
> - Workspaces will automatically load configuration parameters from the root `.env` file during local runtimes.
> - **NEVER** commit the `.env` file to git. Ensure it remains ignored by the root `.gitignore`.

---

## 📐 Coding & Quality Rules

1. **Type Safety:** Always write strict TypeScript. Avoid using the explicit `any` type. Define clear interfaces for API requests, parameters, and RAG search results.
2. **Hono.js Best Practices:** Use standard Web APIs. Always validate input schemas using Zod validation. Apply `requireAuth` and `requireTenant` middlewares to secure data boundaries.
3. **Better Auth Decoupling:** Keep business logic isolated from authentication libraries. Use intermediate interfaces (`AuthPublicService`) to prevent dependency lock-in.
4. **Next.js 15 Optimization:** Use Server Components (RSC) by default for layout skeleton and static content. Add `'use client'` only when utilizing state hook (`useState`, `useEffect`) or listening to real-time RAG Server-Sent Events (SSE).
5. **Security Isolation:** All RAG indices must be segmented logically using `tenantId`. Never retrieve vector stores or file paths belonging to another school or tenant.
