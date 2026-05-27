# API Đặc Tả: Phân Hệ Hệ Thống & Giám Sát (System & Health Check)

Phân hệ này cung cấp các endpoint giám sát tình trạng hoạt động thực tế của API server, cơ sở dữ liệu và các tài nguyên phần cứng, phục vụ trực tiếp cho các hệ thống giám sát tự động (Monitoring) và DevOps.

---

## 🔐 Cơ Chế Xác Thực (Authentication)
- **Phương thức xác thực:** Không yêu cầu (Public Endpoint).
- **Yêu cầu phân quyền:** Mọi đối tượng (Sinh viên, Giảng viên, Admin, Ứng dụng ngoài).

---

## 📂 Các Endpoint Đặc Tả

### 1. Chi tiết sức khỏe hệ thống (Health Check)
`GET /api/health`

#### Mô tả
Kiểm tra tình trạng hoạt động (Status) và đo lường độ trễ (latencyMs) kết nối của database PostgreSQL thông qua Prisma client. Đồng thời thống kê thời gian hoạt động liên tục (Uptime) của Node.js process, thống kê chi tiết dung lượng sử dụng bộ nhớ RAM (RSS, Heap, External) và môi trường runtime hiện tại (Node version, Platform).

#### Yêu cầu
- **Authentication:** ❌ Không yêu cầu.
- **Content-Type:** `application/json`

#### Path Parameters
*Không có.*

#### Query Parameters
*Không có.*

#### Request Schema
*Không có (Phương thức GET không nhận body).*

#### Response Schema

**Thành công - 200 OK:**
*Trả về khi API Server và Database PostgreSQL kết nối bình thường, hoạt động ổn định.*

```json
{
  "status": "UP",
  "timestamp": "2026-05-27T16:38:00.000Z",
  "latencyMs": 12,
  "services": {
    "database": {
      "status": "UP",
      "latencyMs": 5
    }
  },
  "system": {
    "uptimeSeconds": 120.45,
    "memoryUsage": {
      "rss": "84.5 MB",
      "heapTotal": "45.2 MB",
      "heapUsed": "32.1 MB",
      "external": "5.6 MB"
    },
    "nodeVersion": "v20.11.17",
    "platform": "win32"
  }
}
```

**Mô tả chi tiết các trường trả về (Success Response):**

| Trường | Loại | Mô tả | Ví dụ |
| :--- | :--- | :--- | :--- |
| `status` | string | Trạng thái chung của hệ thống (`"UP"` hoặc `"DOWN"`). | `"UP"` |
| `timestamp` | string | Thời gian kiểm tra định dạng ISO 8601 UTC. | `"2026-05-27T16:38:00.000Z"` |
| `latencyMs` | integer | Độ trễ xử lý toàn bộ request (mili-giây). | `12` |
| `services.database.status` | string | Trạng thái database PostgreSQL (`"UP"` hoặc `"DOWN"`). | `"UP"` |
| `services.database.latencyMs` | integer | Thời gian truy vấn SQL kiểm tra kết nối (mili-giây). | `5` |
| `system.uptimeSeconds` | number | Thời gian server đã chạy liên tục (giây). | `120.45` |
| `system.memoryUsage.rss` | string | Bộ nhớ thực tế hệ điều hành cấp cho Node process. | `"84.5 MB"` |
| `system.memoryUsage.heapTotal` | string | Tổng dung lượng bộ nhớ Heap V8 đã cấp phát. | `"45.2 MB"` |
| `system.memoryUsage.heapUsed` | string | Dung lượng bộ nhớ Heap V8 thực tế đang sử dụng. | `"32.1 MB"` |
| `system.nodeVersion` | string | Phiên bản runtime Node.js hiện tại. | `"v20.11.17"` |
| `system.platform` | string | Hệ điều hành chạy API Server. | `"win32"` |

---

**Thất bại - 503 Service Unavailable:**
*Trả về khi Database hoặc các dịch vụ lõi kết nối bị gián đoạn, ngắt kết nối đột ngột.*

```json
{
  "status": "DOWN",
  "timestamp": "2026-05-27T16:39:12.000Z",
  "latencyMs": 4,
  "services": {
    "database": {
      "status": "DOWN",
      "error": "Can't reach database server at localhost:5432"
    }
  },
  "system": {
    "uptimeSeconds": 192.12,
    "memoryUsage": {
      "rss": "86.1 MB",
      "heapTotal": "45.2 MB",
      "heapUsed": "33.5 MB"
    },
    "nodeVersion": "v20.11.17",
    "platform": "win32"
  }
}
```

---

#### Ví dụ Thực Tế (Example Test)

**Request cURL:**
```bash
curl -X GET http://localhost:8000/api/health \
  -H "Accept: application/json"
```

**Expected Response (200 OK):**
```json
{
  "status": "UP",
  "timestamp": "2026-05-27T10:17:15.123Z",
  "latencyMs": 10,
  "services": {
    "database": {
      "status": "UP",
      "latencyMs": 3
    }
  },
  "system": {
    "uptimeSeconds": 2045.12,
    "memoryUsage": {
      "rss": "88.4 MB",
      "heapTotal": "46.1 MB",
      "heapUsed": "34.5 MB",
      "external": "5.8 MB"
    },
    "nodeVersion": "v20.11.17",
    "platform": "win32"
  }
}
```
