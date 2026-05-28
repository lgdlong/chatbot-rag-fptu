export type ChatIntent =
  | "SESSION_SCOPE_CHANGE"
  | "SESSION_SCOPE_SHOW"
  | "DOCUMENT_STATUS"
  | "DOCUMENT_EXISTENCE_CHECK"
  | "DOCUMENT_LIST"
  | "DOCUMENT_COUNT"
  | "DOCUMENT_FILTERED_LIST"
  | "DOCUMENT_LATEST_UPLOADS"
  | "DOCUMENT_PROCESSING_SUMMARY"
  | "COURSE_LIST"
  | "COURSE_SCOPE_SUGGESTION"
  | "CITATION_LOOKUP"
  | "OUT_OF_SCOPE_SYSTEM_REQUEST"
  | "SMALL_TALK"
  | "CLARIFY_INTENT"
  | "RAG_QA";

export type ChatIntentConfidence = "high" | "medium" | "low";

export type IntentParsedEntities = {
  documentNameQuery?: string | null;
  courseNameQuery?: string | null;
  statusFilter?: string | null;
  fileTypeFilter?: string | null;
  countLimit?: number | null;
  candidateDocumentIds?: string[];
};

export type IntentRoute = {
  intent: ChatIntent;
  confidence: ChatIntentConfidence;
  parsedEntities: IntentParsedEntities;
  reasonCode: string;
};

type HistoryMessage = {
  sender: "USER" | "ASSISTANT";
  content: string;
  citations?: unknown;
};

type RouteContext = {
  history: HistoryMessage[];
};

const LIST_KEYWORDS = [
  "danh sach",
  "liet ke",
  "ke ten",
  "co nhung",
  "gom nhung",
  "bao gom nhung",
  "hien co",
  "dang co",
  "dang o day",
  "tai lieu nao",
  "tai lieu hien tai",
  "tai lieu dang co",
];
const COUNT_KEYWORDS = ["bao nhieu", "may ", "tong so", "so luong"];
const STATUS_KEYWORDS = ["trang thai", "processing", "pending", "completed", "failed", "da xu ly", "da upload", "da nap"];
const TIME_KEYWORDS = ["moi nhat", "gan day", "vua tai len", "upload gan nhat"];
const DOCUMENT_KEYWORDS = ["tai lieu", "file", "pdf", "docx", "pptx", "slide"];
const RAG_KEYWORDS = [
  "giai thich",
  "tom tat",
  "noi dung",
  "y nghia",
  "dinh nghia",
  "so sanh",
  "tai sao",
  "nhu the nao",
  "o trang nao",
  "thuat toan",
  "checkpoint",
  "check point",
  "cp",
  "cp1",
  "cp2",
  "cp3",
  "architecture",
  "kien truc",
  "nguyen ly",
  "quy trinh",
  "mo hinh",
  "pattern",
  "solid",
  "yeu cau gi",
  "hoc phan",
  "chuong",
  "muc tieu",
];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}._-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeWithoutPunctuation(value: string) {
  return normalizeText(value)
    .replace(/\btl\b/g, "tai lieu")
    .replace(/\bfile pdf\b/g, "pdf");
}

function hasAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function extractDocumentNameQuery(text: string) {
  const patterns = [
    /(?:trong|trong file|file|tai lieu|slide)\s+(.+?)(?:\s+(?:co|dang|la|o|thuoc|cua|ve)\b|$)/i,
    /(?:file|tai lieu)\s+([^\n,;?]+?)(?:\s+(?:co|dang|la|o|thuoc|cua|ve)\b|$)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].trim().replace(/\b(pdf|pptx|ppt|docx|doc)\b/i, "").trim();
    }
  }

  return null;
}

function extractCourseNameQuery(text: string) {
  const match = text.match(/(?:mon|hoc phan|course)\s+([^\n,;?]+?)(?:\s+(?:co|dang|la|o|thuoc|cua|ve)\b|$)/i);
  return match?.[1]?.trim() ?? null;
}

function extractStatusFilter(text: string) {
  if (text.includes("pending")) return "PENDING";
  if (text.includes("processing")) return "PROCESSING";
  if (text.includes("completed") || text.includes("xong") || text.includes("hoan thanh")) return "COMPLETED";
  if (text.includes("failed") || text.includes("that bai")) return "FAILED";
  return null;
}

function extractFileTypeFilter(text: string) {
  if (text.includes("pdf")) return "pdf";
  if (text.includes("pptx") || text.includes("ppt")) return "pptx";
  if (text.includes("docx") || text.includes("doc")) return "docx";
  return null;
}

function extractCountLimit(text: string) {
  const match = text.match(/(?:top|lay|lấy|show|trả)\s+(\d+)/i);
  if (match?.[1]) {
    const limit = Number(match[1]);
    if (!Number.isNaN(limit) && limit > 0) {
      return Math.min(limit, 20);
    }
  }
  return null;
}

function hasCitationHistory(history: HistoryMessage[]) {
  return history.some((message) => message.sender === "ASSISTANT" && Array.isArray(message.citations) && message.citations.length > 0);
}

export class IntentRouterService {
  public static route(message: string, context: RouteContext): IntentRoute {
    const normalized = normalizeWithoutPunctuation(message);
    const plain = normalizeText(message);
    const documentNameQuery = extractDocumentNameQuery(message);
    const courseNameQuery = extractCourseNameQuery(message);
    const statusFilter = extractStatusFilter(normalized);
    const fileTypeFilter = extractFileTypeFilter(normalized);
    const countLimit = extractCountLimit(message);
    const hasHistoryCitation = hasCitationHistory(context.history);
    const hasDocumentMetadataSignal =
      hasAny(normalized, LIST_KEYWORDS) ||
      hasAny(normalized, COUNT_KEYWORDS) ||
      hasAny(normalized, STATUS_KEYWORDS) ||
      hasAny(normalized, TIME_KEYWORDS) ||
      hasAny(normalized, DOCUMENT_KEYWORDS);
    const hasAcademicSignal = hasAny(normalized, RAG_KEYWORDS) || Boolean(documentNameQuery);

    if (this.matchesScopeChange(normalized)) {
      return {
        intent: "SESSION_SCOPE_CHANGE",
        confidence: "high",
        parsedEntities: { documentNameQuery, courseNameQuery, statusFilter, fileTypeFilter, countLimit, candidateDocumentIds: [] },
        reasonCode: "scope_change_phrase",
      };
    }

    if (this.matchesScopeShow(normalized)) {
      return {
        intent: "SESSION_SCOPE_SHOW",
        confidence: "high",
        parsedEntities: { documentNameQuery, courseNameQuery, statusFilter, fileTypeFilter, countLimit, candidateDocumentIds: [] },
        reasonCode: "scope_show_phrase",
      };
    }

    if (this.matchesOutOfScopeSystemRequest(normalized)) {
      return {
        intent: "OUT_OF_SCOPE_SYSTEM_REQUEST",
        confidence: "high",
        parsedEntities: { documentNameQuery, courseNameQuery, statusFilter, fileTypeFilter, countLimit, candidateDocumentIds: [] },
        reasonCode: "system_request_phrase",
      };
    }

    if (this.matchesSmallTalk(normalized)) {
      return {
        intent: "SMALL_TALK",
        confidence: "high",
        parsedEntities: { documentNameQuery, courseNameQuery, statusFilter, fileTypeFilter, countLimit, candidateDocumentIds: [] },
        reasonCode: "small_talk_phrase",
      };
    }

    if (this.matchesCitationLookup(normalized)) {
      return {
        intent: "CITATION_LOOKUP",
        confidence: hasHistoryCitation ? "high" : "medium",
        parsedEntities: { documentNameQuery, courseNameQuery, statusFilter, fileTypeFilter, countLimit, candidateDocumentIds: [] },
        reasonCode: hasHistoryCitation ? "citation_followup" : "insufficient_referent",
      };
    }

    if (this.matchesCourseList(normalized)) {
      return {
        intent: "COURSE_LIST",
        confidence: "high",
        parsedEntities: { documentNameQuery, courseNameQuery, statusFilter, fileTypeFilter, countLimit, candidateDocumentIds: [] },
        reasonCode: "metadata_keyword_match",
      };
    }

    if (this.matchesDocumentProcessingSummary(normalized)) {
      return {
        intent: "DOCUMENT_PROCESSING_SUMMARY",
        confidence: "high",
        parsedEntities: { documentNameQuery, courseNameQuery, statusFilter, fileTypeFilter, countLimit, candidateDocumentIds: [] },
        reasonCode: "metadata_keyword_match",
      };
    }

    if (this.matchesLatestUploads(normalized)) {
      return {
        intent: "DOCUMENT_LATEST_UPLOADS",
        confidence: "high",
        parsedEntities: { documentNameQuery, courseNameQuery, statusFilter, fileTypeFilter, countLimit, candidateDocumentIds: [] },
        reasonCode: "metadata_keyword_match",
      };
    }

    if (this.matchesDocumentStatus(normalized)) {
      return {
        intent: "DOCUMENT_STATUS",
        confidence: "high",
        parsedEntities: { documentNameQuery, courseNameQuery, statusFilter, fileTypeFilter, countLimit, candidateDocumentIds: [] },
        reasonCode: "metadata_keyword_match",
      };
    }

    if (this.matchesDocumentExistence(normalized)) {
      return {
        intent: "DOCUMENT_EXISTENCE_CHECK",
        confidence: "high",
        parsedEntities: { documentNameQuery, courseNameQuery, statusFilter, fileTypeFilter, countLimit, candidateDocumentIds: [] },
        reasonCode: "metadata_keyword_match",
      };
    }

    if (this.matchesDocumentCount(normalized)) {
      return {
        intent: "DOCUMENT_COUNT",
        confidence: "high",
        parsedEntities: { documentNameQuery, courseNameQuery, statusFilter, fileTypeFilter, countLimit, candidateDocumentIds: [] },
        reasonCode: "metadata_keyword_match",
      };
    }

    if (this.matchesDocumentList(normalized, plain)) {
      return {
        intent: hasAny(normalized, ["pdf", "docx", "pptx", "doc"]) || statusFilter || fileTypeFilter
          ? "DOCUMENT_FILTERED_LIST"
          : "DOCUMENT_LIST",
        confidence: "high",
        parsedEntities: { documentNameQuery, courseNameQuery, statusFilter, fileTypeFilter, countLimit, candidateDocumentIds: [] },
        reasonCode: "metadata_keyword_match",
      };
    }

    if (this.matchesCourseScopeSuggestion(normalized)) {
      return {
        intent: "COURSE_SCOPE_SUGGESTION",
        confidence: "medium",
        parsedEntities: { documentNameQuery, courseNameQuery, statusFilter, fileTypeFilter, countLimit, candidateDocumentIds: [] },
        reasonCode: "insufficient_referent",
      };
    }

    if (hasAcademicSignal) {
      return {
        intent: "RAG_QA",
        confidence: documentNameQuery ? "high" : "medium",
        parsedEntities: { documentNameQuery, courseNameQuery, statusFilter, fileTypeFilter, countLimit, candidateDocumentIds: [] },
        reasonCode: "fallback_rag",
      };
    }

    if (hasDocumentMetadataSignal) {
      return {
        intent: "CLARIFY_INTENT",
        confidence: "low",
        parsedEntities: { documentNameQuery, courseNameQuery, statusFilter, fileTypeFilter, countLimit, candidateDocumentIds: [] },
        reasonCode: "insufficient_referent",
      };
    }

    return {
      intent: "CLARIFY_INTENT",
      confidence: "low",
      parsedEntities: { documentNameQuery, courseNameQuery, statusFilter, fileTypeFilter, countLimit, candidateDocumentIds: [] },
      reasonCode: "insufficient_referent",
    };
  }

  private static matchesScopeChange(text: string) {
    return (
      text.includes("doi pham vi") ||
      text.includes("doi sang mon") ||
      text.includes("them mon") ||
      text.includes("bo mon") ||
      text.includes("mo rong sang tat ca mon") ||
      text.includes("tat ca mon") ||
      text.includes("chon lai pham vi")
    );
  }

  private static matchesScopeShow(text: string) {
    return (
      text.includes("scope hien tai") ||
      text.includes("dang tim trong nhung mon nao") ||
      text.includes("dang hoc trong mon nao") ||
      text.includes("toi dang hoi trong mon nao") ||
      text.includes("pham vi hien tai")
    );
  }

  private static matchesOutOfScopeSystemRequest(text: string) {
    return (
      text.includes("xoa tai lieu") ||
      text.includes("tai tai lieu") ||
      text.includes("upload tai lieu") ||
      text.includes("doi goi") ||
      text.includes("mo quyen") ||
      text.includes("cap quyen") ||
      text.includes("doi mon")
    );
  }

  private static matchesSmallTalk(text: string) {
    return (
      text === "chao" ||
      text === "cam on" ||
      text === "ok" ||
      text === "oke" ||
      text === "thanks" ||
      text.startsWith("xin chao")
    );
  }

  private static matchesCitationLookup(text: string) {
    return (
      text.includes("trang may") ||
      text.includes("nguon o dau") ||
      text.includes("y vua roi") ||
      text.includes("nguon cua cau tra loi") ||
      text.includes("nguon gan nhat") ||
      text.includes("trich dan")
    );
  }

  private static matchesCourseList(text: string) {
    return text.includes("nhung mon nao") || text.includes("danh sach mon hoc") || text.includes("co nhung mon nao");
  }

  private static matchesDocumentProcessingSummary(text: string) {
    return text.includes("file nao dang processing") || text.includes("dang xu ly") || text.includes("can tai lieu nao");
  }

  private static matchesLatestUploads(text: string) {
    return text.includes("moi nhat") || text.includes("gan day") || text.includes("vua tai len") || text.includes("upload moi nhat");
  }

  private static matchesDocumentStatus(text: string) {
    return text.includes("trang thai") || text.includes("dang trang thai") || text.includes("da xu ly xong chua");
  }

  private static matchesDocumentExistence(text: string) {
    return text.includes("co file") || text.includes("da co") || text.includes("co tai lieu") || text.includes("da co slide");
  }

  private static matchesDocumentCount(text: string) {
    return hasAny(text, COUNT_KEYWORDS) && hasAny(text, DOCUMENT_KEYWORDS);
  }

  private static matchesDocumentList(text: string, plain: string) {
    return (
      (hasAny(text, LIST_KEYWORDS) && hasAny(text, DOCUMENT_KEYWORDS)) ||
      plain === "tai lieu" ||
      plain === "file" ||
      plain === "danh sach tai lieu"
    );
  }

  private static matchesCourseScopeSuggestion(text: string) {
    return text.includes("thuoc mon nao") || text.includes("cua mon nao") || text.includes("mon nao") || text.includes("course nao");
  }
}
