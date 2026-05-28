// web/api/client.ts
import axios from "axios";
import { API_BASE_URL, TENANT_ID_HEADER, DEFAULT_TENANT_ID } from "../constants";

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // Tự động đính kèm cookie better-auth.session_token
    headers: {
        "Content-Type": "application/json",
        [TENANT_ID_HEADER]: DEFAULT_TENANT_ID, // Mặc định dùng tenant default cho môi trường đơn giản
    },
});

// Response interceptor để chuẩn hóa lỗi trả về từ Hono API
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const message = error.response?.data?.error || error.response?.data?.message || error.message || "Đã xảy ra lỗi không xác định";
        return Promise.reject(new Error(message));
    }
);
