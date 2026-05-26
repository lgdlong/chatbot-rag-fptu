import { Hono } from "hono";
import { prisma } from "./services/db.service.js";
import { auth } from "./auth.js";
import crypto from "node:crypto";

export const lecturerAdminRouter = new Hono();

// Helper kiểm tra quyền Admin
async function checkAdmin(c: any) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session || !session.user || session.user.role !== "ADMIN") {
    return null;
  }
  return session;
}

// 1. Giảng viên gửi yêu cầu cấp tài khoản (Không cần đăng nhập)
lecturerAdminRouter.post("/lecturer-request", async (c) => {
  const { name, email, reason } = await c.req.json();

  if (!name || !email || !reason) {
    return c.json({ error: "Name, email, and reason are required" }, 400);
  }

  try {
    // Kiểm tra xem email đã tồn tại trong danh sách User chưa
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return c.json({ error: "Email is already registered in the system" }, 409);
    }

    const request = await prisma.lecturerRequest.create({
      data: {
        name,
        email,
        reason,
        status: "PENDING"
      }
    });

    return c.json({ success: true, request });
  } catch (err: any) {
    if (err.code === "P2002") {
      return c.json({ error: "You have already submitted a request with this email" }, 409);
    }
    return c.json({ error: err.message || "Failed to submit request" }, 500);
  }
});

// 2. Admin lấy danh sách yêu cầu
lecturerAdminRouter.get("/admin/lecturer-requests", async (c) => {
  if (!(await checkAdmin(c))) {
    return c.json({ error: "Forbidden: Admin access required" }, 403);
  }

  try {
    const requests = await prisma.lecturerRequest.findMany({
      orderBy: { createdAt: "desc" }
    });
    return c.json({ requests });
  } catch (err: any) {
    return c.json({ error: err.message || "Failed to fetch requests" }, 500);
  }
});

// 3. Admin phê duyệt yêu cầu (Tạo tài khoản LECTURER)
lecturerAdminRouter.post("/admin/lecturer-requests/:requestId/approve", async (c) => {
  if (!(await checkAdmin(c))) {
    return c.json({ error: "Forbidden: Admin access required" }, 403);
  }

  const requestId = c.req.param("requestId");

  try {
    const request = await prisma.lecturerRequest.findUnique({ where: { id: requestId } });
    if (!request) {
      return c.json({ error: "Request not found" }, 404);
    }

    if (request.status !== "PENDING") {
      return c.json({ error: "Request is already processed" }, 400);
    }

    // 1. Tạo tài khoản User với role LECTURER
    const userId = crypto.randomUUID();
    const tempPassword = `Lecturer@${crypto.randomInt(100000, 999999)}`; // Mật khẩu tạm thời
    
    // Hash mật khẩu theo định dạng của Better Auth (salt:pbkdf2)
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.pbkdf2Sync(tempPassword, salt, 1000, 64, "sha512").toString("hex");
    const passwordHash = `${salt}:${hash}`;

    await prisma.$transaction([
      prisma.user.create({
        data: {
          id: userId,
          name: request.name,
          email: request.email,
          role: "LECTURER",
        }
      }),
      prisma.account.create({
        data: {
          id: crypto.randomUUID(),
          accountId: userId,
          providerId: "credential",
          userId: userId,
          password: passwordHash,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }),
      prisma.lecturerRequest.update({
        where: { id: requestId },
        data: { status: "APPROVED" }
      })
    ]);

    // Trả về mật khẩu tạm thời cho Admin hiển thị/demo
    return c.json({
      success: true,
      message: "Lecturer account created successfully",
      credentials: {
        email: request.email,
        temporaryPassword: tempPassword
      }
    });
  } catch (err: any) {
    return c.json({ error: err.message || "Failed to approve request" }, 500);
  }
});

// 4. Admin từ chối yêu cầu
lecturerAdminRouter.post("/admin/lecturer-requests/:requestId/reject", async (c) => {
  if (!(await checkAdmin(c))) {
    return c.json({ error: "Forbidden: Admin access required" }, 403);
  }

  const requestId = c.req.param("requestId");

  try {
    await prisma.lecturerRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED" }
    });
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message || "Failed to reject request" }, 500);
  }
});
