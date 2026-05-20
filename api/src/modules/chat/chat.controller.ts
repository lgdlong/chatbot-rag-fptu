import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { ChatRepository } from "./repositories/chat.repository.js";
import { RagService } from "../rag/services/rag.service.js";
import { auth } from "../auth/auth.js";
import { prisma } from "../auth/services/db.service.js";
import { DocumentRepository } from "../documents/repositories/document.repository.js";
import { ENV } from "../../config/env.js";

export const chatRouter = new Hono();

import crypto from "node:crypto";

// Dev login route - automatically creates session for user-test-e2e-id
chatRouter.post("/dev-login", async (c) => {
  try {
    // 1. Ensure seed data exists in database
    // Ensure User
    await prisma.user.upsert({
      where: { id: "user-test-e2e-id" },
      update: {},
      create: {
        id: "user-test-e2e-id",
        name: "Sinh viên E2E Test",
        email: "student-test@fpt.edu.vn",
        role: "STUDENT",
      },
    });

    // Ensure Organization
    await prisma.organization.upsert({
      where: { id: "org-test-e2e-id" },
      update: {},
      create: {
        id: "org-test-e2e-id",
        name: "FPT University E2E Test Org",
        slug: "fptu-e2e-test-org",
        createdAt: new Date(),
      },
    });

    // Ensure Member
    await prisma.member.upsert({
      where: { id: "member-test-e2e-id" },
      update: {},
      create: {
        id: "member-test-e2e-id",
        organizationId: "org-test-e2e-id",
        userId: "user-test-e2e-id",
        role: "member",
        createdAt: new Date(),
      },
    });

    // Ensure Account (password credential)
    const passwordHash =
      "299f315028cd53bed28cf3e9006d6393:ff5ad14a24855e26ff311acadf19af30d112bd83bf5ab6d8d9bb827a6f88c313ade1e3d676b54b50b3384dc58dd812076bb4a7188e98c1b92ea027630b8dfaf1"; // SuperPassword123!
    await prisma.account.upsert({
      where: { id: "account-test-e2e-id" },
      update: {
        password: passwordHash,
      },
      create: {
        id: "account-test-e2e-id",
        accountId: "user-test-e2e-id",
        providerId: "credential",
        userId: "user-test-e2e-id",
        password: passwordHash,
      },
    });

    // 2. Perform direct sign-in via auth.handler to get a cryptographically signed session cookie
    const signInReq = new Request(
      `${ENV.BETTER_AUTH_URL}/api/auth/sign-in/email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "student-test@fpt.edu.vn",
          password: "SuperPassword123!",
        }),
      },
    );

    const authRes = await auth.handler(signInReq);
    const setCookie = authRes.headers.get("set-cookie");

    if (!setCookie) {
      throw new Error("Failed to obtain session cookie from auth handler");
    }

    // 3. Propagate the Set-Cookie header to Hono response
    c.header("Set-Cookie", setCookie);

    // 4. Return success and user info
    const responseBody = await authRes.json();

    // 5. Update session in the database to bind to the test organization
    if (responseBody.token) {
      await prisma.session.updateMany({
        where: { token: responseBody.token },
        data: { activeOrganizationId: "org-test-e2e-id" },
      });
    }

    return c.json({
      success: true,
      user: responseBody.user,
      token: responseBody.token,
    });
  } catch (err: any) {
    console.error("Dev login failed:", err);
    return c.json(
      { success: false, error: err.message || "Authentication failed" },
      500,
    );
  }
});

chatRouter.get("/courses", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session || !session.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  let organizationId = session.session.activeOrganizationId;
  if (!organizationId) {
    // Fallback: Find the first organization the user belongs to
    const memberRecord = await prisma.member.findFirst({
      where: { userId: session.user.id },
    });
    if (memberRecord) {
      organizationId = memberRecord.organizationId;
    }
  }

  if (!organizationId) {
    return c.json(
      { error: "Tenant context is missing (Organization ID required)" },
      400,
    );
  }

  try {
    const courses = await prisma.course.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });
    return c.json({ courses });
  } catch (err: any) {
    return c.json({ error: err.message || "Failed to fetch courses" }, 500);
  }
});

// Fetch list of documents for a course
chatRouter.get("/courses/:courseId/documents", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session || !session.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const courseId = c.req.param("courseId");
  try {
    const documents = await DocumentRepository.findManyByCourse(courseId);
    return c.json({ documents });
  } catch (err: any) {
    return c.json({ error: err.message || "Failed to fetch documents" }, 500);
  }
});

// Fetch list of chat sessions
chatRouter.get("/sessions", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session || !session.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const chatSessions = await ChatRepository.findSessionsByUser(
      session.user.id,
    );
    return c.json({ sessions: chatSessions });
  } catch (err: any) {
    return c.json({ error: err.message || "Failed to fetch sessions" }, 500);
  }
});

// Create a new chat session for a course
chatRouter.post("/sessions", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session || !session.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const { courseId } = await c.req.json();
    if (!courseId) {
      return c.json({ error: "courseId is required" }, 400);
    }

    const chatSession = await ChatRepository.createSession({
      user: { connect: { id: session.user.id } },
      course: { connect: { id: courseId } },
    });

    return c.json({ session: chatSession });
  } catch (err: any) {
    return c.json({ error: err.message || "Failed to create session" }, 500);
  }
});

// Fetch specific chat session with its messages
chatRouter.get("/sessions/:sessionId", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session || !session.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const sessionId = c.req.param("sessionId");
  try {
    const chatSession = await ChatRepository.findSessionById(sessionId);
    if (!chatSession) {
      return c.json({ error: "Session not found" }, 404);
    }
    // Verify that session belongs to the user
    if (chatSession.userId !== session.user.id) {
      return c.json({ error: "Unauthorized to view this session" }, 403);
    }
    return c.json({ session: chatSession });
  } catch (err: any) {
    return c.json({ error: err.message || "Failed to fetch session" }, 500);
  }
});

chatRouter.post("/send", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session || !session.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { sessionId, message } = await c.req.json();
  const chatSession = await ChatRepository.findSessionById(sessionId);

  if (!chatSession) {
    return c.json({ error: "Chat session not found" }, 404);
  }

  let organizationId = session.session.activeOrganizationId;
  if (!organizationId) {
    // Fallback: Find the first organization the user belongs to
    const memberRecord = await prisma.member.findFirst({
      where: { userId: session.user.id },
    });
    if (memberRecord) {
      organizationId = memberRecord.organizationId;
    }
  }

  if (!organizationId) {
    return c.json(
      { error: "Tenant context is missing (Organization ID required)" },
      400,
    );
  }

  // Chuyển đổi lịch sử chat của phiên cho phù hợp định dạng Gemini
  const chatHistory = chatSession.messages.map((m) => ({
    role: m.sender === "USER" ? ("user" as const) : ("model" as const),
    parts: [m.content],
  }));

  // Lưu tin nhắn của sinh viên vào SQL DB trước
  await ChatRepository.createMessage({
    session: { connect: { id: sessionId } },
    sender: "USER",
    content: message,
  });

  // Trả về stream SSE trực tuyến cho sinh viên
  return streamSSE(c, async (stream) => {
    let citationsToSend: any[] = [];
    let accumulatedAnswer = "";

    try {
      const ragResult = await RagService.retrieveAndGenerate(
        message,
        chatSession.courseId,
        organizationId,
        chatHistory,
        async (chunk) => {
          accumulatedAnswer += chunk;
          // Stream từng từ về client
          await stream.writeSSE({
            data: JSON.stringify({ chunk }),
            event: "message",
          });
        },
      );

      citationsToSend = ragResult.citations;

      // Gửi toàn bộ citations và kết thúc stream
      await stream.writeSSE({
        data: JSON.stringify({ citations: citationsToSend }),
        event: "citations",
      });

      // Lưu tin nhắn trợ lý AI kèm citations vào PostgreSQL
      await ChatRepository.createMessage({
        session: { connect: { id: sessionId } },
        sender: "ASSISTANT",
        content: accumulatedAnswer,
        citations: citationsToSend as any,
      });
    } catch (err: any) {
      console.error("[Chat Stream Error]:", err);
      await stream.writeSSE({
        data: JSON.stringify({ error: err.message || "Lỗi xử lý AI RAG" }),
        event: "error",
      });
    }
  });
});
