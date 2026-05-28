// web/api/documents.ts
import { apiClient } from "./client";
import { Document } from "../types";

export interface DocumentsResponse {
    documents: Document[];
}

export interface UploadDocumentResponse {
    success: boolean;
    document: {
        id: string;
        name: string;
        status: string;
    };
}

export const documentsApi = {
    // 1. Lấy danh sách tài liệu môn học
    getDocuments: async (courseId: string): Promise<DocumentsResponse> => {
        const response = await apiClient.get<DocumentsResponse>(`/api/chat/courses/${courseId}/documents`);
        return response.data;
    },

    // 2. Nạp tài liệu mới (Upload) qua FormData
    uploadDocument: async (courseId: string, file: File): Promise<UploadDocumentResponse> => {
        const formData = new FormData();
        formData.append("file", file);

        const response = await apiClient.post<UploadDocumentResponse>(
            `/api/courses/${courseId}/documents`,
            formData,
            {
                headers: {
                    // Để trình duyệt tự gen boundary phù hợp với multipart/form-data
                    "Content-Type": "multipart/form-data",
                },
            }
        );
        return response.data;
    },

    // 3. Xóa tài liệu khỏi hệ thống
    deleteDocument: async (courseId: string, documentId: string): Promise<{ success: boolean }> => {
        const response = await apiClient.delete<{ success: boolean }>(
            `/api/courses/${courseId}/documents/${documentId}`
        );
        return response.data;
    },
};
