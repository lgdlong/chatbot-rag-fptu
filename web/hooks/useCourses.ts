// web/hooks/useCourses.ts
import { useQuery } from "@tanstack/react-query";
import { coursesApi } from "../api/courses";

export function useCourses() {
    return useQuery({
        queryKey: ["courses"],
        queryFn: () => coursesApi.getCourses(),
        staleTime: 10 * 60 * 1000, // Danh sách môn học ít thay đổi, cache trong 10 phút
    });
}
