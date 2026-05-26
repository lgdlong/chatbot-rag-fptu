import { Hono } from "hono";
import { prisma } from "../auth/services/db.service.js";
import { auth } from "../auth/auth.js";
import { ENV } from "../../config/env.js";
import PayOS from "@payos/node";

export const subscriptionRouter = new Hono();

// Khởi tạo PayOS client với cơ chế tránh lỗi khi credentials là mock
let payOS: any = null;
try {
  // Chỉ thực sự khởi tạo nếu không phải là mock
  if (ENV.PAYOS_CLIENT_ID && ENV.PAYOS_CLIENT_ID !== "mock_client_id") {
    // @ts-ignore
    payOS = new PayOS.default(
      ENV.PAYOS_CLIENT_ID,
      ENV.PAYOS_API_KEY,
      ENV.PAYOS_CHECKSUM_KEY
    );
  }
} catch (e) {
  console.warn("[SubscriptionController] Failed to initialize PayOS SDK (using mock instead):", e);
}

// Helper tự động kiểm tra, reset và lấy subscription của User
export async function getOrInitializeSubscription(userId: string) {
  let sub = await prisma.subscription.findFirst({
    where: { userId }
  });

  const now = new Date();

  // 1. Tạo mới gói BASIC mặc định nếu chưa có
  if (!sub) {
    sub = await prisma.subscription.create({
      data: {
        userId,
        tier: "BASIC",
        startDate: now,
        endDate: new Date(now.getFullYear() + 100, now.getMonth(), now.getDate()), // 100 năm
        maxMessages: 10,
        messageCount: 0,
        lastReset: now
      }
    });
    return sub;
  }

  // 2. Hạ cấp về gói BASIC nếu đã hết hạn đăng ký PREMIUM
  if (sub.tier !== "BASIC" && now > sub.endDate) {
    sub = await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        tier: "BASIC",
        startDate: now,
        endDate: new Date(now.getFullYear() + 100, now.getMonth(), now.getDate()),
        maxMessages: 10,
        messageCount: 0,
        lastReset: now
      }
    });
    return sub;
  }

  // 3. Tự động reset messageCount sang ngày mới (Không cần cron job)
  const lastResetDate = new Date(sub.lastReset);
  if (
    now.getDate() !== lastResetDate.getDate() ||
    now.getMonth() !== lastResetDate.getMonth() ||
    now.getFullYear() !== lastResetDate.getFullYear()
  ) {
    sub = await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        messageCount: 0,
        lastReset: now
      }
    });
  }

  return sub;
}

// 1. Lấy thông tin Subscription cá nhân
subscriptionRouter.get("/me", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session || !session.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const sub = await getOrInitializeSubscription(session.user.id);
    return c.json({ subscription: sub });
  } catch (err: any) {
    return c.json({ error: err.message || "Failed to fetch subscription" }, 500);
  }
});

// 2. Nâng cấp Gói dịch vụ (Tạo link thanh toán PayOS)
subscriptionRouter.post("/upgrade", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session || !session.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { tier, returnUrl, cancelUrl } = await c.req.json();

  if (tier !== "SILVER" && tier !== "GOLD") {
    return c.json({ error: "Invalid tier. Choose SILVER or GOLD" }, 400);
  }

  const amount = tier === "SILVER" ? 10000 : 20000;
  const description = `Upgrade RAG ${tier}`;

  try {
    // 1. Tạo Transaction PENDING trong database
    const orderCode = Number(String(Date.now()).substring(4)); // Tạo mã orderCode dạng number
    const transaction = await prisma.transaction.create({
      data: {
        userId: session.user.id,
        amount,
        status: "PENDING",
        payosOrderId: String(orderCode)
      }
    });

    // 2. Gọi PayOS sinh link thanh toán
    const paymentLinkData = {
      orderCode,
      amount,
      description,
      returnUrl,
      cancelUrl
    };

    let checkoutUrl = `http://localhost:3000/mock-payment?orderCode=${orderCode}&amount=${amount}&tier=${tier}`;
    
    // Nếu có PayOS cấu hình thật thì gọi thật
    if (payOS) {
      try {
        const paymentLink = await payOS.createPaymentLink(paymentLinkData);
        checkoutUrl = paymentLink.checkoutUrl;
      } catch (payosError) {
        console.error("[PayOS SDK] Fail to create payment link, fallback to mock url:", payosError);
      }
    }

    return c.json({
      success: true,
      checkoutUrl,
      transactionId: transaction.id,
      orderCode
    });
  } catch (err: any) {
    console.error("[PayOS] Failed to create payment link:", err);
    return c.json({ error: err.message || "Failed to initiate payment" }, 500);
  }
});

// 3. Webhook nhận kết quả thanh toán từ PayOS
subscriptionRouter.post("/webhook", async (c) => {
  const body = await c.req.json();

  try {
    let webhookData = body.data;
    
    // Chỉ verify signature khi dùng PayOS SDK thật
    if (payOS && body.signature) {
      try {
        webhookData = payOS.verifyPaymentWebhookData(body);
      } catch (verifyError) {
        console.error("[PayOS Webhook] Signature verification failed:", verifyError);
        return c.json({ error: "Invalid signature" }, 400);
      }
    }

    if (webhookData && (webhookData.code === "00" || body.success === true)) { // Giao dịch thành công
      const orderCodeStr = String(webhookData.orderCode);

      const transaction = await prisma.transaction.findFirst({
        where: { payosOrderId: orderCodeStr, status: "PENDING" }
      });

      if (transaction) {
        const tier = transaction.amount === 10000 ? "SILVER" : "GOLD";
        const maxMessages = tier === "SILVER" ? 50 : 200;

        const now = new Date();
        const endDate = new Date();
        endDate.setDate(now.getDate() + 30); // 30 ngày sử dụng

        // Cập nhật song song Transaction và Subscription của User
        await prisma.$transaction([
          prisma.transaction.update({
            where: { id: transaction.id },
            data: { status: "PAID" }
          }),
          prisma.subscription.upsert({
            where: { userId: transaction.userId },
            create: {
              userId: transaction.userId,
              tier,
              startDate: now,
              endDate,
              maxMessages,
              messageCount: 0,
              lastReset: now
            },
            update: {
              tier,
              startDate: now,
              endDate,
              maxMessages,
              messageCount: 0,
              lastReset: now
            }
          })
        ]);

        console.log(`[PayOS Webhook] Successfully upgraded User ${transaction.userId} to ${tier}`);
      }
    }

    return c.json({ success: true });
  } catch (err: any) {
    console.error("[PayOS Webhook Error]:", err);
    // Vẫn trả về 200 để tránh PayOS bắn lại webhook liên tục gây tốn tài nguyên
    return c.json({ error: err.message || "Webhook error processed" }, 200);
  }
});
