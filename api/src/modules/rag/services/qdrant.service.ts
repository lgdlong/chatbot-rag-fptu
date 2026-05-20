import { QdrantClient } from "@qdrant/js-client-rest";
import { ENV } from "../../../config/env.js";

export class QdrantService {
  private static client: QdrantClient;

  public static getClient(): QdrantClient {
    if (!this.client) {
      this.client = new QdrantClient({
        url: ENV.QDRANT_URL,
        apiKey: ENV.QDRANT_API_KEY || undefined,
      });
    }
    return this.client;
  }

  /**
   * Tạo collection lưu trữ tài liệu nếu chưa tồn tại.
   * Sử dụng Vector kích thước 3072 chiều tương thích với Gemini Embedding 2.
   */
  public static async ensureCollection(collectionName: string) {
    const qdrant = this.getClient();
    try {
      const collections = await qdrant.getCollections();
      const exists = collections.collections.some(
        (c) => c.name === collectionName,
      );

      if (!exists) {
        await qdrant.createCollection(collectionName, {
          vectors: {
            size: 3072, // Chiều của Gemini Embedding 2
            distance: "Cosine",
          },
        });
        console.log(
          `[Qdrant] Collection '${collectionName}' created successfully.`,
        );
      }
    } catch (error) {
      console.error(`[Qdrant] Error ensuring collection:`, error);
      throw error;
    }
  }

  /**
   * Chỉ mục danh sách các chunks tài liệu vào Qdrant
   */
  public static async upsertChunks(
    collectionName: string,
    points: Array<{
      id: string;
      vector: number[];
      payload: {
        organizationId: string;
        courseId: string;
        documentId: string;
        documentName: string;
        text: string;
        page?: number;
        timestampStart?: number;
        timestampEnd?: number;
      };
    }>,
  ) {
    const qdrant = this.getClient();
    await this.ensureCollection(collectionName);

    await qdrant.upsert(collectionName, {
      wait: true,
      points: points.map((p) => ({
        id: p.id,
        vector: p.vector,
        payload: p.payload,
      })),
    });
  }

  /**
   * Tìm kiếm tương đồng ngữ nghĩa kết hợp lọc bảo mật Multi-tenant
   */
  public static async searchSimilarity(
    collectionName: string,
    queryVector: number[],
    organizationId: string,
    courseId: string,
    limit = 5,
  ) {
    const qdrant = this.getClient();
    await this.ensureCollection(collectionName);

    return qdrant.search(collectionName, {
      vector: queryVector,
      limit,
      filter: {
        must: [
          {
            key: "organizationId",
            match: { value: organizationId },
          },
          {
            key: "courseId",
            match: { value: courseId },
          },
        ],
      },
    });
  }

  /**
   * Xoá toàn bộ vector thuộc một document theo multi-tenant filter.
   */
  public static async deleteByDocumentId(
    collectionName: string,
    documentId: string,
    organizationId: string,
    courseId: string,
  ) {
    const qdrant = this.getClient();

    await qdrant.delete(collectionName, {
      wait: true,
      filter: {
        must: [
          {
            key: "organizationId",
            match: { value: organizationId },
          },
          {
            key: "courseId",
            match: { value: courseId },
          },
          {
            key: "documentId",
            match: { value: documentId },
          },
        ],
      },
    });
  }
}
