// web/api/courses.ts
import { apiClient } from "./client";
import { Course } from "../types";

export interface CoursesResponse {
    courses: Course[];
}

export interface CreateCoursePayload {
    code: string;
    name: string;
}

export interface CreateCourseResponse {
    course: Course;
}

export interface UpdateCoursePayload {
    code: string;
    name: string;
}

export interface UpdateCourseResponse {
    course: Course;
}

export const coursesApi = {
    // 1. Lấy danh sách khóa học/môn học thực tế từ Postgres DB
    getCourses: async (): Promise<CoursesResponse> => {
        const response = await apiClient.get<CoursesResponse>("/api/courses");
        return response.data;
    },

    // 2. Tạo môn học mới cho lecturer
    createCourse: async (payload: CreateCoursePayload): Promise<CreateCourseResponse> => {
        const response = await apiClient.post<CreateCourseResponse>("/api/courses", payload);
        return response.data;
    },

    // 3. Cập nhật thông tin môn học
    updateCourse: async (courseId: string, payload: UpdateCoursePayload): Promise<UpdateCourseResponse> => {
        const response = await apiClient.patch<UpdateCourseResponse>(`/api/courses/${courseId}`, payload);
        return response.data;
    },

    // 4. Xóa môn học khi không còn tài liệu
    deleteCourse: async (courseId: string): Promise<{ success: boolean }> => {
        const response = await apiClient.delete<{ success: boolean }>(`/api/courses/${courseId}`);
        return response.data;
    },
};
