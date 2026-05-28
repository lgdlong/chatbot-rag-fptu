import { readFile } from "node:fs/promises";
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
) {
  const vectorString = toSafeVectorLiteral(queryVector);
  const scopeFilter = buildScopeFilter(scope);
  const candidateFilter = buildCandidateFilter(scope, candidateDocumentIds);

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
    if (scope.courseIds.length === 0 && scope.documentIds.length === 0) {
      const reply = buildNoContextReply(scope);
      onChunk(reply);
      return {
        citations: [],
        fullAnswer: reply,
      };
    }

    const queryPrompt = `task: question answering | query: ${query}`;
    const queryVector = await GeminiService.generateEmbedding(queryPrompt);
    const candidateDocumentIds = options.candidateDocumentIds?.filter(Boolean) ?? [];

    const primarySearchResults = await runVectorSearch(queryVector, scope, candidateDocumentIds);
    let contextBundle = await loadChunkContext(primarySearchResults);

    if (contextBundle.contextParts.length === 0) {
      const rescueSearchResults = await runLexicalRescueSearch(query, scope, candidateDocumentIds);
      const rescueBundle = await loadChunkContext(rescueSearchResults);
      if (rescueBundle.contextParts.length > 0) {
        const merged = new Map<string, RagSearchResult>();
        for (const row of [...primarySearchResults, ...rescueSearchResults]) {
          const key = `${row.document_id}:${row.page_number}`;
          if (!merged.has(key)) {
            merged.set(key, row);
          }
        }
        contextBundle = await loadChunkContext(Array.from(merged.values()));
      }
    }

    if (contextBundle.contextParts.length === 0) {
      const reply = buildNoContextReply(scope);
      onChunk(reply);
      return {
        citations: [],
        fullAnswer: reply,
      };
    }

    const systemPrompt = `Bạn là trợ lý giảng dạy AI thông minh của Đại học FPT (FPTU).
Nhiệm vụ của bạn là giải đáp thắc mắc môn học dựa TRÊN các Tài liệu đính kèm (dưới dạng file PDF/Hình ảnh).

HƯỚNG DẪN TRẢ LỜI:
1. Chỉ trả lời dựa trên các tài liệu đã được đính kèm trong phần Nguồn ở bên dưới.
2. Không được suy đoán, bịa thêm, hoặc dùng kiến thức bên ngoài tài liệu.
3. Nếu tài liệu không chứa thông tin cần thiết để trả lời, hãy trả lời đúng một câu: "Mình không biết. Hiện tại mình chưa tìm thấy nội dung phù hợp trong tài liệu đã được giảng viên cung cấp."
4. Trả lời bằng tiếng Việt dễ hiểu, logic. Khi trích dẫn thông tin, hãy ghi rõ nguồn (VD: Slide_Chuong_1.pdf - trang 12).
5. TUYỆT ĐỐI KHÔNG sử dụng định dạng markdown (KHÔNG dùng **, ##, *, -, >, v.v). Chỉ dùng văn bản thuần túy (plain text).`;

    const fullAnswer = await GeminiService.generateChatStream(
      systemPrompt,
      chatHistory,
      query,
      contextBundle.contextParts,
      onChunk,
    );

    return {
      citations: contextBundle.citations,
      fullAnswer,
    };
  }
}
