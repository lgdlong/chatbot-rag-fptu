export const openApiDoc = {
  openapi: "3.0.0",
  info: {
    title: "FPTU Chatbot RAG API Documentation",
    version: "1.0.0",
    description: "Tài liệu API chi tiết cho hệ thống Chatbot RAG hỗ trợ học tập tại Đại học FPT. Hỗ trợ đầy đủ các module RAG slide/video ingestion, chat streaming (SSE), phân quyền admin, và thanh toán nâng cấp gói dịch vụ qua PayOS.",
    contact: {
      name: "FPTU RAG Team",
      email: "support@fpt.edu.vn"
    }
  },
  servers: [
    {
      url: "http://localhost:8000",
      description: "Development Server"
    }
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "better-auth.session_token",
        description: "Xác thực Session Cookie qua thư viện Better Auth."
      },
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        description: "Bearer Token sử dụng INTERNAL_API_KEY để xác thực các request nội bộ giữa Ingestion Worker và Backend API."
      }
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          error: {
            type: "string",
            example: "Unauthorized"
          }
        }
      },
      HealthResponse: {
        type: "object",
        properties: {
          status: { type: "string", example: "UP" },
          timestamp: { type: "string", example: "2026-05-27T16:38:00.000Z" },
          latencyMs: { type: "integer", example: 12 },
          services: {
            type: "object",
            properties: {
              database: {
                type: "object",
                properties: {
                  status: { type: "string", example: "UP" },
                  latencyMs: { type: "integer", example: 5 }
                }
              }
            }
          },
          system: {
            type: "object",
            properties: {
              uptimeSeconds: { type: "number", example: 120.45 },
              memoryUsage: {
                type: "object",
                properties: {
                  rss: { type: "string", example: "84.5 MB" },
                  heapTotal: { type: "string", example: "45.2 MB" },
                  heapUsed: { type: "string", example: "32.1 MB" }
                }
              },
              nodeVersion: { type: "string", example: "v20.11.17" }
            }
          }
        }
      },
      Course: {
        type: "object",
        properties: {
          id: { type: "string", example: "course-123" },
          code: { type: "string", example: "SWD392" },
          name: { type: "string", example: "Software Architecture and Design" },
          description: { type: "string", example: "Môn học thiết kế và kiến trúc phần mềm" }
        }
      },
      Document: {
        type: "object",
        properties: {
          id: { type: "string", example: "doc-456" },
          name: { type: "string", example: "Chapter_1_Introduction.pdf" },
          fileUrl: { type: "string", example: "/uploads/1716382025_Chapter_1.pdf" },
          fileType: { type: "string", example: "pdf" },
          status: { type: "string", example: "SUCCESS", enum: ["PENDING", "PROCESSING", "SUCCESS", "FAILED"] },
          courseId: { type: "string", example: "course-123" },
          createdAt: { type: "string", example: "2026-05-27T16:38:00.000Z" }
        }
      },
      ChatSession: {
        type: "object",
        properties: {
          id: { type: "string", example: "session-789" },
          title: { type: "string", example: "Hỏi về SOLID principles" },
          userId: { type: "string", example: "user-123" },
          courseId: { type: "string", example: "course-123" },
          scopeMode: { type: "string", example: "ALL_COURSES", enum: ["ALL_COURSES", "SELECTED_COURSES"] },
          scopedCourses: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string", example: "course-123" },
                code: { type: "string", example: "SWD392" },
                name: { type: "string", example: "Software Architecture" }
              }
            }
          },
          createdAt: { type: "string", example: "2026-05-27T16:38:00.000Z" }
        }
      },
      ChatMessage: {
        type: "object",
        properties: {
          id: { type: "string", example: "msg-999" },
          sessionId: { type: "string", example: "session-789" },
          sender: { type: "string", example: "ASSISTANT", enum: ["USER", "ASSISTANT"] },
          content: { type: "string", example: "SOLID là 5 nguyên tắc vàng trong thiết kế..." },
          citations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                documentId: { type: "string", example: "doc-456" },
                documentName: { type: "string", example: "Chapter_1_Introduction.pdf" },
                page: { type: "integer", example: 3 },
                text: { type: "string", example: "SOLID principles help developers build maintainable..." },
                isDeleted: { type: "boolean", example: false }
              }
            }
          },
          createdAt: { type: "string", example: "2026-05-27T16:38:05.000Z" }
        }
      },
      LecturerRequest: {
        type: "object",
        properties: {
          id: { type: "string", example: "req-111" },
          name: { type: "string", example: "Nguyễn Văn A" },
          email: { type: "string", example: "anv@fpt.edu.vn" },
          reason: { type: "string", example: "Tôi giảng dạy bộ môn Kỹ thuật phần mềm tại FPTU Cần Thơ." },
          status: { type: "string", example: "PENDING", enum: ["PENDING", "APPROVED", "REJECTED"] },
          createdAt: { type: "string", example: "2026-05-27T16:38:00.000Z" }
        }
      },
      Subscription: {
        type: "object",
        properties: {
          id: { type: "string", example: "sub-222" },
          userId: { type: "string", example: "user-123" },
          tier: { type: "string", example: "BASIC", enum: ["BASIC", "SILVER", "GOLD"] },
          startDate: { type: "string", example: "2026-05-27T16:38:00.000Z" },
          endDate: { type: "string", example: "2126-05-27T16:38:00.000Z" },
          maxMessages: { type: "integer", example: 10 },
          messageCount: { type: "integer", example: 3 },
          lastReset: { type: "string", example: "2026-05-27T16:38:00.000Z" }
        }
      }
    }
  },
  paths: {
    "/api/health": {
      get: {
        summary: "Chi tiết trạng thái hệ thống (Health Check)",
        description: "Kiểm tra tình trạng hoạt động của API server và database PostgreSQL kết nối qua Prisma, kèm đo lường độ trễ (latencyMs) và sử dụng bộ nhớ.",
        responses: {
          "200": {
            description: "Hệ thống hoạt động bình thường.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthResponse" }
              }
            }
          },
          "503": {
            description: "Một hoặc nhiều dịch vụ lõi (ví dụ Database) bị lỗi ngắt kết nối.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthResponse" }
              }
            }
          }
        }
      }
    },
    "/api/courses/{courseId}/documents": {
      post: {
        summary: "Tải lên và lập chỉ mục slide/tài liệu (PDF)",
        description: "Yêu cầu quyền LECTURER/ADMIN. Cho phép tải lên file PDF (dung lượng tối đa 50MB theo SRS) cho một môn học cụ thể. Hệ thống sẽ lưu trữ và đẩy Job xử lý RAG Ingestion vào Redis Queue để Go worker tiến hành trích xuất slide, chia chunk, tạo embedding và lưu Vector DB.",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "courseId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "ID của môn học cần tải tài liệu lên."
          }
        ],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  file: {
                    type: "string",
                    format: "binary",
                    description: "Tài liệu giảng dạy định dạng PDF."
                  }
                },
                required: ["file"]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Tải file thành công và đang đưa vào hàng đợi xử lý RAG.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    document: {
                      type: "object",
                      properties: {
                        id: { type: "string", example: "doc-456" },
                        name: { type: "string", example: "Chapter_1.pdf" },
                        status: { type: "string", example: "PROCESSING" }
                      }
                    }
                  }
                }
              }
            }
          },
          "400": {
            description: "Không có file được tải lên, định dạng không phải PDF, hoặc file vượt quá 50MB.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "401": {
            description: "Chưa đăng nhập hệ thống.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "500": {
            description: "Lỗi kết nối Redis Queue hoặc lỗi ghi file.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      },
      delete: {
        summary: "Xóa tài liệu và dữ liệu vector chỉ mục",
        description: "Yêu cầu quyền LECTURER/ADMIN. Xóa tài liệu khỏi PostgreSQL, xóa file PDF gốc và các file trang slide ảnh chunk trên ổ đĩa, đồng thời dọn dẹp Vector chỉ mục liên quan.",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "courseId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "ID của môn học chứa tài liệu."
          },
          {
            name: "documentId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "ID tài liệu cần xóa."
          }
        ],
        responses: {
          "200": {
            description: "Xóa thành công hoặc tài liệu không tồn tại.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true }
                  }
                }
              }
            }
          },
          "401": {
            description: "Chưa đăng nhập hệ thống.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "403": {
            description: "Không có quyền quản trị môn học này.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "409": {
            description: "Tài liệu đang trong tiến trình xử lý (PENDING/PROCESSING), không được xóa.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "500": {
            description: "Gặp lỗi trong quá trình dọn dẹp file hoặc database.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/api/internal/documents/{id}": {
      patch: {
        summary: "Webhook nội bộ: Cập nhật trạng thái Ingestion",
        description: "Được gọi bởi Go Ingestion Worker khi hoàn tất hoặc thất bại việc trích xuất chunk, tính toán embeddings của tài liệu. Cần truyền chính xác INTERNAL_API_KEY dạng Bearer Token.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "ID tài liệu cần cập nhật trạng thái."
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "string", example: "SUCCESS", enum: ["SUCCESS", "FAILED"] },
                  error: { type: "string", example: "Failed to extract text from page 5" }
                },
                required: ["status"]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Cập nhật thành công.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true }
                  }
                }
              }
            }
          },
          "401": {
            description: "Authorization Header không khớp với INTERNAL_API_KEY.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "500": {
            description: "Lỗi cập nhật database PostgreSQL.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/api/chat/dev-login": {
      post: {
        summary: "Đăng nhập nhanh cho môi trường thử nghiệm E2E (Dev Mode)",
        description: "Tạo tự động và gán phiên đăng nhập cho user E2E testing (`user-test-e2e-id`), thiết lập vai trò STUDENT, trả về cookie Session cùng JWT Token và gắn vào Response header (Set-Cookie).",
        responses: {
          "200": {
            description: "Đăng nhập thành công, session cookie được gán vào header.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    user: {
                      type: "object",
                      properties: {
                        id: { type: "string", example: "user-test-e2e-id" },
                        email: { type: "string", example: "student-test@fpt.edu.vn" }
                      }
                    },
                    token: { type: "string", example: "cryptographic_jwt_session_token" }
                  }
                }
              }
            }
          },
          "500": {
            description: "Lỗi kết nối Better Auth hoặc DB.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/api/chat/courses": {
      get: {
        summary: "Lấy danh sách tất cả môn học",
        description: "Lấy toàn bộ môn học trong hệ thống để sinh viên lựa chọn ngữ cảnh chat.",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "Danh sách môn học.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    courses: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Course" }
                    }
                  }
                }
              }
            }
          },
          "401": {
            description: "Chưa đăng nhập.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/api/chat/courses/{courseId}/documents": {
      get: {
        summary: "Lấy danh sách tài liệu slide của môn học",
        description: "Lấy toàn bộ danh sách slide tài liệu học tập của môn học phục vụ giao diện RAG.",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "courseId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "ID môn học."
          }
        ],
        responses: {
          "200": {
            description: "Danh sách tài liệu slide môn học.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    documents: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Document" }
                    }
                  }
                }
              }
            }
          },
          "401": {
            description: "Chưa đăng nhập.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/api/chat/sessions": {
      get: {
        summary: "Lấy danh sách phiên hội thoại",
        description: "Lấy tất cả các cuộc hội thoại chat của sinh viên hiện tại, sắp xếp theo thời gian mới nhất.",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "Danh sách phiên hội thoại.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    sessions: {
                      type: "array",
                      items: { $ref: "#/components/schemas/ChatSession" }
                    }
                  }
                }
              }
            }
          },
          "401": {
            description: "Chưa đăng nhập.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      },
      post: {
        summary: "Tạo phiên hội thoại chat mới",
        description: "Tạo phiên hội thoại mới cho sinh viên. Có thể truyền `scopeMode` và `courseIds` để chọn phạm vi tài liệu, hoặc dùng payload legacy `courseId` trong giai đoạn chuyển tiếp.",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  scopeMode: { type: "string", enum: ["ALL_COURSES", "SELECTED_COURSES"], example: "ALL_COURSES" },
                  courseIds: {
                    type: "array",
                    items: { type: "string" },
                    example: ["course-123", "course-456"],
                    description: "Danh sách môn học được chọn khi scopeMode là SELECTED_COURSES."
                  },
                  courseId: { type: "string", example: "course-123", description: "Payload legacy để tương thích ngược." }
                }
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Tạo phiên thành công.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    session: { $ref: "#/components/schemas/ChatSession" }
                  }
                }
              }
            }
          },
          "401": {
            description: "Chưa đăng nhập.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/api/chat/sessions/{sessionId}": {
      get: {
        summary: "Lấy chi tiết tin nhắn của cuộc hội thoại",
        description: "Lấy đầy đủ lịch sử các tin nhắn của sinh viên và trợ lý AI trong cuộc hội thoại. Hệ thống tự động kiểm tra nguồn trích dẫn slide (citations), nếu slide gốc đã bị giảng viên xóa thì tự động đánh dấu `isDeleted: true` để tránh lỗi liên kết ở front-end.",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "sessionId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "ID cuộc hội thoại."
          }
        ],
        responses: {
          "200": {
            description: "Lịch sử tin nhắn cuộc hội thoại.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    session: {
                      allOf: [
                        { $ref: "#/components/schemas/ChatSession" },
                        {
                          type: "object",
                          properties: {
                            messages: {
                              type: "array",
                              items: { $ref: "#/components/schemas/ChatMessage" }
                            }
                          }
                        }
                      ]
                    }
                  }
                }
              }
            }
          },
          "401": {
            description: "Chưa đăng nhập.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "403": {
            description: "Phiên hội thoại này thuộc về người dùng khác.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "404": {
            description: "Không tìm thấy cuộc hội thoại.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      },
      patch: {
        summary: "Đổi tên tiêu đề cuộc hội thoại",
        description: "Thay đổi tiêu đề phiên chat của sinh viên hiện tại.",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "sessionId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "ID cuộc hội thoại."
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string", example: "Hỏi về các mô hình nhúng Việt ngữ" }
                },
                required: ["title"]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Đổi tên thành công.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    session: { $ref: "#/components/schemas/ChatSession" }
                  }
                }
              }
            }
          },
          "400": {
            description: "Tiêu đề không hợp lệ hoặc để trống.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "401": {
            description: "Chưa đăng nhập.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "403": {
            description: "Không có quyền cập nhật phiên chat này.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "404": {
            description: "Không tìm thấy phiên chat.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      },
      delete: {
        summary: "Xóa cuộc hội thoại",
        description: "Xóa cuộc hội thoại và toàn bộ tin nhắn liên quan khỏi hệ thống.",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "sessionId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "ID cuộc hội thoại."
          }
        ],
        responses: {
          "200": {
            description: "Xóa thành công.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true }
                  }
                }
              }
            }
          },
          "401": {
            description: "Chưa đăng nhập.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "403": {
            description: "Không có quyền xóa phiên chat này.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "404": {
            description: "Không tìm thấy phiên chat.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/api/chat/send": {
      post: {
        summary: "Gửi tin nhắn và truyền luồng câu trả lời (SSE Stream)",
        description: "Gửi câu hỏi của sinh viên. Hệ thống tự động kiểm tra hạn ngạch của sinh viên theo cửa sổ 5 giờ (Basic tối đa 10 câu/5 giờ). Nếu hợp lệ, hệ thống sẽ thực hiện truy vấn RAG (từ Vector DB Qdrant), gọi mô hình LLM Gemini sinh phản hồi và truyền luồng Server-Sent Events (SSE) từng từ về client để tạo hiệu ứng gõ phím mượt mà. Kết quả trả về chứa mảng trích dẫn nguồn (citations). Cuộc hội thoại đầu tiên sẽ được tự động tóm tắt qua AI để đặt tiêu đề.",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  sessionId: { type: "string", example: "session-789", description: "ID cuộc hội thoại." },
                  message: { type: "string", example: "Làm thế nào để áp dụng Liskov Substitution Principle?", description: "Nội dung câu hỏi." }
                },
                required: ["sessionId", "message"]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Kết nối Server-Sent Events (SSE) thành công. Gửi các sự kiện 'message' cho từng chunk chữ, 'citations' chứa nguồn trích dẫn chi tiết khi hoàn tất, hoặc 'error' nếu xảy ra sự cố.",
            content: {
              "text/event-stream": {
                schema: {
                  type: "string",
                  example: "event: message\ndata: {\"chunk\":\"Liskov\"}\n\nevent: citations\ndata: {\"citations\":[...]}\n\n"
                }
              }
            }
          },
          "401": {
            description: "Chưa đăng nhập.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "403": {
            description: "Vượt quá hạn ngạch tin nhắn trong cửa sổ 5 giờ hiện tại (cần nâng cấp gói dịch vụ).",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string", example: "LIMIT_EXCEEDED" },
                    message: { type: "string", example: "Bạn đã dùng hết giới hạn câu hỏi trong 5 giờ hiện tại. Hãy nâng cấp gói dịch vụ..." }
                  }
                }
              }
            }
          },
          "404": {
            description: "Không tìm thấy cuộc hội thoại.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/api/auth-admin/lecturer-request": {
      post: {
        summary: "Đăng ký cấp tài khoản giảng viên",
        description: "Dành cho giảng viên FPT. Đăng ký thông tin yêu cầu tạo tài khoản để giảng dạy và quản lý tài liệu môn học. Không yêu cầu đăng nhập.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", example: "Nguyễn Văn A" },
                  email: { type: "string", example: "anv@fpt.edu.vn" },
                  reason: { type: "string", example: "Tôi cần tải lên các slide bài giảng SWD392 và PRN231." }
                },
                required: ["name", "email", "reason"]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Gửi yêu cầu thành công, đang chờ Admin duyệt.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    request: { $ref: "#/components/schemas/LecturerRequest" }
                  }
                }
              }
            }
          },
          "400": {
            description: "Thiếu thông tin bắt buộc.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "409": {
            description: "Email đã tồn tại trên hệ thống hoặc đã gửi yêu cầu trước đó.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "500": {
            description: "Lỗi kết nối database.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/api/auth-admin/admin/lecturer-requests": {
      get: {
        summary: "Admin: Lấy danh sách yêu cầu đăng ký của giảng viên",
        description: "Yêu cầu quyền ADMIN. Lấy danh sách toàn bộ các yêu cầu đăng ký tài khoản giảng viên.",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "Danh sách các yêu cầu.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    requests: {
                      type: "array",
                      items: { $ref: "#/components/schemas/LecturerRequest" }
                    }
                  }
                }
              }
            }
          },
          "403": {
            description: "Quyền ADMIN bị từ chối.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/api/auth-admin/admin/lecturer-requests/{requestId}/approve": {
      post: {
        summary: "Admin: Phê duyệt cấp tài khoản giảng viên",
        description: "Yêu cầu quyền ADMIN. Duyệt yêu cầu, tạo tài khoản User với vai trò LECTURER, đồng thời tạo mật khẩu ngẫu nhiên tạm thời (được hash bảo mật PBKDF2 khớp Better Auth) hiển thị một lần cho Admin gửi lại cho giảng viên.",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "requestId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "ID yêu cầu cần phê duyệt."
          }
        ],
        responses: {
          "200": {
            description: "Phê duyệt thành công và cấp mật khẩu tạm thời.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Lecturer account created successfully" },
                    credentials: {
                      type: "object",
                      properties: {
                        email: { type: "string", example: "anv@fpt.edu.vn" },
                        temporaryPassword: { type: "string", example: "Lecturer@582194" }
                      }
                    }
                  }
                }
              }
            }
          },
          "400": {
            description: "Yêu cầu đã được duyệt hoặc từ chối trước đó.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "403": {
            description: "Quyền ADMIN bị từ chối.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "404": {
            description: "Không tìm thấy yêu cầu.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "500": {
            description: "Lỗi lưu giao dịch hoặc lỗi hash mật khẩu.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/api/auth-admin/admin/lecturer-requests/{requestId}/reject": {
      post: {
        summary: "Admin: Từ chối cấp tài khoản giảng viên",
        description: "Yêu cầu quyền ADMIN. Đánh dấu yêu cầu là REJECTED.",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "requestId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "ID yêu cầu cần từ chối."
          }
        ],
        responses: {
          "200": {
            description: "Từ chối yêu cầu thành công.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true }
                  }
                }
              }
            }
          },
          "403": {
            description: "Quyền ADMIN bị từ chối.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "500": {
            description: "Lỗi cập nhật database.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/api/subscriptions/me": {
      get: {
        summary: "Lấy thông tin gói dịch vụ cá nhân",
        description: "Kiểm tra gói dịch vụ hiện tại (BASIC, SILVER, GOLD), số câu hỏi đã gửi trong cửa sổ 5 giờ hiện tại, hạn ngạch tối đa và tự động reset sau mỗi 5 giờ.",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "Thông tin gói dịch vụ và hạn mức câu hỏi.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    subscription: { $ref: "#/components/schemas/Subscription" }
                  }
                }
              }
            }
          },
          "401": {
            description: "Chưa đăng nhập.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "500": {
            description: "Lỗi kết nối database.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/api/subscriptions/upgrade": {
      post: {
        summary: "Nâng cấp gói dịch vụ (Tạo link thanh toán)",
        description: "Tạo link thanh toán để nâng cấp lên SILVER (10.000 VNĐ, 50 tin nhắn/5 giờ) hoặc GOLD (20.000 VNĐ, 200 tin nhắn/5 giờ). Giao dịch được lưu ở trạng thái PENDING. Hỗ trợ SDK PayOS chính thức hoặc mock checkout nếu cấu hình chưa được kích hoạt.",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  tier: { type: "string", example: "SILVER", enum: ["SILVER", "GOLD"] },
                  returnUrl: { type: "string", example: "http://localhost:3000/success" },
                  cancelUrl: { type: "string", example: "http://localhost:3000/cancel" }
                },
                required: ["tier", "returnUrl", "cancelUrl"]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Tạo link thanh toán thành công.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    checkoutUrl: { type: "string", example: "https://pay.payos.vn/web/123456" },
                    transactionId: { type: "string", example: "trans-abc" },
                    orderCode: { type: "integer", example: 852194 }
                  }
                }
              }
            }
          },
          "400": {
            description: "Gói dịch vụ chọn nâng cấp không hợp lệ.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "401": {
            description: "Chưa đăng nhập.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "500": {
            description: "Lỗi kết nối PayOS hoặc lỗi khởi tạo transaction trong database.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/api/subscriptions/webhook": {
      post: {
        summary: "Webhook nhận xác nhận thanh toán từ PayOS",
        description: "Bắn tự động từ cổng PayOS để báo cáo kết quả thanh toán. Hệ thống xác thực chữ ký bảo mật signature từ PayOS, nếu thành công sẽ tự động cập nhật Transaction sang PAID và nâng cấp gói dịch vụ (SILVER/GOLD) trong 30 ngày cho User tương ứng.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  data: {
                    type: "object",
                    properties: {
                      orderCode: { type: "integer", example: 852194 },
                      amount: { type: "integer", example: 10000 },
                      code: { type: "string", example: "00" }
                    }
                  },
                  signature: { type: "string", example: "abc_secure_signature" }
                }
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Luôn trả về success true để phản hồi cho cổng thanh toán.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};
