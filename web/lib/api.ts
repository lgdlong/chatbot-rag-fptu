// web/lib/api.ts
import { authApi } from "../api/auth";
import { coursesApi } from "../api/courses";
import { documentsApi } from "../api/documents";
import { chatApi, streamChat as realStreamChat } from "../api/chat";

export const API_BASE_URL = "http://localhost:8000";

// Bắc cầu re-export các hàm API thật sử dụng Axios
export const api = {
    // 1. Kiểm tra session thật từ Better Auth
    getSession: async () => {
        return authApi.getSession();
    },

    // 2. Đăng nhập môi trường phát triển (Dev login)
    devLogin: async (role: 'student' | 'lecturer' | 'admin') => {
        return authApi.devLogin(role);
    },

    // Đăng nhập email thật
    login: async (email: string, password: string) => {
        return authApi.login(email, password);
    },

    // 3. Đăng xuất thật qua Better Auth
    logout: async () => {
        return authApi.logout();
    },

    // 4. Lấy danh sách khóa học thật từ DB
    getCourses: async () => {
        return coursesApi.getCourses();
    },

    // 5. Lấy danh sách tài liệu thật theo courseId
    getDocuments: async (courseId: string) => {
        return documentsApi.getDocuments(courseId);
    },

    // 6. Nạp tài liệu mới thật qua multipart FormData
    uploadDocument: async (courseId: string, file: File) => {
        return documentsApi.uploadDocument(courseId, file);
    },

    // 7. Xóa tài liệu thật
    deleteDocument: async (courseId: string, documentId: string) => {
        return documentsApi.deleteDocument(courseId, documentId);
    },

    // 8. Lấy danh sách lịch sử Chat thật
    getChatSessions: async () => {
        return chatApi.getChatSessions();
    },

    // 9. Tạo phòng chat mới
    createChatSession: async (courseId?: string) => {
        return chatApi.createChatSession(courseId);
    },

    // 10. Lấy chi tiết lịch sử tin nhắn trong phòng chat thật
    getChatSessionDetails: async (sessionId: string) => {
        return chatApi.getChatSessionDetails(sessionId);
    },
};

// 11. Đăng ký hàm streamChat kết nối luồng SSE từ Backend
export const streamChat = realStreamChat;
