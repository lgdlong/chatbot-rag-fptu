# CODEBASE SUMMARY
## Tổng Quan Mã Nguồn

Tài liệu này tổng hợp thống kê và phân tích cấu trúc mã nguồn của dự án **FPTU Chatbot RAG** dựa trên báo cáo scout.

---

## 1. Thống Kê Tổng Quan

| Metric | Value |
|--------|-------|
| **Total Source Files** | ~25 TypeScript/TSX |
| **Total LOC** | ~3,196 (excluding node_modules) |
| **API Endpoints** | ~15+ |
| **Tech Stack** | Hono.js, Next.js, Prisma, TypeScript |

---

## 2. Technology Stack

### Backend (api/)
| Library | Version |
|---------|---------|
| Hono.js | 4.12.19 |
| TypeScript | 5.8.3 |
| Prisma | 5.18.0 |
| better-auth | 1.6.11 |
| Redis | latest |
| Zod | latest |

### Frontend (web/)
| Library | Version |
|---------|---------|
| Next.js | 16.2.6 |
| React | 19.2.4 |
| Tailwind CSS | 4 |
| TanStack Query | latest |

### Infrastructure
| Service | Technology |
|---------|------------|
| Relational DB | PostgreSQL (Docker) |
| Cache/Session | Redis |
| Vector DB | Qdrant |
| AI Embedding | Gemini 2.0 (embedding-002, 3072-dim) |
| AI Chat | Gemini 2.0 (streaming) |

---

## 3. Module Breakdown

| Module | Files | LOC | Mô tả |
|--------|-------|-----|------|
| **Auth Module** | 5 | 135 | Xác thực, Authorization, Organization Plugin |
| **Chat Module** | 2 | 376 | SSE Streaming, Chat History |
| **RAG Module** | 4 | 534 | Vector Search, Prompt Engineering, Citations |
| **Courses Module** | 1 | 34 | Course CRUD |
| **Documents Module** | 2 | 70 | Document Upload, Deletion |
| **Frontend Pages** | 5 | 1,435 | Dashboard, Chat UI |

---

## 4. Cấu Trúc Thư Mục

```
chatbot-rag-fptu/
├── api/                          # Backend Workspace
│   ├── prisma/                  # Database schema
│   │   └── schema.prisma
│   └── src/
│       ├── config/               # Environment validation
│       ├── constants/            # App constants
│       ├── middlewares/         # Auth, Tenant middleware
│       ├── modules/
│       │   ├── auth/            # Better Auth integration
│       │   ├── chat/           # Chat endpoints
│       │   ├── courses/        # Course CRUD
│       │   ├── documents/      # Document management
│       │   └── rag/            # RAG pipeline
│       └── utils/              # Helper utilities
├── web/                         # Frontend Workspace
│   └── app/
│       ├── (auth)/             # Auth pages
│       ├── (dashboard)/       # Protected pages
│       └── api/                # API routes
├── docs/                        # Documentation
├── database/                    # Docker compose
├── Makefile
└── README.md
```

---

## 5. API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Đăng ký
- `POST /api/v1/auth/sign-in` - Đăng nhập
- `GET /api/v1/auth/session` - Lấy session

### Courses
- `GET /api/v1/courses` - Danh sách khóa học
- `POST /api/v1/courses` - Tạo khóa học
- `GET /api/v1/courses/:id` - Chi tiết khóa học

### Documents
- `GET /api/v1/courses/:courseId/documents` - Danh sách tài liệu
- `POST /api/v1/courses/:courseId/documents` - Tải lên tài liệu
- `DELETE /api/v1/courses/:courseId/documents/:id` - Xóa tài liệu

### Chat
- `POST /api/v1/chat/sessions` - Tạo phiên chat
- `POST /api/v1/chat/send` - Gửi tin nhắn (SSE)
- `GET /api/v1/chat/history/:sessionId` - Lịch sử chat

---

## 6. Key Integrations

### Gemini API
- **Embedding:** gemini-embedding-002 (3072 chiều)
- **Chat:** Streaming via Gemini 2.0
- **Multimodal:** Hỗ trợ Video/Audio native

### Qdrant Vector DB
- **Collection:** documents, conversations
- **Filtering:** organization_id + course_id
- **Payload:** text, page, timestamp

### Better Auth
- **Plugins:** Organization, Admin, Email/Password
- **Adapter:** Prisma
- **Session:** JWT + Redis cache

---

## 7. Quy Ước Code

| Convention | Rule |
|-----------|------|
| **Types** | PascalCase (`UserDto`, `ChatMessage`) |
| **Variables** | camelCase (`userId`, `isActive`) |
| **Constants** | UPPER_SNAKE_CASE (`MAX_FILE_SIZE`) |
| **Files** | kebab-case (`user-service.ts`) |
| **Strict Types** | `unknown` + type guard, KHÔNG `any` |

---

## 8. Security Requirements

- **Multi-tenant:** Mọi query phải có `tenantId` filter
- **Auth:** Session validation trên mọi protected endpoint
- **Input:** Zod validation trước khi xử lý logic
- **Headers:** JWT token chứa `tenantId`, `userId`, `role`

---

## 9. Development Commands

```bash
# Database
make db-up          # Khởi chạy PostgreSQL
make db-down        # Dừng PostgreSQL

# Backend
make dev-api       # Chạy Hono.js dev server
make build-api     # Build production

# Frontend
make dev-web       # Chạy Next.js dev server
make build-web    # Build production

# Utilities
make migrate       # Push Prisma schema
make prisma-generate # Generate Prisma Client
```

---

> **Last Updated:** 2026-05-20
> **Source:** Scout Report