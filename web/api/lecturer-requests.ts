import { apiClient } from "./client";

export interface CreateLecturerRequestPayload {
  name: string;
  email: string;
  reason: string;
}

export interface LecturerRequestSubmission {
  id: string;
  name: string;
  email: string;
  reason: string;
  status: string;
  createdAt?: string;
}

export const lecturerRequestsApi = {
  create: async (payload: CreateLecturerRequestPayload) => {
    const response = await apiClient.post<{
      success: boolean;
      request: LecturerRequestSubmission;
    }>("/api/auth-admin/lecturer-request", payload);

    return response.data;
  },
};
