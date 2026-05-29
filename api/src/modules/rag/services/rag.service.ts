import { readFile, appendFile } from "node:fs/promises";
import { Prisma } from "@prisma/client";
import { GeminiService } from "./gemini.service.js";
import { prisma } from "../../auth/services/db.service.js";
import { ENV } from "../../../config/env.js";
import type { ResolvedChatScope } from "../../chat/services/chat-scope.service.js";

type RagCitation = {
  documentId: string;
  documentName: string;
  page: number;
};

type RagContextPart = {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
};

type RagSearchResult = {
  id: string;
  document_id: string;
  page_number: number;
  document_name: string;
  file_type: string;
  distance: number;
};

function toSafeVectorLiteral(values: number[]) {
  return `[${values.join(",")}]`;
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}._-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractRescueTerms(query: string) {
  const normalized = normalizeSearchText(query);
  const stopWords = new Set([
    "va",
    "hoac",
    "cho",
    "voi",
    "cua",
    "nay",
    "nay?",
    "la",
    "co",
    "tong",
    "so",
    "bao",
    "nhieu",
    "tai",
    "lieu",
    "file",
    "slide",
    "chuong",
    "phan",
    "trong",
    "o",
    "ve",
  ]);

  return Array.from(
    new Set(
      normalized
        .split(" ")
        .map((token) => token.trim())
        .filter((token) => token.length >= 3 && !stopWords.has(token)),
    ),
  ).slice(0, 6);
}

async function loadChunkContext(searchResults: RagSearchResult[]) {
  const contextParts: RagContextPart[] = [];
  const citations: RagCitation[] = [];
  const seenChunks = new Set<string>();

  for (const chunk of searchResults) {
    const dedupeKey = `${chunk.document_id}:${chunk.page_number}`;
    if (seenChunks.has(dedupeKey)) {
      continue;
    }
    seenChunks.add(dedupeKey);

    const chunkPath = `./uploads/chunks/${chunk.document_id}_page_${chunk.page_number}.pdf`;
    const chunkBuffer = await readFile(chunkPath).catch(() => null);

    if (!chunkBuffer) {
      continue;
    }

    contextParts.push({
      text: `[Nguồn] Tài liệu: ${chunk.document_name}, Trang: ${chunk.page_number}`,
    });
    contextParts.push({
      inlineData: {
        mimeType: "application/pdf",
        data: chunkBuffer.toString("base64"),
      },
    });

    citations.push({
      documentId: chunk.document_id,
      documentName: chunk.document_name,
      page: chunk.page_number,
    });
  }

  return {
    contextParts,
    citations,
  };
}

function buildScopeFilter(scope: ResolvedChatScope) {
  if (scope.documentIds.length > 0) {
    return Prisma.sql`AND d.id IN (${Prisma.join(scope.documentIds)})`;
  }

  if (scope.courseIds.length > 0) {
    return Prisma.sql`AND d.course_id IN (${Prisma.join(scope.courseIds)})`;
  }

  return Prisma.empty;
}

function buildCandidateFilter(scope: ResolvedChatScope, candidateDocumentIds: string[]) {
  if (candidateDocumentIds.length === 0) {
    return Prisma.empty;
  }

  const effectiveCandidateIds =
    scope.documentIds.length > 0
      ? candidateDocumentIds.filter((candidateId) => scope.documentIds.includes(candidateId))
      : candidateDocumentIds;

  if (effectiveCandidateIds.length === 0) {
    return Prisma.sql`AND 1 = 0`;
  }

  return Prisma.sql`AND d.id IN (${Prisma.join(effectiveCandidateIds)})`;
}

async function runVectorSearch(
  queryVector: number[],
  scope: ResolvedChatScope,
  candidateDocumentIds: string[],
  metadataFilter?: { chapter?: string | null },
) {
  const vectorString = toSafeVectorLiteral(queryVector);
  const scopeFilter = buildScopeFilter(scope);
  const candidateFilter = buildCandidateFilter(scope, candidateDocumentIds);

  const chapterFilter = metadataFilter?.chapter 
    ? Prisma.sql`AND (dc.metadata->>'chapter') = ${metadataFilter.chapter}` 
    : Prisma.empty;

  return prisma.$queryRaw<RagSearchResult[]>(Prisma.sql`
    SELECT
      dc.id,
      dc.document_id,
      dc.page_number,
      d.name AS document_name,
      d.file_type AS file_type,
      (dc.embedding <=> ${vectorString}::vector) AS distance
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    WHERE d.status = 'COMPLETED'
      ${scopeFilter}
      ${candidateFilter}
      ${chapterFilter}
      AND d.file_type IN ('pdf', 'docx', 'pptx')
      AND (dc.embedding <=> ${vectorString}::vector) <= ${ENV.RAG_MAX_DISTANCE}
    ORDER BY distance ASC
    LIMIT 5;
  `);
}

async function runLexicalRescueSearch(
  query: string,
  scope: ResolvedChatScope,
  candidateDocumentIds: string[],
) {
  const rescueTerms = extractRescueTerms(query);
  if (rescueTerms.length === 0) {
    return [];
  }

  const scopeFilter = buildScopeFilter(scope);
  const candidateFilter = buildCandidateFilter(scope, candidateDocumentIds);
  const rescueConditions = rescueTerms.map((term) => Prisma.sql`
    LOWER(dc.content) LIKE ${`%${term}%`}
    OR LOWER(d.name) LIKE ${`%${term}%`}
  `);
  const rescueWhere = rescueConditions.reduce((combined, condition) => Prisma.sql`${combined} OR ${condition}`);

  return prisma.$queryRaw<RagSearchResult[]>(Prisma.sql`
    SELECT
      dc.id,
      dc.document_id,
      dc.page_number,
      d.name AS document_name,
      d.file_type AS file_type,
      0 AS distance
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    WHERE d.status = 'COMPLETED'
      ${scopeFilter}
      ${candidateFilter}
      AND d.file_type IN ('pdf', 'docx', 'pptx')
      AND (${rescueWhere})
    ORDER BY d.created_at DESC, dc.page_number ASC
    LIMIT 5;
  `);
}

function buildNoContextReply(scope: ResolvedChatScope) {
  if (scope.documentIds.length > 0) {
    return "Mình không biết. Hiện tại mình chưa tìm thấy nội dung phù hợp trong các tài liệu đã chọn.";
  }

  return "Mình không biết. Hiện tại mình chưa tìm thấy nội dung phù hợp trong tài liệu đã được giảng viên cung cấp.";
}

export class RagService {
  public static async retrieveAndGenerate(
    query: string,
    scope: ResolvedChatScope,
    chatHistory: Array<{ role: "user" | "model"; parts: string[] }>,
    onChunk: (text: string) => void,
    options: { candidateDocumentIds?: string[] } = {},
  ) {
    const logFile = "logs/a.log";
    const writeLog = async (text: string) => {
      try {
        const time = new Date().toISOString();
        await appendFile(logFile, `[${time}] ${text}\n`);
      } catch (err) {
        // ignore log write errors
      }
    };

    // Determine workspace slug from course code (e.g., swd392) or default
    const workspaceSlug = scope.scopedCourses.length > 0 
      ? scope.scopedCourses[0].code.toLowerCase() 
      : "default";

    await writeLog(`[RAG] Proxying chat to AnythingLLM workspace slug: "${workspaceSlug}"`);

    if (!ENV.ANYTHING_LLM_API_KEY) {
       const reply = "AnythingLLM API Key chưa được cấu hình. Vui lòng thêm ANYTHING_LLM_API_KEY vào biến môi trường.";
       onChunk(reply);
       return { citations: [], fullAnswer: reply };
    }

    try {
      const response = await fetch(`${ENV.ANYTHING_LLM_URL}/api/v1/workspace/${workspaceSlug}/stream-chat`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ENV.ANYTHING_LLM_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: query,
          mode: "chat"
        })
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "N/A");
        await writeLog(`AnythingLLM error: ${response.status} ${response.statusText}. Chi tiết: ${errorBody}`);
        const reply = "Rất tiếc, máy chủ RAG đang gặp sự cố. Vui lòng thử lại sau.";
        onChunk(reply);
        return { citations: [], fullAnswer: reply };
      }

      let fullAnswer = "";
      let rawSources: any[] = [];

      if (response.body) {
        const decoder = new TextDecoder("utf-8");
        await writeLog("Khởi đầu nhận Stream từ AnythingLLM...");
        
        for await (const chunk of response.body as any) {
          // Decode the Uint8Array chunk properly to UTF-8 text
          const chunkText = decoder.decode(chunk, { stream: true });
          await writeLog(`RAW CHUNK NHẬN ĐƯỢC:\n${chunkText}`);
          
          const lines = chunkText.split("\n");
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            
            await writeLog(`XỬ LÝ DÒNG: ${trimmedLine}`);
            if (trimmedLine.startsWith("data: ")) {
              const dataStr = trimmedLine.slice(6).trim();
              await writeLog(`NỘI DUNG DATA TRÍCH XUẤT: ${dataStr}`);
              
              if (dataStr === "[DONE]") {
                await writeLog("STREAM KẾT THÚC ([DONE])");
                continue;
              }
              try {
                const data = JSON.parse(dataStr);
                await writeLog(`PARSED JSON OK: ${JSON.stringify(data)}`);
                if (data.textResponse) {
                  await writeLog(`THẤY TEXT RESPONSE: ${data.textResponse}`);
                  fullAnswer += data.textResponse;
                  onChunk(data.textResponse);
                } else if (data.sources && Array.isArray(data.sources)) {
                  await writeLog(`THẤY SOURCES: ${JSON.stringify(data.sources)}`);
                  rawSources = data.sources;
                } else {
                  await writeLog("Không tìm thấy field 'textResponse' hay 'sources' trong JSON.");
                }
              } catch (e) {
                await writeLog(`LỖI PARSE JSON DÒNG NÀY: ${e instanceof Error ? e.message : String(e)}`);
              }
            }
          }
        }
      } else {
        await writeLog("Response body bị rỗng!");
      }

      const citations: any[] = [];
      const seenDocIds = new Set<string>();

      if (rawSources.length > 0) {
        for (const source of rawSources) {
          const title = source.title;
          if (!title) continue;

          // Find the matching document in Postgres
          const dbDoc = await prisma.document.findFirst({
            where: {
              name: {
                equals: title,
                mode: "insensitive"
              }
            },
            select: { id: true, name: true, fileUrl: true }
          });

          const docId = dbDoc ? dbDoc.id : (source.id || "unknown");
          if (seenDocIds.has(docId)) {
            continue;
          }
          seenDocIds.add(docId);

          if (dbDoc) {
            citations.push({
              documentId: dbDoc.id,
              documentName: dbDoc.name,
              fileUrl: dbDoc.fileUrl,
              page: 1
            });
          } else {
            citations.push({
              documentId: source.id || "unknown",
              documentName: title,
              fileUrl: null,
              page: 1
            });
          }
        }
      }

      await writeLog(`TRẢ VỀ CITATIONS MAPPED: ${JSON.stringify(citations)}`);

      return {
        citations, 
        fullAnswer,
      };
    } catch (error) {
      await writeLog(`Failed to call AnythingLLM: ${error instanceof Error ? error.message : String(error)}`);
      const reply = "Rất tiếc, không thể kết nối tới AnythingLLM.";
      onChunk(reply);
      return { citations: [], fullAnswer: reply };
    }
  }
}
