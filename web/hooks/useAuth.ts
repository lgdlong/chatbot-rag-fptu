// web/hooks/useAuth.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../api/auth";

export function useSession() {
    return useQuery({
        queryKey: ["auth-session"],
        queryFn: () => authApi.getSession(),
        retry: false, // Không tự động retry khi chưa đăng nhập
        staleTime: 5 * 60 * 1000, // Session được cache trong 5 phút
    });
}

export function useDevLogin() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (role: 'student' | 'lecturer' | 'admin') => authApi.devLogin(role),
        onSuccess: (data) => {
            // Cập nhật ngay lập tức dữ liệu session cache
            queryClient.setQueryData(["auth-session"], {
                user: data.user,
                session: { id: "temp-session", userId: data.user.id, expiresAt: new Date().toISOString() }
            });
            // Reset tất cả các query khác để tránh rò rỉ dữ liệu cũ
            queryClient.invalidateQueries();
        },
    });
}

export function useLogin() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ email, password }: { email: string; password: string }) => authApi.login(email, password),
        onSuccess: (data) => {
            queryClient.setQueryData(["auth-session"], data);
            queryClient.invalidateQueries();
        },
    });
}

export function useLogout() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => authApi.logout(),
        onSuccess: () => {
            // Xóa session cache
            queryClient.setQueryData(["auth-session"], null);
            // Xóa toàn bộ cache queries
            queryClient.clear();
        },
    });
}
