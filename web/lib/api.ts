// web/lib/api.ts
export const API_BASE_URL = "http://localhost:8000";

// Biến lưu trạng thái user ảo trên RAM
let mockUser: any = null;

export const api = {
  // 1. Kiểm tra session
  getSession: async () => {
    await new Promise((r) => setTimeout(r, 500));
    if (!mockUser) throw new Error("Chưa đăng nhập");
    return { user: mockUser };
  },

  // 2. Đăng nhập giả lập hỗ trợ 3 Role
  devLogin: async (role: 'student' | 'lecturer' | 'admin') => {
    await new Promise((r) => setTimeout(r, 800));

    // Gán thông tin user tùy theo role được chọn
    if (role === 'student') {
      mockUser = { id: "stu1", name: "Sinh viên FPTU", role: "student" };
    } else if (role === 'lecturer') {
      mockUser = { id: "lec1", name: "Giảng viên FPTU", role: "lecturer" };
    } else {
      mockUser = { id: "adm1", name: "Quản trị viên Hệ thống", role: "admin" };
    }

    return { success: true, user: mockUser };
  },

  // 3. Đăng xuất giả lập
  logout: async () => {
    await new Promise((r) => setTimeout(r, 500));
    mockUser = null;
    return { success: true };
  },

  // 3. Lấy danh sách khóa học
  getCourses: async () => {
    await new Promise((r) => setTimeout(r, 600));
    return {
      courses: [
        { id: "c1", code: "SWD392", name: "Software Architecture and Design" },
        { id: "c2", code: "PRJ301", name: "Java Web Development" },
      ],
    };
  },

  // 4. Lấy danh sách tài liệu
  getDocuments: async (courseId: string) => {
    await new Promise((r) => setTimeout(r, 500));
    if (courseId === "c1") {
      return {
        documents: [
          { id: "d1", name: "Chapter_1_UML.pdf", fileType: "pdf", status: "COMPLETED", createdAt: new Date().toISOString() },
          { id: "d2", name: "Chapter_2_Design_Patterns.pdf", fileType: "pdf", status: "PROCESSING", createdAt: new Date().toISOString() },
        ],
      };
    }
    return { documents: [] };
  },

  // 5. Nạp tài liệu mới (Upload)
  uploadDocument: async (courseId: string, file: File) => {
    await new Promise((r) => setTimeout(r, 1500)); // Giả lập upload mất 1.5s
    return { success: true };
  },

  // 6. Xóa tài liệu
  deleteDocument: async (courseId: string, documentId: string) => {
    await new Promise((r) => setTimeout(r, 800));
    return { success: true };
  },

  // 7. Lấy danh sách lịch sử Chat
  getChatSessions: async () => {
    await new Promise((r) => setTimeout(r, 400));
    return {
      sessions: [
        { id: "s1", title: "Hỏi về Use Case", updatedAt: new Date().toISOString(), course: { name: "Software Architecture and Design", code: "SWD392" } },
      ],
    };
  },

  // 8. Tạo phòng chat mới
  createChatSession: async (courseId: string) => {
    await new Promise((r) => setTimeout(r, 600));
    return { session: { id: "s_new_" + Date.now() } };
  },

  // 9. Lấy chi tiết tin nhắn trong 1 phòng chat
  getChatSessionDetails: async (sessionId: string) => {
    await new Promise((r) => setTimeout(r, 500));
    return {
      session: {
        id: sessionId,
        course: { name: "Software Architecture and Design", code: "SWD392" },
        messages: [
          { id: "m1", sender: "USER", content: "Use Case Diagram là gì?", createdAt: new Date().toISOString() },
          {
            id: "m2",
            sender: "ASSISTANT",
            content: "Use Case Diagram là một biểu đồ trong UML dùng để mô tả các chức năng của hệ thống dưới góc nhìn của người dùng.",
            citations: [{ documentName: "Chapter_1_UML.pdf", page: 12 }],
            createdAt: new Date().toISOString()
          },
        ],
      },
    };
  },
};

// 10. Streaming Tin nhắn giả lập (Như ChatGPT đang gõ chữ)
export async function streamChat(
  sessionId: string,
  message: string,
  onChunk: (chunk: string) => void,
  onCitations: (citations: any[]) => void,
  onError: (error: string) => void,
) {
  const dummyResponse = " Chào bạn, đây là câu trả lời được stream trực tiếp từ Frontend để test giao diện. Nếu cấu trúc này ổn, khi ghép API thật vào, hệ thống RAG sẽ trả lời mượt mà y như thế này!";

  let i = 0;
  const interval = setInterval(() => {
    onChunk(dummyResponse.charAt(i));
    i++;
    if (i >= dummyResponse.length) {
      clearInterval(interval);
      // Gửi nguồn trích dẫn sau khi gõ xong
      onCitations([{ documentName: "Chapter_1_UML.pdf", page: 15 }]);
    }
  }, 30); // Tốc độ gõ: 30ms/chữ
}