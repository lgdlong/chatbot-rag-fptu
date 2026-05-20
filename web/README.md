# GIAO DIỆN NGƯỜI DÙNG CHATBOT RAG (NEXT.JS 15 + TAILWIND CSS)

Thư mục này chứa mã nguồn **Frontend Web Application** của dự án FPTU Chatbot RAG. Ứng dụng được thiết kế và tối ưu hóa dựa trên **Next.js 15+ (App Router)** và **Tailwind CSS v4**, mang lại trải nghiệm người dùng tối ưu, nhanh chóng, mượt mà và trực quan trên mọi loại thiết bị.

---

## 🎨 Chuẩn Thiết Kế Giao Diện Sang Trọng (Design Aesthetics)

Ứng dụng tuân thủ nghiêm ngặt các quy tắc thiết kế giao diện cao cấp:
* **Hệ màu sắc Hài hòa (Curated Color Palettes):** Sử dụng các gam màu HSL chọn lọc kỹ lưỡng, tránh các màu cơ bản thô cứng (đỏ chói, xanh thuần). Tích hợp sẵn chế độ nền tối (Dark Mode) thanh lịch với độ tương phản cao, dịu mắt.
* **Hiệu ứng Glassmorphism:** Áp dụng hiệu ứng làm mờ nền tinh tế (`backdrop-blur`) cho các thanh điều hướng (Navbar) và thẻ điều khiển (Cards), mang lại cảm giác có chiều sâu không gian.
* **Micro-animations & Hovers:** Tích hợp các chuyển động nhỏ (Transitions) mượt mà cho mọi nút nhấn, thẻ thông tin và ô nhập liệu khi di chuột qua, tạo cảm giác giao diện "sống động" và phản hồi tích thời.
* **Bố cục Bento Grid & Responsive:** Bố trí thông tin khoa học theo phong cách Bento Grid hiện đại. Tối ưu hóa hiển thị linh hoạt (Mobile-first, Tablet, Desktop).
* **Font chữ Hiện đại:** Sử dụng bộ font chữ không chân tinh tế (như *Geist* hoặc *Inter* từ Google Fonts) thay thế cho font mặc định của trình duyệt để đạt hiệu ứng thẩm mỹ tối đa.

---

## 🏗️ Cấu Trúc Thư Mục Frontend

```
web/
├── app/                       # Thư mục chính App Router (Next.js 15)
│   ├── layout.tsx             # Layout dùng chung toàn ứng dụng (Themes, Providers)
│   ├── page.tsx               # Trang giới thiệu / Landing Page chính
│   ├── chat/                  # Module Hỏi đáp RAG thông minh
│   │   ├── page.tsx           # Giao diện khung hội thoại và lịch sử chat
│   │   └── chat-stream.ts     # Trình xử lý SSE streaming từ backend Hono
│   ├── admin/                 # Giao diện quản trị cho Giảng viên / Admin
│   │   ├── courses/           # Quản lý khóa học, bài giảng
│   │   └── documents/         # Upload tài liệu, cấu hình chunking
│   └── auth/                  # Các route xử lý đăng nhập, đăng ký, SSO
├── components/                # Thư viện UI components dùng chung
│   ├── ui/                    # Nút, Form input, Dialogs, Cards (shadcn/ui style)
│   └── chat/                  # Message Bubble, Citation Cards, Video Preview
├── public/                    # Tài nguyên tĩnh (Ảnh, Sơ đồ, Icons)
├── tailwind.config.ts         # Cấu hình Tailwind CSS tokens
├── package.json               # Dependencies và scripts
└── tsconfig.json              # Cấu hình TypeScript
```

---

## ⚡ Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Cài đặt thư viện
Thực hiện cài đặt các dependencies tại thư mục gốc:
```bash
npm --prefix web install
```

### 2. Chạy ứng dụng ở chế độ Development
Next.js sẽ tự động dò tìm cổng trống và khởi chạy (thông thường là cổng **`3001`** do cổng `3000` đã được cấp cho Backend):
```bash
make dev-web

# Hoặc chạy lệnh thủ công trong thư mục web:
# npm run dev
```

### 3. Kiểm tra lỗi cú pháp & Kiểu dữ liệu (TypeScript/ESLint)
Trước khi commit mã nguồn, luôn luôn kiểm tra và sửa đổi các lỗi cảnh báo:
```bash
npm --prefix web run lint
```

### 4. Biên dịch sản phẩm (Production Build)
Thực hiện build để tối ưu hóa bundle size và kiểm tra tính tương thích biên dịch:
```bash
make build-web

# Hoặc chạy lệnh thủ công trong thư mục web:
# npm run build
```

---

## 📡 Tích Hợp Luồng Streaming Nhận Câu Trả Lời (SSE Client)

Frontend kết nối trực tiếp với backend Hono.js bằng phương thức **Server-Sent Events (SSE)** thông qua API `POST /api/v1/chat/send`. 

* **Cơ chế hoạt động:**
  1. Trình duyệt gửi tin nhắn của sinh viên dưới dạng request JSON thông thường.
  2. Server phản hồi bằng header `Content-Type: text/event-stream`.
  3. Client sử dụng `ReadableStream` để đón nhận từng mảnh ký tự (Tokens) gửi về và cập nhật liên tục vào state hiển thị tin nhắn.
  4. Gói dữ liệu đầu tiên (hoặc cuối cùng) chứa mảng `citations`. Client lưu trữ mảng này để hiển thị các thẻ nguồn bên dưới bong bóng chat.
* **Xử lý Citation Đa Phương Thức:**
  * **Tài liệu dạng slide/PDF:** Khi nhấn vào thẻ citation, hệ thống mở một popup PDF Reader và cuộn tới chính xác số trang được chỉ định.
  * **Tài liệu dạng Video:** Nhấn vào citation sẽ mở trình phát video và thực hiện lệnh `videoElement.currentTime = timestampSeconds` để tua đến đúng phân đoạn bài học tương ứng.
