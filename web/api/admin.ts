import { apiClient } from "./client";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: string | null;
  createdAt?: string;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
  limit?: number;
  offset?: number;
}

export interface AdminListUsersParams {
  searchField?: "name" | "email";
  searchValue?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
}

export interface LecturerRequest {
  id: string;
  name: string;
  email: string;
  reason: string;
  status: string;
  createdAt?: string;
}

export const adminApi = {
  listUsers: async (params: AdminListUsersParams = {}) => {
    const response = await apiClient.get<AdminUsersResponse>("/api/auth/admin/list-users", {
      params,
    });
    return response.data;
  },

  banUser: async (payload: { userId: string; banReason: string }) => {
    const response = await apiClient.post("/api/auth/admin/ban-user", payload);
    return response.data;
  },

  unbanUser: async (payload: { userId: string }) => {
    const response = await apiClient.post("/api/auth/admin/unban-user", payload);
    return response.data;
  },

  getLecturerRequests: async () => {
    const response = await apiClient.get<{ requests: LecturerRequest[] }>(
      "/api/auth-admin/admin/lecturer-requests",
    );
    return response.data;
  },

  approveLecturerRequest: async (requestId: string) => {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
      credentials: {
        email: string;
        temporaryPassword: string;
      };
    }>(`/api/auth-admin/admin/lecturer-requests/${requestId}/approve`);
    return response.data;
  },

  rejectLecturerRequest: async (requestId: string) => {
    const response = await apiClient.post<{ success: boolean }>(
      `/api/auth-admin/admin/lecturer-requests/${requestId}/reject`,
    );
    return response.data;
  },
};
