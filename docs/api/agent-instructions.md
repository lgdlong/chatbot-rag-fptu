# AI Agent Instructions - Writing API Documentation for Chatbot RAG FPTU

Detailed instructions for AI agents to write comprehensive, accurate, and high-quality API documentation for the Chatbot RAG FPTU project.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Documentation Structure](#documentation-structure)
3. [Step-by-Step Process](#step-by-step-process)
4. [Related Documents](#related-documents)

---

## Prerequisites

### Before Writing Documentation

1. **Read the Codebase**
   - Read the Hono controllers: `api/src/modules/**/*.controller.ts`
   - Read the RAG services: `api/src/modules/rag/services/*.ts`
   - Read the repositories: `api/src/modules/**/*.repository.ts`
   - Check the Prisma models: `api/prisma/schema.prisma`
   - Read the environment config: `api/src/config/env.ts`

2. **Understand the Module**
   - What is the module's business logic (RAG ingestion, Chat streaming, Admin approvals, or PayOS payments)?
   - What are the main Prisma models involved (Course, Document, ChatSession, ChatMessage, LecturerRequest, Subscription, Transaction)?
   - What is the exact authorization flow? (Better Auth session cookie, or Worker Bearer token)?
   - What specific errors can occur (e.g. `LIMIT_EXCEEDED` on chat, payload size exceeded, bad PDF format)?

3. **Test the API**
   - Start the local API server using `make dev-api` or `npm run dev` in `api/` directory (running on port `8000`).
   - Use the Swagger UI: `http://localhost:8000/api/docs`
   - Fetch the OpenAPI JSON Spec: `http://localhost:8000/api/doc`
   - Inspect request/response schemas and trigger common error codes.

4. **Follow Project Patterns**
   - Read `docs/api/README.md` for Base URL, auth headers, and standard error formats.
   - Follow the modular structure, using Vietnamese for descriptions and English for technical terminologies.

---

## Documentation Structure

For ease of management and searchability, the API documentation is organized into modular markdown files under `docs/api/` representing the core system modules:

```
docs/api/
├── README.md               # Overview, Auth mechanisms, Base URL, error format
├── api_reference.md        # Table of Contents and navigation index
├── 00_auth.md              # Better Auth SignUp, SignIn, and multi-tenant Org management
├── 00_system.md            # System & Health Check APIs (/api/health)
├── 00_documents.md         # Slide document Ingestion & RAG indexing APIs
├── 00_chat.md              # Chat sessions management & SSE Chat Streaming APIs
├── 00_auth_admin.md        # Lecturer account requests & Admin approvals
└── 00_subscriptions.md     # Plan quotas & PayOS payment integration APIs
```

### Module File Mapping

| Prefix / Module | Purpose | Key Content Requirements |
|:---|:---|:---|
| `00_auth.md` | Better Auth | Session checks, credentials signup/signin, Google OAuth, switches Org |
| `00_system.md` | Health Check | PostgreSQL connections latencyMs, Node.js memory usage, Uptime |
| `00_documents.md` | Ingestion RAG | Uploading PDF, parsing chunks, vector db status webhook |
| `00_chat.md` | Chatbot AI | Chat sessions management, message histories, SSE Stream data, citations |
| `00_auth_admin.md` | Auth & Admin | Lecturer registrations, Admin request listing, approvals with temp passwords |
| `00_subscriptions.md`| Plans & Payments| Daily limit tracking, PayOS checkout URLs, transaction status Webhooks |

---

## Step-by-Step Process

### Phase 1: Analyze the Module

1. **Locate and scan Hono controller files**
   Look under `api/src/modules/` for Hono route registrations (e.g. `export const chatRouter = new Hono()`).

2. **Extract API Details**
   - Identify path, HTTP method, and url prefixes.
   - Trace path parameters (e.g. `:courseId`, `:sessionId`).
   - Note Better Auth check headers (`auth.api.getSession`) or internal key verification (`Authorization: Bearer <INTERNAL_API_KEY>`).
   - Inspect request body payloads parsed via `c.req.json()` or `c.req.parseBody()`.
   - Track database logic via Prisma client transactions.

3. **Validate responses**
   - Capture success response JSON shapes.
   - Note error responses and status codes (e.g. `400` Bad Request, `401` Unauthorized, `403` Limit Exceeded/Forbidden, `409` Conflict).

---

### Phase 2: Writing Module Documentation

For any new module or modifications to existing modules, ensure to structure each endpoint with the following detailed format:

1. **Header with HTTP method and path** (e.g. `### 1. Chi tiết tin nhắn (GET /api/chat/sessions/{sessionId})`)
2. **Mô tả (Description):** Clear description of the endpoint's purpose in Vietnamese.
3. **Xác thực (Authentication):** Specify if auth is required and what type (Better Auth, Bearer Token).
4. **Parameters (Table):** Path, Query, or Header parameters (Name, Type, Required, Description).
5. **Request Body (JSON Example):** If applicable, write down exact JSON schemas and field explanations.
6. **Response Schema:** Document both success (`200 OK`) and error payloads (`400`, `401`, `403`, `500`) with concrete JSON code blocks.

---

## Related Documents

### Guidelines
- **[writing-guidelines.md](./writing-guidelines.md)** - Translation conventions, Mermaid sequence templates, JSON styling.
- **[quality-checklist.md](./quality-checklist.md)** - Standards of completeness, accuracy and formatting.
- **[file-templates.md](./file-templates.md)** - Blueprint examples of modular documentation files.

### Codebase References
- Hono Routes: `api/src/index.ts`
- Controllers: `api/src/modules/**/*.controller.ts`
- Ingestion services: `api/src/modules/rag/services/*.ts`
- Database schema: `api/prisma/schema.prisma`
- OpenAPI config: `api/src/config/openapi.ts`

---

**Last updated:** 2026-05-27
