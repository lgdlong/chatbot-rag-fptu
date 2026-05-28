// web/hooks/useChat.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chatApi, type CreateChatSessionInput } from "../api/chat";

export function useChatSessions() {
    return useQuery({
        queryKey: ["chat-sessions"],
        queryFn: () => chatApi.getChatSessions(),
    });
}

export function useChatSessionDetails(sessionId: string) {
    return useQuery({
        queryKey: ["chat-session-details", sessionId],
        queryFn: () => chatApi.getChatSessionDetails(sessionId),
        enabled: !!sessionId, // Chỉ chạy khi có sessionId hợp lệ
    });
}

export function useCreateChatSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload?: CreateChatSessionInput) => chatApi.createChatSession(payload),
        onSuccess: () => {
            // Refresh danh sách các session chat
            queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
        },
    });
}

export function useRenameChatSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ sessionId, title }: { sessionId: string; title: string }) =>
            chatApi.renameChatSession(sessionId, title),
        onSuccess: (_, variables) => {
            // Refresh chi tiết session và danh sách session
            queryClient.invalidateQueries({ queryKey: ["chat-session-details", variables.sessionId] });
            queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
        },
    });
}

export function useDeleteChatSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (sessionId: string) => chatApi.deleteChatSession(sessionId),
        onSuccess: () => {
            // Refresh danh sách các session sau khi xóa thành công
            queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
        },
    });
}
