import { Hono } from "hono";
import { prisma } from "../auth/services/db.service.js";
import { auth } from "../auth/auth.js";
import { ENV } from "../../config/env.js";
import {
  buildSePayQrUrl,
  buildSePayReference,
  isSePayIncomingTransfer,
  isSePayWebhookAuthorized,
  normalizeSePayText,
  type SePayWebhookPayload,
} from "./sepay.service.js";
import { renderSePayPaymentPage } from "./sepay-payment-page.js";
import {
  applyPaidTransaction,
  getOrInitializeSubscription,
  resolveSubscriptionLimits,
  resolveSubscriptionTier,
} from "./subscription.service.js";

export const subscriptionRouter = new Hono();

type UpgradeRequestBody = {
  tier?: string;
  returnUrl?: string;
  cancelUrl?: string;
};

subscriptionRouter.get("/me", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const sub = await getOrInitializeSubscription(session.user.id);
    return c.json({ subscription: sub });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch subscription";
    return c.json({ error: message }, 500);
  }
});

subscriptionRouter.get("/checkout/:transactionId", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const transactionId = c.req.param("transactionId");
  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, userId: session.user.id },
  });

  if (!transaction) {
    return c.json({ error: "Transaction not found" }, 404);
  }

  const tier = resolveSubscriptionTier(transaction.amount);
  const referenceCode =
    transaction.sepayReference || buildSePayReference(tier, transaction.id);
  const qrUrl = buildSePayQrUrl({
    tier,
    amount: transaction.amount,
    referenceCode,
    description: `Nạp ${tier}`,
  });
  const bankLabel = `${ENV.SEPAY_BANK_CODE} - ${ENV.SEPAY_ACCOUNT_NO}`;
  const paidLabel =
    transaction.status === "PAID" ? "Đã thanh toán" : "Đang chờ chuyển khoản";

  return c.html(
    renderSePayPaymentPage({
      tier,
      qrUrl,
      amount: transaction.amount,
      bankLabel,
      referenceCode,
      transactionId: transaction.id,
      paidLabel,
    }),
  );
});

subscriptionRouter.post("/upgrade", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (!ENV.SEPAY_API_KEY || !ENV.SEPAY_BANK_CODE || !ENV.SEPAY_ACCOUNT_NO) {
    return c.json({ error: "SePay is not configured" }, 500);
  }

  const body = (await c.req.json()) as UpgradeRequestBody;
  if (body.tier !== "SILVER" && body.tier !== "GOLD") {
    return c.json({ error: "Invalid tier. Choose SILVER or GOLD" }, 400);
  }

  const { amount } = resolveSubscriptionLimits(body.tier);

  try {
    const transaction = await prisma.transaction.create({
      data: {
        userId: session.user.id,
        amount,
        status: "PENDING",
      },
    });

    const referenceCode = buildSePayReference(body.tier, transaction.id);
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { sepayReference: referenceCode },
    });

    const checkoutUrl = new URL(
      `/api/subscriptions/checkout/${transaction.id}`,
      ENV.INTERNAL_API_URL,
    ).toString();

    return c.json({
      success: true,
      checkoutUrl,
      transactionId: transaction.id,
      orderCode: referenceCode,
      referenceCode,
      amount,
      bankCode: ENV.SEPAY_BANK_CODE,
      accountNo: ENV.SEPAY_ACCOUNT_NO,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to initiate payment";
    return c.json({ error: message }, 500);
  }
});

subscriptionRouter.post("/webhook", async (c) => {
  const authorization = c.req.header("authorization") ?? null;
  if (!isSePayWebhookAuthorized(authorization)) {
    return c.json({ error: "Invalid webhook authorization" }, 401);
  }

  const body = (await c.req.json()) as SePayWebhookPayload;
  if (!isSePayIncomingTransfer(body)) {
    return c.json({ success: true });
  }

  const normalizedText = normalizeSePayText(body);
  const pendingTransactions = await prisma.transaction.findMany({
    where: {
      status: "PENDING",
      amount: body.transferAmount,
    },
  });

  const matchedTransaction = pendingTransactions.find((transaction) => {
    const referenceCode = transaction.sepayReference || "";
    return normalizedText.includes(referenceCode.toUpperCase());
  });

  if (matchedTransaction) {
    await applyPaidTransaction(matchedTransaction.id);
  }

  return c.json({ success: true });
});
