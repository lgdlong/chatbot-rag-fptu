import { Hono, type Context } from "hono";
import { writeFile, mkdir, readdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { Redis as RedisClient } from "ioredis";
import { DocumentRepository } from "../documents/repositories/document.repository.js";
import { auth } from "../auth/auth.js";
import { prisma } from "../auth/services/db.service.js";
import { ENV } from "../../config/env.js";

export const ragRouter = new Hono();

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

/**
 * Tải file và kích hoạt index tài liệu vào Vector DB
 */
ragRouter.post("/:courseId/documents", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session || !session.user) {
    return c.json({ error: "Unauthorized" }, 401);
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
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session || !session.user) {
    return c.json({ error: "Unauthorized" }, 401);
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
