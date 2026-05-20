# Cẩm Nang Toàn Diện Về Better Auth Cho Developer

Tài liệu này là nguồn dữ liệu chuẩn mực duy nhất (**Single Source of Truth**) về việc cấu hình, vận hành và tích hợp **Better Auth** trong hệ sinh thái **FPTU RAG Chatbot**. 

---

## 1. Tổng Quan Kiến Trúc (Architectural Overview)

Better Auth là một thư viện xác thực (authentication framework) thế hệ mới, viết bằng TypeScript, hoạt động theo cơ chế **Web Standard-first** (sử dụng các API chuẩn `Request`, `Response`, `Headers` của trình duyệt và runtime hiện đại). Trong kiến trúc Modular Monolith của dự án, Better Auth đóng vai trò là lõi quản lý định danh và phân quyền.

```mermaid
graph TD
    Client[Next.js Frontend Client] <-->|HTTP Cookies / Custom Headers| Hono[Hono.js Gateway Router]
    Hono <-->|Intercept & Handler Hook| BA[Better Auth Engine]
    BA <-->|Prisma Database Adapter| DB[(PostgreSQL 17 Database)]
```

### Nguyên Tắc Tích Hợp Cốt Lõi:
*   **Tách biệt Authentication khỏi Logic Nghiệp Vụ**: Toàn bộ luồng Auth được tách thành một module riêng biệt (`auth` module). Các module nghiệp vụ khác như `courses`, `documents`, `chat` **không** được truy cập trực tiếp vào DB của Better Auth hoặc gọi trực tiếp các repo nội bộ của auth.
*   **Quản Lý Phiên Bằng Cơ Sở Dữ Liệu (Database-backed Sessions)**: Các session được lưu trữ vật lý trong cơ sở dữ liệu PostgreSQL 17 để dễ dàng thu hồi (revoke), quản lý thiết bị và bảo mật tuyệt đối.
*   **Multi-tenant Cô Lập Quy Mô Lớn**: Sử dụng plugin `organization` để phân hoạch mỗi trường đại học (Tenant) thành một Tổ chức độc lập.

---

## 2. Biến Môi Trường & Kết Nối Database

### 2.1 Cấu Hình Biến Môi Trường (.env)
Bắt buộc tuân thủ quy định **không được tạo file `.env` cục bộ** trong từng thư mục con (`api/` hay `web/`). Tất cả các biến môi trường phải được đặt tại file `.env` ở **thư mục gốc (root)** của dự án.

Các biến môi trường thiết yếu của Better Auth:
```bash
# Lõi Better Auth
BETTER_AUTH_SECRET="your-super-secure-32-char-random-string" # Mã hóa session
BETTER_AUTH_URL="http://localhost:3000"                      # Base URL của Backend API

# Kết nối database dùng cho adapter
DATABASE_URL="postgresql://postgres:admin123@localhost:5433/rag_chatbot?schema=public"
```

> [!CAUTION]
> **Không hardcode Secret**: Tuyệt đối không lưu trực tiếp khóa bí mật trong mã nguồn. Hãy tạo chuỗi ngẫu nhiên bằng lệnh: `openssl rand -base64 32`.

### 2.2 Quy Trình Apply Schema & Đồng Bộ Database
Khi khởi tạo hoặc thay đổi các cấu hình Better Auth và các plugin của nó, quy trình đồng bộ cơ sở dữ liệu phải được thực thi qua Makefile ở thư mục root để đảm bảo gọi đúng phiên bản Prisma tương thích của project (v5.18.0):

```bash
# 1. Tạo file migration và apply vào DB
make migrate

# 2. Tạo Client Prisma
make prisma-generate
```

---

## 3. Đặc Tả Cơ Sở Dữ Liệu Chi Tiết (Database Schema Reference)

Better Auth lưu trữ thông tin thông qua các bảng lõi và các bảng mở rộng từ plugin. Mọi bảng trong PostgreSQL 17 được ánh xạ sang tên viết thường số ít sử dụng chỉ thị `@@map` của Prisma để đồng bộ phong cách thiết kế DB.

```mermaid
erDiagram
    user ||--o{ session : "sở hữu"
    user ||--o{ account : "liên kết"
    user ||--o{ member : "tham gia"
    organization ||--o{ member : "chứa"
    organization ||--o{ invitation : "phát hành"
    
    user {
        string id PK
        string name
        string email UK
        boolean emailVerified
        string image
        datetime createdAt
        datetime updatedAt
        string role "Admin Plugin"
        boolean banned "Admin Plugin"
        string banReason "Admin Plugin"
        datetime banExpires "Admin Plugin"
    }
    session {
        string id PK
        string token UK
        datetime expiresAt
        string userId FK
        string ipAddress
        string userAgent
        string activeOrganizationId "Org Plugin"
        string impersonatedBy "Admin Plugin"
    }
    account {
        string id PK
        string userId FK
        string providerId
        string accountId
        string password
        string accessToken
        string refreshToken
        datetime accessTokenExpiresAt
        datetime refreshTokenExpiresAt
    }
    verification {
        string id PK
        string identifier
        string value
        datetime expiresAt
    }
```

### 3.1 Khai Báo Schema Prisma (`schema.prisma`)

#### A. Các Bảng Xác Thực Cơ Bản (Core Tables)
```prisma
model User {
  id            String    @id
  name          String
  email         String    @unique
  emailVerified Boolean   @default(false)
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Plugin Admin mở rộng
  role          String?   // 'admin', 'user', 'super-admin'
  banned        Boolean?  @default(false)
  banReason     String?
  banExpires    DateTime?

  sessions      Session[]
  accounts      Account[]
  members       Member[]
  invitations   Invitation[]
  chatSessions  ChatSession[] // Quan hệ nghiệp vụ RAG Chat

  @@map("user")
}

model Session {
  id                   String   @id
  expiresAt            DateTime
  token                String   @unique
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  ipAddress            String?
  userAgent            String?
  userId               String
  user                 User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Plugin Organization & Admin mở rộng
  activeOrganizationId String?
  impersonatedBy       String?

  @@index([userId])
  @@map("session")
}

model Account {
  id                    String    @id
  accountId             String
  providerId            String
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  password              String?   // Bắt buộc cho email/password auth
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@map("account")
}

model Verification {
  id         String   @id
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@map("verification")
}
```

> [!IMPORTANT]
> **Quy tắc Model Name của Better Auth**: Better Auth ánh xạ dữ liệu dựa trên **tên Model trong Prisma** chứ không phải tên bảng vật lý dưới DB. Do đó trong cấu hình, luôn khai báo model dạng camelCase (User, Session, Account) thay vì snake_case hoặc plural.

---

## 4. Cấu Hình Server & Tích Hợp Các Plugin

Server core được khởi tạo tại `api/src/modules/auth/auth.ts`:

```typescript
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization, admin, openAPI, twoFactor } from "better-auth/plugins";
import { prisma } from "../database/prisma.service.js"; // DB Service dùng chung

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true, // Cho phép xác thực bằng Email/Mật khẩu
    requireEmailVerification: true, // Bắt buộc xác minh Email
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // Hạn session: 7 ngày
    updateAge: 60 * 60 * 24,     // Cập nhật session sau 1 ngày hoạt động
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,            // Cache cookie 5 phút để tăng hiệu năng đọc
    }
  },
  plugins: [
    // 1. Plugin Phân Quyền Tổ Chức Multi-Tenant
    organization({
      allowUserToCreateOrganization: async (user) => {
        // Chỉ những user có email đã verified mới được tạo tổ chức (Tenant mới)
        return user.emailVerified === true;
      },
      organizationLimit: 5,        // Giới hạn tối đa 5 Tenants/User sở hữu
      membershipLimit: 1000,      // Giới hạn 1000 thành viên/Tenant
      invitationExpiresIn: 60 * 60 * 24 * 7, // Link mời hết hạn sau 7 ngày
    }),
    // 2. Plugin Admin: Phục vụ vận hành & hỗ trợ
    admin(),
    // 3. Plugin Tự Động Tạo OpenAPI Spec cho các router auth
    openAPI(),
    // 4. Plugin Bảo Mật 2 Lớp (2FA / TOTP)
    twoFactor({
      otpLength: 6,
      issuer: "FPTU Chatbot RAG",
    })
  ],
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  }
});
```

---

## 5. Các Plugin Nâng Cao & Luồng Nghiệp Vụ

### 5.1 Plugin Tổ Chức (Organization & Multi-Tenancy)
Mỗi **Organization** đại diện cho một **Tenant** (ví dụ: *FPT University Hanoi*, *FPT University Can Tho*). 

#### Bảng bổ sung trong Schema Prisma:
```prisma
model Organization {
  id          String       @id
  name        String
  slug        String       @unique
  logo        String?
  metadata    String?      // Lưu trữ cấu hình đặc thù của Tenant (JSON string)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  members     Member[]
  invitations Invitation[]

  @@map("organization")
}

model Member {
  id             String       @id
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  userId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  role           String       // 'owner', 'admin', 'member'
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@map("member")
}

model Invitation {
  id             String       @id
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  email          String
  role           String       // Role sẽ nhận khi tham gia
  status         String       // 'pending', 'accepted', 'rejected', 'canceled'
  expiresAt      DateTime
  inviterId      String
  user           User         @relation(fields: [inviterId], references: [id], onDelete: Cascade)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@map("invitation")
}
```

#### Quản Lý Access Control và Safeguard của Tổ Chức:
1.  **Chính Sách Bảo Vệ Chủ Sở Hữu (Owner Protection)**:
    *   Thành viên là Chủ sở hữu cuối cùng (`owner`) **không được phép** rời khỏi tổ chức hoặc bị xóa vai trò trừ khi chuyển quyền sở hữu (`owner`) sang cho thành viên khác trước.
    *   Sử dụng API chuyển giao quyền:
        ```typescript
        await authClient.organization.updateMemberRole({
          memberId: "new-owner-id",
          role: "owner",
        });
        ```
2.  **Cơ Chế Dynamic Access Control**:
    Đăng ký vai trò động (custom roles) dành riêng cho Giảng viên/Sinh viên của từng cơ sở:
    ```typescript
    await authClient.organization.createRole({
      role: "lecturer",
      permission: {
        document: ["create", "read", "update", "delete"],
        chat: ["read"],
      }
    });
    ```

### 5.2 Plugin Bảo Mật 2 Lớp (2FA/MFA)
Cung cấp bảo mật bổ sung cho tài khoản Quản trị viên (Lecturer, Tenant Admin).
*   **Kích hoạt**: User quét mã QR bằng Google Authenticator hoặc Authy, sau đó verify mã TOTP đầu tiên.
*   **Sign-In Flow**:
    ```typescript
    // Bước 1: Sign in thông thường bằng email/password
    const { data } = await authClient.signIn.email({ email, password });
    
    // Nếu có 2FA được bật, data sẽ yêu cầu verify OTP
    if (data?.twoFactorRequired) {
      // Bước 2: Hiển thị form nhập OTP 6 chữ số
      await authClient.twoFactor.verifyTOTP({
        code: "123456"
      });
    }
    ```

---

## 6. Thiết Kế Decoupled: `AuthPublicService`

Để ngăn chặn tuyệt đối việc các module nghiệp vụ khác (như `courses` hay `chat`) gọi trực tiếp vào database của module `auth` gây lỗi phân rã module và phá vỡ quy chuẩn **Modular Monolith**, chúng ta xây dựng một lớp dịch vụ Facade công khai: **`AuthPublicService`** tại `api/src/modules/auth/services/auth.public.service.ts`.

```typescript
import { prisma } from "../../database/prisma.service.js";

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string | null;
}

export interface OrganizationDTO {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
}

export class AuthPublicService {
  /**
   * Lấy thông tin User theo ID và đóng gói vào định dạng DTO an toàn
   */
  static async getUserById(userId: string): Promise<UserDTO | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, image: true, role: true }
    });
    return user;
  }

  /**
   * Lấy thông tin Tenant theo ID
   */
  static async getOrganizationById(orgId: string): Promise<OrganizationDTO | null> {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, slug: true, logo: true }
    });
    return org;
  }

  /**
   * Kiểm tra quyền thành viên của một User trong Tenant
   */
  static async verifyTenantMembership(userId: string, orgId: string): Promise<boolean> {
    const membership = await prisma.member.findFirst({
      where: {
        userId,
        organizationId: orgId,
      }
    });
    return !!membership;
  }
}
```

---

## 7. Tích Hợp Client-Side (Next.js Integration)

Tạo SDK client chuyên dụng ở Frontend để giao tiếp mượt mà với Better Auth Backend:

```typescript
// web/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
import { organizationClient, twoFactorClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
  plugins: [
    organizationClient(),
    twoFactorClient()
  ]
});

// React Hook sử dụng trong Component
export function UserProfile() {
  const { data: session, isPending } = authClient.useSession();
  const { data: activeOrg } = authClient.organization.useActiveOrganization();

  if (isPending) return <div>Đang tải...</div>;
  if (!session) return <div>Chưa đăng nhập</div>;

  return (
    <div>
      <p>Xin chào, {session.user.name}!</p>
      {activeOrg && <p>Cơ sở hiện tại: {activeOrg.name}</p>}
    </div>
  );
}
```

---

## 8. Lỗi Thường Gặp & Cách Khắc Phục (Troubleshooting & Gotchas)

### 1. Lỗi Cookie Không Gửi Được Qua CORS (Cross-Origin Credentials)
*   **Triệu chứng**: Client Next.js (port 3001) gọi Backend Hono.js (port 3000) thành công nhưng không nạp được Session (trả về 401).
*   **Nguyên nhân**: Thiếu cơ chế truyền credentials qua cookie CORS.
*   **Khắc phục**:
    1. Trình duyệt bắt buộc phải cấu hình `credentials: 'include'` khi fetch/axios.
    2. Backend CORS middleware phải whitelist cụ thể domain nguồn (`origin: 'http://localhost:3001'`) và bật `allowHeaders` kèm `allowCredentials: true`. Không được sử dụng ký tự đại diện `*` cho origin khi truyền cookie.

### 2. Quên Đồng Bộ Schema Khai Báo Model Bổ Sung
*   **Triệu chứng**: API Better Auth trả lỗi "Table ... does not exist" hoặc lỗi kiểu dữ liệu Prisma Client.
*   **Khắc phục**: 
    1. Đảm bảo chạy `make migrate` để nạp các bảng Better Auth vào DB.
    2. Chạy `make prisma-generate` để compile lại kiểu dữ liệu của Prisma Client nội bộ module `api`.

---

> [!TIP]
> **Tăng Tốc Trải Nghiệm Người Dùng (UX)**:
> Bật tính năng `session.cookieCache` trong cấu hình Better Auth Server (ở phần 4). Việc này giảm thiểu tới 85% tần suất truy vấn DB của PostgreSQL chỉ để xác thực token trên mỗi request, giúp tốc độ phản hồi API Hono.js duy trì ở mức cực thấp ($\le 15\text{ms}$).
