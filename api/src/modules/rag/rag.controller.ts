import { Hono, type Context } from "hono";
import { writeFile, mkdir, readdir, unlink } from "node:fs/promises";
import { join } from "node:path";
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

    // Sync create workspace with AnythingLLM
    try {
      console.log(`[Creation] Syncing Course Creation: Ensuring AnythingLLM workspace exists for: "${code}"`);
      const listResponse = await fetch(`${ENV.ANYTHING_LLM_URL}/api/v1/workspaces`, {
        headers: {
          "Authorization": `Bearer ${ENV.ANYTHING_LLM_API_KEY}`
        }
      });
      let exists = false;
      const workspaceSlug = code.toLowerCase();
      if (listResponse.ok) {
        const listResult = await listResponse.json();
        const workspaces = listResult.workspaces || [];
        exists = workspaces.some((ws: any) => ws.slug === workspaceSlug);
      }

      if (!exists) {
        const response = await fetch(`${ENV.ANYTHING_LLM_URL}/api/v1/workspace/new`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${ENV.ANYTHING_LLM_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ name: code })
        });
        if (!response.ok) {
          const errorBody = await response.text().catch(() => "N/A");
          console.warn(`[Creation] AnythingLLM workspace creation warning: ${response.status} ${response.statusText}. Chi tiết: ${errorBody}`);
        } else {
          console.log(`[Creation] Successfully created AnythingLLM workspace for: "${code}"`);
        }
      } else {
        console.log(`[Creation] AnythingLLM workspace "${workspaceSlug}" already exists. Skipping creation to avoid duplicates.`);
      }
    } catch (wsError) {
      console.error("[Creation] Failed to sync workspace creation with AnythingLLM:", wsError);
    }

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
      select: { id: true, code: true },
    });

    if (!existingCourse) {
      return c.json({ error: "Course not found" }, 404);
    }

    const oldCode = existingCourse.code;

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

    // Sync rename workspace with AnythingLLM if code changed
    const codeChanged = oldCode.toUpperCase() !== code.toUpperCase();
    if (codeChanged) {
      const oldSlug = oldCode.toLowerCase();
      const newSlug = code.toLowerCase();
      const newName = code.toUpperCase();

      try {
        console.log(`[Update] Syncing Course Code Change: Renaming AnythingLLM workspace "${oldSlug}" to name "${newName}", slug "${newSlug}"...`);
        const response = await fetch(`${ENV.ANYTHING_LLM_URL}/api/v1/workspace/${oldSlug}/update`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${ENV.ANYTHING_LLM_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: newName,
            slug: newSlug
          })
        });

        if (!response.ok) {
          const errorBody = await response.text().catch(() => "N/A");
          console.warn(`[Update] Failed to rename workspace: ${response.status} ${response.statusText}. Chi tiết: ${errorBody}`);
          
          // Fallback: If update failed (e.g. workspace didn't exist in AnythingLLM), ensure it is created now!
          console.log(`[Update Fallback] Ensuring new AnythingLLM workspace exists for "${newName}"...`);
          await fetch(`${ENV.ANYTHING_LLM_URL}/api/v1/workspace/new`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${ENV.ANYTHING_LLM_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ name: newName })
          }).catch((e) => {
            console.warn("[Update Fallback] Failed to create workspace on update fallback:", e);
          });
        } else {
          console.log(`[Update] Successfully renamed AnythingLLM workspace to slug "${newSlug}"`);
        }
      } catch (wsError) {
        console.error("[Update] Failed to sync workspace renaming with AnythingLLM:", wsError);
      }
    }

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

    // Sync delete workspace with AnythingLLM
    try {
      const workspaceSlug = course.code.toLowerCase();
      console.log(`[Deletion] Syncing Course Deletion: Purging AnythingLLM workspace "${workspaceSlug}"...`);
      await fetch(`${ENV.ANYTHING_LLM_URL}/api/v1/workspace/${workspaceSlug}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${ENV.ANYTHING_LLM_API_KEY}`
        }
      });
    } catch (wsError) {
      console.error("[Deletion] Failed to delete AnythingLLM workspace:", wsError);
    }

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

  // Start background non-blocking ingestion task calling AnythingLLM API
  Promise.resolve().then(async () => {
    try {
      // 1. Fetch course details
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { code: true }
      });
      if (!course) throw new Error("Course not found in database");
      
      const workspaceSlug = course.code.toLowerCase();

      // 2. Auto-create workspace in AnythingLLM (will check first if already exists to prevent duplicates)
      console.log(`[Ingestion] Ensuring AnythingLLM workspace exists for: "${course.code}"`);
      try {
        const listResponse = await fetch(`${ENV.ANYTHING_LLM_URL}/api/v1/workspaces`, {
          headers: {
            "Authorization": `Bearer ${ENV.ANYTHING_LLM_API_KEY}`
          }
        });
        let exists = false;
        if (listResponse.ok) {
          const listResult = await listResponse.json();
          const workspaces = listResult.workspaces || [];
          exists = workspaces.some((ws: any) => ws.slug === workspaceSlug);
        }

        if (!exists) {
          console.log(`[Ingestion] Workspace "${workspaceSlug}" not found. Creating workspace...`);
          const createResponse = await fetch(`${ENV.ANYTHING_LLM_URL}/api/v1/workspace/new`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${ENV.ANYTHING_LLM_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ name: course.code.toUpperCase() })
          });
          if (!createResponse.ok) {
            const errorText = await createResponse.text().catch(() => "N/A");
            console.warn(`[Ingestion] Workspace creation failed: ${createResponse.status}. Chi tiết: ${errorText}`);
          } else {
            console.log(`[Ingestion] Successfully created AnythingLLM workspace for: "${course.code}"`);
          }
        } else {
          console.log(`[Ingestion] Workspace "${workspaceSlug}" already exists. Skipping creation to avoid duplicates.`);
        }
      } catch (wsError) {
        console.warn("[Ingestion] Failed to verify/create workspace in AnythingLLM:", wsError);
      }

      // 3. Upload document file to AnythingLLM
      console.log(`[Ingestion] Uploading file "${file.name}" to AnythingLLM...`);
      const formData = new FormData();
      const fileBlob = new Blob([buffer], { type: "application/pdf" });
      formData.append("file", fileBlob, file.name);

      const uploadResponse = await fetch(`${ENV.ANYTHING_LLM_URL}/api/v1/document/upload`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ENV.ANYTHING_LLM_API_KEY}`
        },
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error(`AnythingLLM file upload failed with status ${uploadResponse.status}`);
      }

      const uploadResult = await uploadResponse.json();
      const docLocation = uploadResult.documents?.[0]?.location;
      if (!docLocation) {
        throw new Error("AnythingLLM upload did not return a valid document location");
      }

      // 4. Embed document into workspace
      console.log(`[Ingestion] Embedding document into AnythingLLM workspace "${workspaceSlug}"...`);
      const updateResponse = await fetch(`${ENV.ANYTHING_LLM_URL}/api/v1/workspace/${workspaceSlug}/update-embeddings`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ENV.ANYTHING_LLM_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          adds: [docLocation]
        })
      });

      if (!updateResponse.ok) {
        throw new Error(`AnythingLLM workspace update failed with status ${updateResponse.status}`);
      }

      // 5. Update database status to COMPLETED
      await prisma.document.update({
        where: { id: doc.id },
        data: { status: "COMPLETED" }
      });
      console.log(`[Ingestion] Document "${doc.name}" successfully embedded and marked COMPLETED!`);
    } catch (error) {
      console.error(`[Ingestion] Failed to ingest document "${doc.name}":`, error);
      // Update database status to FAILED
      await prisma.document.update({
        where: { id: doc.id },
        data: { status: "FAILED" }
      }).catch((dbErr) => {
        console.error("[Ingestion] Failed to mark document status as FAILED in DB:", dbErr);
      });
    }
  });

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

    // Sync delete with AnythingLLM
    try {
      const fileName = document.fileUrl.split("/").pop();
      const anythingLLMLocation = `custom-documents/${fileName}`;
      const workspaceSlug = document.course.code.toLowerCase();

      // 1. Remove from workspace
      console.log(`[Deletion] Syncing Document Deletion: Removing "${anythingLLMLocation}" from AnythingLLM workspace "${workspaceSlug}"...`);
      await fetch(`${ENV.ANYTHING_LLM_URL}/api/v1/workspace/${workspaceSlug}/update-embeddings`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ENV.ANYTHING_LLM_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          deletes: [anythingLLMLocation]
        })
      });

      // 2. Remove from system completely
      console.log(`[Deletion] Syncing Document Deletion: Purging "${anythingLLMLocation}" from AnythingLLM system...`);
      await fetch(`${ENV.ANYTHING_LLM_URL}/api/v1/system/remove-documents`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${ENV.ANYTHING_LLM_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          names: [anythingLLMLocation]
        })
      });
    } catch (llmError) {
      console.error("[Deletion] Failed to sync document deletion with AnythingLLM:", llmError);
    }

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
