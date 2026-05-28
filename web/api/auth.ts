// web/api/auth.ts
import { apiClient } from "./client";
import { User } from "../types";

export interface DevLoginResponse {
    success: boolean;
    user: User;
    token: string;
}

export interface SessionResponse {
    user: User;
    session: {
        id: string;
        userId: string;
        expiresAt: string;
        activeOrganizationId?: string | null;
    };
}

export const authApi = {
    // 1. Đăng nhập môi trường phát triển (Dev Bypass)
    devLogin: async (role: 'student' | 'lecturer' | 'admin'): Promise<DevLoginResponse> => {
        // Lưu ý: Backend devLogin hỗ trợ tạo nhanh session cho user test.
        // Tùy theo vai trò được chọn, backend sẽ cấu hình vai trò phù hợp trong DB (STUDENT/LECTURER/ADMIN).
        // Hono backend endpoint là `/api/chat/dev-login`.
        const response = await apiClient.post<DevLoginResponse>("/api/chat/dev-login", { role });
        return response.data;
    },

    // 2. Lấy Session hiện tại từ Better Auth
    getSession: async (): Promise<SessionResponse> => {
        const response = await apiClient.get<SessionResponse>("/api/auth/get-session");
        return response.data;
    },

    // Standard Login bằng Email/Password qua Better Auth thật
    login: async (email: string, password: string): Promise<SessionResponse> => {
        const response = await apiClient.post<SessionResponse>("/api/auth/sign-in/email", { email, password });
        return response.data;
    },

    // 3. Đăng xuất Better Auth
    logout: async (): Promise<{ success: boolean }> => {
        await apiClient.post("/api/auth/sign-out", {});
        return { success: true };
    },
};
