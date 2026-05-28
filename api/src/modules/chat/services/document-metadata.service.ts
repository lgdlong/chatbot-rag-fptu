import { prisma } from "../../auth/services/db.service.js";
import { ChatSessionScopeMode } from "@prisma/client";
import type { ResolvedChatScope, ScopedCourse, ScopedDocument } from "./chat-scope.service.js";
import type { IntentRoute } from "./intent-router.service.js";

type ChatMessageLike = {
  sender: "USER" | "ASSISTANT";
  content: string;
  citations?: unknown;
  createdAt: Date | string;
};

type DocumentSummaryRow = {
  id: string;
  name: string;
  fileType: string;
  status: string;
  createdAt: Date;
  course: ScopedCourse;
};

type CitationItem = {
  documentId?: string;
  documentName?: string;
  page?: number;
  isDeleted?: boolean;
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}._-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCaseFallback(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractCitations(message: ChatMessageLike) {
  if (!Array.isArray(message.citations)) {
    return [];
  }

  return message.citations.filter(isPlainObject).map((citation) => ({
    documentId: typeof citation.documentId === "string" ? citation.documentId : undefined,
    documentName: typeof citation.documentName === "string" ? citation.documentName : undefined,
    page: typeof citation.page === "number" ? citation.page : undefined,
    isDeleted: typeof citation.isDeleted === "boolean" ? citation.isDeleted : undefined,
  })) as CitationItem[];
}

function formatScopedCourse(course: ScopedCourse) {
  return `${course.code} - ${course.name}`;
}

function formatScopedDocument(document: ScopedDocument) {
  return `${document.name} - ${document.course.code}`;
}

export class DocumentMetadataService {
  static readonly DEFAULT_DOCUMENT_LIMIT = 20;

  static readonly DEFAULT_LATEST_LIMIT = 5;

  static readonly RAG_SUPPORTED_FILE_TYPES = new Set(["pdf", "docx", "pptx"]);

  private static matchesText(value: string, query: string) {
    const normalizedValue = normalizeText(value);
    const normalizedQuery = normalizeText(query);
    return normalizedValue.includes(normalizedQuery) || normalizedQuery.includes(normalizedValue);
  }

  private static async getCoursesInScope(scope: ResolvedChatScope) {
    if (scope.courseIds.length === 0) {
      return [];
    }

    const courses = await prisma.course.findMany({
      where: {
        id: {
          in: scope.courseIds,
        },
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
    });

    const byId = new Map(courses.map((course) => [course.id, course]));
    return scope.courseIds.map((courseId) => byId.get(courseId)).filter((course): course is ScopedCourse => Boolean(course));
  }

  private static async getDocumentsInScope(scope: ResolvedChatScope) {
    if (scope.scopeMode === ChatSessionScopeMode.SELECTED_DOCUMENTS && scope.documentIds.length === 0) {
      return [];
    }

    if (scope.scopeMode === ChatSessionScopeMode.SELECTED_DOCUMENTS) {
      const documents = await prisma.document.findMany({
        where: {
          id: {
            in: scope.documentIds,
          },
          status: "COMPLETED",
        },
        include: {
          course: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const byId = new Map(documents.map((document) => [document.id, document]));
      return scope.documentIds.map((documentId) => byId.get(documentId)).filter((document): document is (typeof documents)[number] => Boolean(document));
    }

    if (scope.courseIds.length === 0) {
      return [];
    }

    const documents = await prisma.document.findMany({
      where: {
        courseId: {
          in: scope.courseIds,
        },
        status: "COMPLETED",
      },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return documents;
  }

  static async resolveCourseIdsFromQuery(scope: ResolvedChatScope, courseNameQuery?: string | null) {
    if (!courseNameQuery) {
      return scope.courseIds;
    }

    const courses = await this.getCoursesInScope(scope);
    const matched = courses.filter((course) => this.matchesText(course.code, courseNameQuery) || this.matchesText(course.name, courseNameQuery));
    return matched.map((course) => course.id);
  }

  static async resolveDocumentCandidates(scope: ResolvedChatScope, documentNameQuery?: string | null, limit = 10) {
    const normalizedQuery = normalizeText(documentNameQuery ?? "");
    if (!normalizedQuery || (scope.courseIds.length === 0 && scope.documentIds.length === 0)) {
      return [];
    }

    const documents = await this.getDocumentsInScope(scope);
    return documents
      .filter((document) => normalizeText(document.name).includes(normalizedQuery) || normalizedQuery.includes(normalizeText(document.name)))
      .slice(0, limit)
      .map((document) => ({
        id: document.id,
        name: document.name,
        fileType: document.fileType,
        status: document.status,
        createdAt: document.createdAt,
        course: document.course,
      }));
  }

  static async resolveDocumentList(scope: ResolvedChatScope, options: { status?: string | null; fileType?: string | null; courseNameQuery?: string | null; limit?: number; createdAfter?: Date | null; documentNameQuery?: string | null; unlimited?: boolean; } = {}) {
    const documents = await this.getDocumentsInScope(scope);
    const courseIds = await this.resolveCourseIdsFromQuery(scope, options.courseNameQuery);
    if (options.courseNameQuery && courseIds.length === 0) {
      return [];
    }

    const courseFilteredDocuments = options.courseNameQuery
      ? documents.filter((document) => courseIds.includes(document.courseId))
      : documents;

    const filteredDocuments = courseFilteredDocuments.filter((document) => {
      if (options.status && document.status !== options.status) {
        return false;
      }
      if (options.fileType && document.fileType !== options.fileType) {
        return false;
      }
      if (options.createdAfter && document.createdAt < options.createdAfter) {
        return false;
      }
      return true;
    });
    const normalizedDocumentQuery = normalizeText(options.documentNameQuery ?? "");
    const queryFilteredDocuments = normalizedDocumentQuery
      ? filteredDocuments.filter((document) => normalizeText(document.name).includes(normalizedDocumentQuery) || normalizedDocumentQuery.includes(normalizeText(document.name)))
      : filteredDocuments;

    const limitedDocuments = options.unlimited
      ? queryFilteredDocuments
      : queryFilteredDocuments.slice(0, Math.min(options.limit ?? this.DEFAULT_DOCUMENT_LIMIT, this.DEFAULT_DOCUMENT_LIMIT));

    if (!options.documentNameQuery) {
      return limitedDocuments.map((document) => ({
        id: document.id,
        name: document.name,
        fileType: document.fileType,
        status: document.status,
        createdAt: document.createdAt,
        course: document.course,
      }));
    }

    return limitedDocuments
      .map((document) => ({
        id: document.id,
        name: document.name,
        fileType: document.fileType,
        status: document.status,
        createdAt: document.createdAt,
        course: document.course,
      }));
  }

  static async resolveDocumentCount(scope: ResolvedChatScope, options: { status?: string | null; fileType?: string | null; courseNameQuery?: string | null; createdAfter?: Date | null; documentNameQuery?: string | null; } = {}) {
    const documents = await this.resolveDocumentList(scope, {
      ...options,
      unlimited: true,
    });
    return documents.length;
  }

  static async resolveLatestUploads(scope: ResolvedChatScope, limit = this.DEFAULT_LATEST_LIMIT) {
    const documents = await this.resolveDocumentList(scope, {
      unlimited: true,
      status: "COMPLETED",
    });
    return documents
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, Math.min(limit, this.DEFAULT_LATEST_LIMIT));
  }

  static async resolveProcessingSummary(scope: ResolvedChatScope) {
    if (scope.courseIds.length === 0 && scope.documentIds.length === 0) {
      return [];
    }

    const documents = await this.getDocumentsInScope(scope);
    const grouped = new Map<string, number>();

    for (const document of documents) {
      grouped.set(document.status, (grouped.get(document.status) ?? 0) + 1);
    }

    return Array.from(grouped.entries()).map(([status, count]) => ({ status, count }));
  }

  static async resolveCourseList(scope: ResolvedChatScope) {
    return this.getCoursesInScope(scope);
  }

  static async resolveCitationLookup(messages: ChatMessageLike[]) {
    const latestAssistant = [...messages].reverse().find((message) => message.sender === "ASSISTANT");
    if (!latestAssistant) {
      return null;
    }

    const citations = extractCitations(latestAssistant);
    if (citations.length === 0) {
      return null;
    }

    const activeDocuments = await prisma.document.findMany({
      where: {
        id: {
          in: citations
            .map((citation) => citation.documentId)
            .filter((documentId): documentId is string => Boolean(documentId)),
        },
      },
      select: {
        id: true,
      },
    });

    const activeDocumentIds = new Set(activeDocuments.map((document) => document.id));
    return citations.map((citation) => ({
      ...citation,
      isDeleted: citation.documentId ? !activeDocumentIds.has(citation.documentId) : citation.isDeleted,
    }));
  }

  static formatCourseList(courses: ScopedCourse[]) {
    if (courses.length === 0) {
      return "Mình chưa thấy môn nào khả dụng trong phạm vi hiện tại.";
    }

    return [
      `Mình thấy ${courses.length} môn học khả dụng trong phạm vi hiện tại:`,
      ...courses.map((course) => `- ${formatScopedCourse(course)}`),
    ].join("\n");
  }

  static formatScope(scope: ResolvedChatScope) {
    if (scope.scopeMode === ChatSessionScopeMode.SELECTED_DOCUMENTS) {
      if (scope.scopedDocuments.length === 0) {
        return "Hiện tại chưa có tài liệu nào được chọn.";
      }

      if (scope.scopedDocuments.length === 1) {
        return `Hiện tại mình chỉ tra cứu trong tài liệu ${formatScopedDocument(scope.scopedDocuments[0])}.`;
      }

      return `Hiện tại mình đang tra cứu trong ${scope.scopedDocuments.length} tài liệu đã chọn.`;
    }

    if (scope.scopeMode === ChatSessionScopeMode.ALL_COURSES) {
      return "Hiện tại mình đang tra cứu trong tất cả môn.";
    }

    if (scope.scopedCourses.length === 0) {
      return "Hiện tại chưa có môn nào được chọn.";
    }

    if (scope.scopedCourses.length === 1) {
      return `Hiện tại mình chỉ tra cứu trong môn ${formatScopedCourse(scope.scopedCourses[0])}.`;
    }

    return `Hiện tại mình đang tra cứu trong ${scope.scopedCourses.length} môn: ${scope.scopedCourses.map((course) => course.code).join(", ")}.`;
  }

  static formatDocumentList(documents: DocumentSummaryRow[], totalCount: number, options: { scope: ResolvedChatScope; limit?: number; appliedFilters?: string[] } ) {
    const limit = options.limit ?? this.DEFAULT_DOCUMENT_LIMIT;
    if (documents.length === 0) {
      return "Mình chưa thấy tài liệu nào phù hợp trong phạm vi hiện tại.";
    }

    const header = `Mình tìm thấy ${totalCount} tài liệu phù hợp:`;
    const lines = documents.map((document, index) => {
      const courseLabel = `${document.course.code}`;
      return `${index + 1}. ${document.name} - ${courseLabel} (${document.fileType}, ${document.status})`;
    });
    const suffix = totalCount > limit ? `\nMình chỉ hiển thị ${limit} kết quả đầu tiên cho gọn.` : "";
    const filterLine = options.appliedFilters && options.appliedFilters.length > 0
      ? `\nBộ lọc đang áp dụng: ${options.appliedFilters.join(", ")}`
      : "";
    return [header, filterLine, lines.join("\n"), suffix].filter(Boolean).join("\n");
  }

  static formatDocumentCount(totalCount: number, filters: string[]) {
    if (filters.length === 0) {
      return `Mình đếm được ${totalCount} tài liệu trong phạm vi hiện tại.`;
    }

    return `Mình đếm được ${totalCount} tài liệu trong phạm vi hiện tại, với bộ lọc ${filters.join(", ")}.`;
  }

  static formatDocumentStatus(documents: DocumentSummaryRow[]) {
    if (documents.length === 0) {
      return "Mình chưa thấy tài liệu này trong phạm vi hiện tại.";
    }

    if (documents.length > 1) {
      return [
        "Mình thấy vài tài liệu gần giống tên này:",
        ...documents.map((document) => `- ${document.name} - ${document.course.code} (${document.status})`),
      ].join("\n");
    }

    const document = documents[0];
    return `Tài liệu ${document.name} - ${document.course.code} hiện đang ở trạng thái ${document.status}.`;
  }

  static formatDocumentExistence(documents: DocumentSummaryRow[]) {
    if (documents.length === 0) {
      return "Mình chưa thấy tài liệu này trong phạm vi hiện tại.";
    }

    if (documents.length > 1) {
      return [
        "Mình thấy vài tài liệu gần giống tên này:",
        ...documents.map((document) => `- ${document.name} - ${document.course.code}`),
      ].join("\n");
    }

    const document = documents[0];
    return `Có, mình tìm thấy ${document.name} - ${document.course.code}.`;
  }

  static formatLatestUploads(documents: DocumentSummaryRow[]) {
    if (documents.length === 0) {
      return "Mình chưa thấy tài liệu nào mới trong phạm vi hiện tại.";
    }

    return [
      `Đây là các tài liệu mới nhất (${documents.length}):`,
      ...documents.map((document) => `- ${document.name} - ${document.course.code} (${document.createdAt.toLocaleString("vi-VN")})`),
    ].join("\n");
  }

  static formatProcessingSummary(summary: Array<{ status: string; count: number }>) {
    if (summary.length === 0) {
      return "Mình chưa thấy tài liệu nào trong phạm vi hiện tại.";
    }

    return [
      "Tình trạng xử lý tài liệu trong phạm vi hiện tại:",
      ...summary.map((row) => `- ${titleCaseFallback(row.status.toLowerCase())}: ${row.count}`),
    ].join("\n");
  }

  static formatCitationLookup(citations: CitationItem[] | null) {
    if (!citations || citations.length === 0) {
      return "Mình chưa thấy nguồn trích dẫn gần nhất trong lịch sử chat này.";
    }

    return [
      "Nguồn trích dẫn gần nhất mình đã dùng:",
      ...citations.map((citation, index) => {
        const deletedLabel = citation.isDeleted ? " (tài liệu nguồn không còn active)" : "";
        return `${index + 1}. ${citation.documentName ?? "Tài liệu không xác định"} - Trang ${citation.page ?? "?"}${deletedLabel}`;
      }),
    ].join("\n");
  }

  static formatScopeChangeResponse() {
    return [
      "Mình chưa thể đổi phạm vi ngay trong cuộc hội thoại này.",
      "Nếu muốn đổi phạm vi, bạn hãy tạo cuộc hội thoại mới hoặc chọn lại trong giao diện.",
    ].join("\n");
  }

  static formatClarifyIntent() {
    return "Mình chưa rõ bạn muốn liệt kê tài liệu, đếm số lượng, xem nguồn trích dẫn hay hỏi nội dung học thuật. Bạn có thể nói ngắn như: \"kể tên tài liệu hiện tại\" hoặc \"giải thích chương 1\".";
  }

  static formatSmallTalk() {
    return "Chào bạn. Bạn cứ hỏi về tài liệu, số lượng, trạng thái, hoặc nội dung bài học nhé.";
  }

  static formatOutOfScopeRequest() {
    return "Mình không thể trực tiếp tải lên, xóa tài liệu hoặc đổi phạm vi trong khung chat. Bạn hãy dùng nút tương ứng trong giao diện nhé.";
  }

  static formatCourseScopeSuggestion() {
    return "Mình chưa xác định đủ thông tin để chốt môn học. Bạn có thể nói rõ tên môn, tên tài liệu, hoặc mở rộng phạm vi để mình tra tiếp.";
  }

  static async buildMetadataResponse(
    route: IntentRoute,
    scope: ResolvedChatScope,
    messages: ChatMessageLike[],
  ) {
    const parsed = route.parsedEntities;
    const appliedFilters: string[] = [];

    switch (route.intent) {
      case "SESSION_SCOPE_SHOW":
        return this.formatScope(scope);
      case "SESSION_SCOPE_CHANGE":
        return this.formatScopeChangeResponse();
      case "SMALL_TALK":
        return this.formatSmallTalk();
      case "OUT_OF_SCOPE_SYSTEM_REQUEST":
        return this.formatOutOfScopeRequest();
      case "CLARIFY_INTENT":
        return this.formatClarifyIntent();
      case "COURSE_SCOPE_SUGGESTION":
        return this.formatCourseScopeSuggestion();
      case "COURSE_LIST": {
        const courses = await this.resolveCourseList(scope);
        return this.formatCourseList(courses);
      }
      case "DOCUMENT_PROCESSING_SUMMARY": {
        const summary = await this.resolveProcessingSummary(scope);
        return this.formatProcessingSummary(summary);
      }
      case "DOCUMENT_LATEST_UPLOADS": {
        const documents = await this.resolveLatestUploads(scope, parsed.countLimit ?? this.DEFAULT_LATEST_LIMIT);
        return this.formatLatestUploads(documents);
      }
      case "DOCUMENT_COUNT": {
        if (parsed.statusFilter) appliedFilters.push(parsed.statusFilter);
        if (parsed.fileTypeFilter) appliedFilters.push(parsed.fileTypeFilter);
        if (parsed.courseNameQuery) appliedFilters.push(parsed.courseNameQuery);
        const count = await this.resolveDocumentCount(scope, {
          status: parsed.statusFilter,
          fileType: parsed.fileTypeFilter,
          courseNameQuery: parsed.courseNameQuery,
          documentNameQuery: parsed.documentNameQuery,
        });
        return this.formatDocumentCount(count, appliedFilters);
      }
      case "DOCUMENT_LIST":
      case "DOCUMENT_FILTERED_LIST": {
        if (parsed.statusFilter) appliedFilters.push(parsed.statusFilter);
        if (parsed.fileTypeFilter) appliedFilters.push(parsed.fileTypeFilter);
        if (parsed.courseNameQuery) appliedFilters.push(parsed.courseNameQuery);
        const totalCount = await this.resolveDocumentCount(scope, {
          status: parsed.statusFilter,
          fileType: parsed.fileTypeFilter,
          courseNameQuery: parsed.courseNameQuery,
          documentNameQuery: parsed.documentNameQuery,
        });
        const documents = await this.resolveDocumentList(scope, {
          status: parsed.statusFilter,
          fileType: parsed.fileTypeFilter,
          courseNameQuery: parsed.courseNameQuery,
          limit: parsed.countLimit ?? this.DEFAULT_DOCUMENT_LIMIT,
          documentNameQuery: parsed.documentNameQuery,
        });
        return this.formatDocumentList(documents, totalCount, { scope, limit: parsed.countLimit ?? this.DEFAULT_DOCUMENT_LIMIT, appliedFilters });
      }
      case "DOCUMENT_STATUS":
      case "DOCUMENT_EXISTENCE_CHECK": {
        const documents = await this.resolveDocumentList(scope, {
          status: parsed.statusFilter,
          fileType: parsed.fileTypeFilter,
          courseNameQuery: parsed.courseNameQuery,
          limit: 10,
          documentNameQuery: parsed.documentNameQuery,
        });
        return route.intent === "DOCUMENT_STATUS"
          ? this.formatDocumentStatus(documents)
          : this.formatDocumentExistence(documents);
      }
      case "CITATION_LOOKUP": {
        const citations = await this.resolveCitationLookup(messages);
        return this.formatCitationLookup(citations);
      }
      default:
        return this.formatClarifyIntent();
    }
  }

  static isSupportedCitationFileType(fileType: string) {
    return this.RAG_SUPPORTED_FILE_TYPES.has(fileType);
  }
}
