// web/hooks/useDocuments.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsApi } from "../api/documents";

export function useDocuments(courseId: string) {
    return useQuery({
        queryKey: ["documents", courseId],
        queryFn: () => documentsApi.getDocuments(courseId),
        enabled: !!courseId, // Chỉ chạy khi có courseId
        refetchInterval: (query) => {
            // Tự động poll mỗi 3 giây nếu có tài liệu đang ở trạng thái PROCESSING hoặc PENDING
            const documents = query.state.data?.documents || [];
            const hasProcessing = documents.some(
                (doc) => doc.status === "PENDING" || doc.status === "PROCESSING"
            );
            return hasProcessing ? 3000 : false;
        },
    });
}

export function useUploadDocument(courseId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (file: File) => documentsApi.uploadDocument(courseId, file),
        onSuccess: () => {
            // Refresh danh sách tài liệu sau khi upload thành công
            queryClient.invalidateQueries({ queryKey: ["documents", courseId] });
        },
    });
}

export function useDeleteDocument(courseId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (documentId: string) => documentsApi.deleteDocument(courseId, documentId),
        onSuccess: () => {
            // Refresh danh sách tài liệu sau khi xóa thành công
            queryClient.invalidateQueries({ queryKey: ["documents", courseId] });
        },
    });
}
