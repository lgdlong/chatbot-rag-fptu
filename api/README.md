# CẨM NANG PHÁT TRIỂN BACKEND API (HONO.JS + TYPESCRIPT)

Thư mục này chứa mã nguồn **Backend API** của dự án FPTU Chatbot RAG. Được xây dựng trên nền tảng **Hono.js** siêu nhẹ và chạy trên môi trường **Node.js** sử dụng **TypeScript**, backend đảm nhận vai trò API Gateway, xử lý xác thực (Better Auth), quản lý cơ sở dữ liệu quan hệ (Prisma ORM), và vận hành pipeline RAG.

---

## 🛠️ Công Nghệ Sử Dụng

* **Core Framework:** [Hono.js](https://hono.dev/) - Nổi tiếng với router siêu nhanh và hỗ trợ Server-Sent Events (SSE) streaming đơn giản.
* **Database Access:** [Prisma ORM](https://www.prisma.io/) - Hỗ trợ thao tác với PostgreSQL / SQLite kiểu an toàn (Type-safe query).
* **Authentication:** [Better Auth](https://www.better-auth.com/) - Thư viện xác thực toàn diện, bảo mật cho các ứng dụng TypeScript.
* **Runtime / Dev tool:** `tsx` để chạy trực tiếp mã TypeScript trong quá trình phát triển mà không cần bước compile trung gian.

---

## 📂 Cấu Trúc Mã Nguồn

```
api/
├── prisma/                    # Cấu hình Cơ sở dữ liệu
│   ├── schema.prisma          # Đặc tả các bảng dữ liệu (Prisma Schema)
│   └── dev.db                 # Database SQLite cục bộ phục vụ phát triển nhanh
├── src/                       # Thư mục chứa mã nguồn chính
│   ├── config/                # Cấu hình & Validate biến môi trường (Zod validation)
│   │   └── env.ts
│   ├── constants/             # Các hằng số dùng chung toàn hệ thống
│   ├── middlewares/           # Bộ lọc trung gian (Auth, CORS, Multi-tenant guard)
│   │   ├── auth.middleware.ts
│   │   └── tenant.middleware.ts
│   ├── modules/               # Các module chức năng theo kiến trúc Module-based
│   │   └── auth/              # Module Xác thực (Better Auth setup & routes)
│   │       ├── auth.ts        # File cấu hình chính Better Auth
│   │       └── services/      # Các service xử lý logic database
│   ├── types/                 # Các định nghĩa kiểu TypeScript mở rộng
│   ├── utils/                 # Tiện ích bổ trợ (Logger, Cryptography, v.v.)
│   └── index.ts               # File khởi chạy server chính
├── package.json               # Quản lý dependency và script chạy
└── tsconfig.json              # Cấu hình trình biên dịch TypeScript
```

---

## ⚡ Hướng Dẫn Cài Đặt & Chạy Phát Triển

### 1. Cài đặt các thư viện
Di chuyển vào thư mục `api/` hoặc chạy trực tiếp từ thư mục gốc thông qua Makefile/CLI:
```bash
# Thực hiện tại thư mục gốc:
npm --prefix api install
```

### 2. Cấu hình Cơ sở dữ liệu (Prisma)
Nếu đây là lần đầu khởi chạy, bạn cần đẩy cấu hình bảng dữ liệu vào file Database SQLite (được cấu hình mặc định cho local dev):
```bash
# Thực hiện đồng bộ cấu hình schema sang cơ sở dữ liệu
make migrate

# Hoặc chạy lệnh thủ công trong thư mục api:
# npx prisma db push --schema=prisma/schema.prisma
```

Sau đó, sinh ra thư viện Prisma Client để các module có thể truy vấn:
```bash
make prisma-generate

# Hoặc chạy lệnh thủ công trong thư mục api:
# npx prisma generate --schema=prisma/schema.prisma
```

### 3. Chạy server ở chế độ Development (Watch mode)
Server sẽ tự động khởi chạy tại cổng **`3000`** và tự động reload mỗi khi bạn thay đổi code:
```bash
make dev-api

# Hoặc chạy lệnh thủ công trong thư mục api:
# npm run dev
```

### 4. Kiểm tra Database trực quan (Prisma Studio)
Prisma cung cấp một công cụ giao diện web rất đẹp mắt để quản lý và chỉnh sửa trực tiếp dữ liệu trong database:
```bash
make prisma-studio

# Hoặc chạy lệnh thủ công trong thư mục api:
# npx prisma studio --schema=prisma/schema.prisma
```

---

## 📡 Các API Endpoints Sẵn Có

Backend cung cấp các API RESTful chính, đáp ứng tiêu chuẩn an toàn và hiệu năng cao:

### 1. Chi tiết API Giám sát Sức Khỏe (`GET /api/health`)
* **Mô tả:** Trả về trạng thái chi tiết của server, đo đạc độ trễ kết nối database thời gian thực, giám sát bộ nhớ (RSS, Heap memory) và thông tin runtime.
* **Định dạng phản hồi mẫu:**
```json
{
  "status": "UP",
  "timestamp": "2026-05-20T05:00:00.000Z",
  "latencyMs": 12,
  "services": {
    "database": {
      "status": "UP",
      "latencyMs": 2
    }
  },
  "system": {
    "uptimeSeconds": 1204.5,
    "memoryUsage": {
      "rss": "45.2 MB",
      "heapTotal": "32.1 MB",
      "heapUsed": "18.4 MB",
      "external": "1.2 MB"
    },
    "nodeVersion": "v20.11.0",
    "platform": "win32"
  }
}
```

### 2. API Xác thực người dùng (`GET /POST /api/auth/*`)
* **Mô tả:** Các endpoint xử lý đăng ký, đăng nhập, phân quyền, quản lý tổ chức (Tenant/School), do thư viện Better Auth quản lý.
* **Các route chính:**
  * `POST /api/auth/sign-up`: Đăng ký tài khoản mới bằng Email/Password.
  * `POST /api/auth/sign-in`: Đăng nhập hệ thống.
  * `POST /api/auth/sign-out`: Đăng xuất và xóa session.
  * `GET /api/auth/get-session`: Lấy thông tin phiên làm việc hiện tại của người dùng.

---

## 🔒 Quy Tắc Bảo Mật & Multi-tenant

Mọi API xử lý dữ liệu học tập đều được bảo vệ bởi hai Middleware cốt lõi:
1. **Xác thực phiên (`requireAuth`):** Đảm bảo request đi kèm cookie/token hợp lệ.
2. **Cô lập dữ liệu (`requireTenant`):** Đọc header `x-tenant-id` từ Client và lọc dữ liệu tương ứng trong database, ngăn ngừa triệt để các lỗ hổng rò rỉ dữ liệu xuyên Tenant.
