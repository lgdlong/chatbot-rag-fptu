import { Hono } from "hono";
import { prisma } from "./services/db.service.js";
import { auth } from "./auth.js";

export const lecturerAdminRouter = new Hono();
const lecturerEmailPattern = /^[^\s@]+@fpt\.edu\.vn$/i;

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
  const payload = await c.req.json();
  const name = String(payload?.name ?? "").trim();
  const email = String(payload?.email ?? "").trim().toLowerCase();
  const reason = String(payload?.reason ?? "").trim();

  if (!name || !email || !reason) {
    return c.json({ error: "Name, email, and reason are required" }, 400);
  }

  if (!lecturerEmailPattern.test(email)) {
    return c.json({ error: "Only @fpt.edu.vn emails are allowed for lecturer requests" }, 400);
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
        status: "PENDING",
      },
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

    const existingUser = await prisma.user.findUnique({ where: { email: request.email } });
    if (existingUser) {
      return c.json({ error: "Email is already registered in the system" }, 409);
    }

    const temporaryPassword = `Lecturer@${Math.floor(100000 + Math.random() * 900000)}`;
    const signUpResult = await auth.api.signUpEmail({
      body: {
        name: request.name,
        email: request.email,
        password: temporaryPassword,
      },
    });

    await prisma.$transaction([
      prisma.user.update({
        where: { id: signUpResult.user.id },
        data: {
          role: "LECTURER",
          emailVerified: true,
        },
      }),
      prisma.lecturerRequest.update({
        where: { id: requestId },
        data: { status: "APPROVED" },
      }),
    ]);

    return c.json({
      success: true,
      message: "Lecturer account created successfully",
      credentials: {
        email: request.email,
        temporaryPassword,
      },
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
    const request = await prisma.lecturerRequest.findUnique({ where: { id: requestId } });
    if (!request) {
      return c.json({ error: "Request not found" }, 404);
    }

    if (request.status !== "PENDING") {
      return c.json({ error: "Request is already processed" }, 400);
    }

    await prisma.lecturerRequest.update({ where: { id: requestId }, data: { status: "REJECTED" } });
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message || "Failed to reject request" }, 500);
  }
});
