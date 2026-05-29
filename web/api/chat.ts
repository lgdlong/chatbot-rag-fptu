// web/api/chat.ts
import { apiClient } from "./client";
import { ChatSession, ChatMessage, DocumentCatalogGroup } from "../types";
import { API_BASE_URL, TENANT_ID_HEADER, DEFAULT_TENANT_ID } from "../constants";

export type CreateChatSessionInput = {
    scopeMode?: 'ALL_COURSES' | 'SELECTED_COURSES' | 'SELECTED_DOCUMENTS';
    courseIds?: string[];
    courseId?: string | null;
    documentIds?: string[];
};

export interface ChatSessionsResponse {
    sessions: ChatSession[];
}

export interface CreateChatSessionResponse {
    session: ChatSession;
}

export interface ChatSessionDetailsResponse {
    session: ChatSession & {
        messages: ChatMessage[];
        course?: {
            id: string;
            code: string;
            name: string;
        } | null;
    };
}

export interface DocumentCatalogResponse {
    groups: DocumentCatalogGroup[];
    totalCourses: number;
    totalDocuments: number;
}

export interface StreamCitation {
    documentName: string;
    page: number;
    documentId?: string;
    isDeleted?: boolean;
    fileUrl?: string | null;
}

export const chatApi = {
    // 1. Lấy danh sách lịch sử phòng chat của user hiện tại
    getChatSessions: async (): Promise<ChatSessionsResponse> => {
        const response = await apiClient.get<ChatSessionsResponse>("/api/chat/sessions");
        return response.data;
    },

    getDocumentCatalog: async (): Promise<DocumentCatalogResponse> => {
        const response = await apiClient.get<DocumentCatalogResponse>("/api/chat/document-catalog");
        return response.data;
    },

    // 2. Tạo phòng chat mới với phạm vi rõ ràng
    createChatSession: async (payload: CreateChatSessionInput = {}): Promise<CreateChatSessionResponse> => {
        const response = await apiClient.post<CreateChatSessionResponse>("/api/chat/sessions", payload);
        return response.data;
    },

    // 3. Lấy chi tiết lịch sử tin nhắn trong phòng chat
    getChatSessionDetails: async (sessionId: string): Promise<ChatSessionDetailsResponse> => {
        const response = await apiClient.get<ChatSessionDetailsResponse>(`/api/chat/sessions/${sessionId}`);
        return response.data;
    },

    // 4. Đổi tên phòng chat (Rename)
    renameChatSession: async (sessionId: string, title: string): Promise<{ success: boolean; session: ChatSession }> => {
        const response = await apiClient.patch<{ success: boolean; session: ChatSession }>(
            `/api/chat/sessions/${sessionId}`,
            { title }
        );
        return response.data;
    },

    // 5. Xóa phòng chat khỏi lịch sử
    deleteChatSession: async (sessionId: string): Promise<{ success: boolean }> => {
        const response = await apiClient.delete<{ success: boolean }>(`/api/chat/sessions/${sessionId}`);
        return response.data;
    },
};

// 6. Truyền luồng phản hồi từ Hono RAG Chatbot (SSE Stream) sử dụng native fetch
export async function streamChat(
    sessionId: string,
    message: string,
    onChunk: (chunk: string) => void,
    onCitations: (citations: StreamCitation[]) => void,
    onError: (error: string) => void,
) {
    const quotaExceededMessage =
        "Bạn đã hết quota chat của gói hiện tại. Hãy chờ đến khi quota được đặt lại hoặc nâng cấp gói cao hơn để tiếp tục.";

    try {
        const response = await fetch(`${API_BASE_URL}/api/chat/send`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                [TENANT_ID_HEADER]: DEFAULT_TENANT_ID,
            },
            body: JSON.stringify({ sessionId, message }),
            credentials: "include", // Đảm bảo mang theo cookie better-auth.session_token từ Next.js client
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            if (errData && typeof errData === "object" && (errData as { error?: unknown }).error === "LIMIT_EXCEEDED") {
                throw new Error(
                    (errData as { message?: string }).message || quotaExceededMessage
                );
            }
            throw new Error(errData.error || errData.message || `Lỗi máy chủ: ${response.status}`);
        }

        if (!response.body) {
            throw new Error("Không nhận được luồng dữ liệu trả về từ máy chủ.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            
            // Lưu lại phần dư của dòng cuối cùng (chưa xuống dòng trọn vẹn)
            buffer = lines.pop() || "";

            for (const line of lines) {
                const cleanedLine = line.trim();
                if (!cleanedLine) continue;

                // Chuẩn Hono streamSSE gửi định dạng SSE: event và data
                // Chúng ta sẽ parse phần data dạng: `data: {"chunk":"..."}` hoặc `data: {"citations":[...]}`
                if (cleanedLine.startsWith("data:")) {
                    const rawJson = cleanedLine.slice(5).trim();
                    try {
                        const parsed = JSON.parse(rawJson);
                        if (parsed.chunk !== undefined) {
                            onChunk(parsed.chunk);
                        } else if (parsed.citations !== undefined) {
                            onCitations(parsed.citations);
                        } else if (parsed.error !== undefined) {
                            onError(parsed.error);
                        }
                    } catch (e) {
                        console.warn("Lỗi parse SSE JSON chunk:", e, cleanedLine);
                    }
                }
            }
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Kết nối mạng gặp sự cố.";
        console.error("Lỗi trong quá trình stream SSE RAG:", err);
        onError(message);
    }
}
