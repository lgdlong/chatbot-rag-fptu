// web/api/courses.ts
import { apiClient } from "./client";
import { Course } from "../types";

export interface CoursesResponse {
    courses: Course[];
}

export const coursesApi = {
    // 1. Lấy danh sách khóa học/môn học thực tế từ Postgres DB
    getCourses: async (): Promise<CoursesResponse> => {
        const response = await apiClient.get<CoursesResponse>("/api/chat/courses");
        return response.data;
    },
};
