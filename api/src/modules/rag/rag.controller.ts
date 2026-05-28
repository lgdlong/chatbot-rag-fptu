import { Hono, type Context } from "hono";
import { writeFile, mkdir, readdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { Redis as RedisClient } from "ioredis";
import { DocumentRepository } from "../documents/repositories/document.repository.js";
import { auth } from "../auth/auth.js";
import { prisma } from "../auth/services/db.service.js";
import { ENV } from "../../config/env.js";

export const ragRouter = new Hono();

type CourseListItem = {
  id: string;
  code: string;
  name: string;
  createdAt: Date;
  documentCount: number;
};

function isLecturerOrAdmin(role: string | null | undefined) {
  return role === "LECTURER" || role === "ADMIN";
}

async function removeFileIfExists(filePath: string) {
  try {
    await unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

async function removeChunkFiles(documentId: string) {
  const chunksDir = join(".", "uploads", "chunks");

  try {
    const files = await readdir(chunksDir);
    const chunkFiles = files.filter(
      (fileName) =>
        fileName.startsWith(`${documentId}_page_`) && fileName.endsWith(".pdf"),
    );

    await Promise.all(
      chunkFiles.map((fileName) =>
        removeFileIfExists(join(chunksDir, fileName)),
      ),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

async function requireLecturerOrAdmin(c: Context) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return { error: c.json({ error: "Unauthorized" }, 401) as Response, session: null };
  }

  if (!isLecturerOrAdmin(session.user.role)) {
    return { error: c.json({ error: "Forbidden: Lecturer access required" }, 403) as Response, session: null };
  }

  return { error: null, session };
}

ragRouter.get("/", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const courses = await prisma.course.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            documents: true,
          },
        },
      },
    });

    const payload = courses.map((course) => ({
      id: course.id,
      code: course.code,
      name: course.name,
      createdAt: course.createdAt,
      documentCount: course._count.documents,
    })) satisfies CourseListItem[];

    return c.json({ courses: payload });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch courses";
    return c.json({ error: message }, 500);
  }
});

ragRouter.post("/", async (c) => {
  const authResult = await requireLecturerOrAdmin(c);
  if (authResult.error) {
    return authResult.error;
  }

  try {
    const body = (await c.req.json().catch(() => ({}))) as { code?: unknown; name?: unknown };
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!code || !name) {
      return c.json({ error: "Course code and name are required" }, 400);
    }

    const duplicateCourse = await prisma.course.findFirst({
      where: {
        code: {
          equals: code,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (duplicateCourse) {
      return c.json({ error: "Course code already exists" }, 409);
    }

    const course = await prisma.course.create({
      data: {
        code,
        name,
      },
    });

    return c.json(
      {
        course: {
          id: course.id,
          code: course.code,
          name: course.name,
          createdAt: course.createdAt,
          documentCount: 0,
        },
      },
      201,
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create course";
    return c.json({ error: message }, 500);
  }
});

ragRouter.patch("/:courseId", async (c) => {
  const authResult = await requireLecturerOrAdmin(c);
  if (authResult.error) {
    return authResult.error;
  }

  const courseId = c.req.param("courseId");

  try {
    const body = (await c.req.json().catch(() => ({}))) as { code?: unknown; name?: unknown };
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!code || !name) {
      return c.json({ error: "Course code and name are required" }, 400);
    }

    const existingCourse = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });

    if (!existingCourse) {
      return c.json({ error: "Course not found" }, 404);
    }

    const duplicateCourse = await prisma.course.findFirst({
      where: {
        code: {
          equals: code,
          mode: "insensitive",
        },
        NOT: {
          id: courseId,
        },
      },
      select: { id: true },
    });

    if (duplicateCourse) {
      return c.json({ error: "Course code already exists" }, 409);
    }

    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data: {
        code,
        name,
      },
      include: {
        _count: {
          select: {
            documents: true,
          },
        },
      },
    });

    return c.json({
      course: {
        id: updatedCourse.id,
        code: updatedCourse.code,
        name: updatedCourse.name,
        createdAt: updatedCourse.createdAt,
        documentCount: updatedCourse._count.documents,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update course";
    return c.json({ error: message }, 500);
  }
});

ragRouter.delete("/:courseId", async (c) => {
  const authResult = await requireLecturerOrAdmin(c);
  if (authResult.error) {
    return authResult.error;
  }

  const courseId = c.req.param("courseId");

  try {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        code: true,
        name: true,
        _count: {
          select: {
            documents: true,
          },
        },
      },
    });

    if (!course) {
      return c.json({ error: "Course not found" }, 404);
    }

    if (course._count.documents > 0) {
      return c.json(
        {
          error: "Course still has documents. Delete all documents before removing the course.",
        },
        409,
      );
    }

    await prisma.course.delete({
      where: { id: courseId },
    });

    return c.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete course";
    return c.json({ error: message }, 500);
  }
});

ragRouter.get("/:courseId/documents", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const courseId = c.req.param("courseId");
  try {
    const documents = await prisma.document.findMany({
      where: { courseId },
      orderBy: { createdAt: "desc" },
    });
    return c.json({ documents });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch documents";
    return c.json({ error: message }, 500);
  }
});

/**
 * Tải file và kích hoạt index tài liệu vào Vector DB
 */
ragRouter.post("/:courseId/documents", async (c) => {
  const authResult = await requireLecturerOrAdmin(c);
  if (authResult.error) {
    return authResult.error;
  }

  const courseId = c.req.param("courseId");

  const body = await c.req.parseBody();
  const file = body.file;

  if (!file || !(file instanceof File)) {
    return c.json({ error: "No file uploaded or invalid file format" }, 400);
  }

  // Edge case: Kiểm tra dung lượng file (dưới 50MB theo yêu cầu SRS)
  if (file.size > 50 * 1024 * 1024) {
    return c.json({ error: "File size exceeds the maximum limit of 50MB" }, 400);
  }

  // Edge case: Kiểm tra định dạng file an toàn cho Ingestion Worker (Golang pdfcpu)
  const fileExtension = file.name.split(".").pop()?.toLowerCase();
  if (fileExtension !== "pdf") {
    return c.json({ 
      error: "Unsupported file format. Please export your slide or document to PDF format before uploading." 
    }, 400);
  }

  // 1. Tạo document record ở trạng thái PENDING
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Lưu file vào disk để worker có thể đọc
  const fileName = `${Date.now()}_${file.name}`;
  const fileDir = "./uploads";
  await mkdir(fileDir, { recursive: true });

  const filePath = `/uploads/${fileName}`;
  await writeFile(`.${filePath}`, buffer);

  const doc = await DocumentRepository.create({
    name: file.name,
    fileUrl: filePath,
    fileType: file.name.split(".").pop() || "pdf",
    status: "PENDING",
    course: { connect: { id: courseId } },
  });

  // 2. Chạy tiến trình đẩy Job vào Redis Queue bằng Redis LPUSH (Non-blocking)
  const redisClient = new RedisClient({ host: ENV.REDIS_HOST, port: 6379 });

  const jobPayload = {
    documentId: doc.id,
    organizationId: "org-default", // Truyền giá trị cố định để tương thích với Go worker payload struct
    courseId,
    filePath: `.${filePath}`,
    documentName: doc.name,
  };

  try {
    await redisClient.lpush("rag:ingestion:queue", JSON.stringify(jobPayload));
  } catch (error) {
    console.error("[RagController] Redis enqueue error:", error);
    return c.json({ error: "Failed to queue ingestion job" }, 500);
  } finally {
    await redisClient.quit();
  }

  return c.json({
    success: true,
    document: {
      id: doc.id,
      name: doc.name,
      status: "PROCESSING",
    },
  });
});

export async function deleteDocumentHandler(c: Context) {
  const authResult = await requireLecturerOrAdmin(c);
  if (authResult.error) {
    return authResult.error;
  }

  const courseId = c.req.param("courseId");
  const documentId = c.req.param("documentId");

  const course = await prisma.course.findFirst({
    where: { id: courseId },
    select: { id: true },
  });

  if (!course) {
    return c.json({ error: "Unauthorized to access this course" }, 403);
  }

  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      courseId,
    },
    include: {
      course: true,
    },
  });

  if (!document) {
    return c.json({ success: true });
  }

  if (document.status === "PENDING" || document.status === "PROCESSING") {
    return c.json(
      { error: "Document is still processing and cannot be deleted" },
      409,
    );
  }

  try {
    const originalFilePath = join(".", document.fileUrl.replace(/^\/+/, ""));
    await removeFileIfExists(originalFilePath);
    await removeChunkFiles(documentId!);
    await DocumentRepository.delete(documentId!);

    return c.json({ success: true });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return c.json({ success: true });
    }

    console.error("[RagController] Failed to delete document:", error);
    return c.json({ error: "Failed to delete document" }, 500);
  }
}

ragRouter.delete("/:courseId/documents/:documentId", deleteDocumentHandler);
