import { prisma } from "../auth/services/db.service.js";
import type { SePayTier } from "./sepay.service.js";

export function resolveSubscriptionTier(amount: number): SePayTier {
  return amount === 10000 ? "SILVER" : "GOLD";
}

export function resolveSubscriptionLimits(tier: SePayTier) {
  return tier === "SILVER"
    ? { maxMessages: 50, amount: 10000 }
    : { maxMessages: 200, amount: 20000 };
}

export async function getOrInitializeSubscription(userId: string) {
  let sub = await prisma.subscription.findFirst({ where: { userId } });
  const now = new Date();

  if (!sub) {
    return prisma.subscription.create({
      data: {
        userId,
        tier: "BASIC",
        startDate: now,
        endDate: new Date(now.getFullYear() + 100, now.getMonth(), now.getDate()),
        maxMessages: 10,
        messageCount: 0,
        lastReset: now,
      },
    });
  }

  if (sub.tier !== "BASIC" && now > sub.endDate) {
    return prisma.subscription.update({
      where: { id: sub.id },
      data: {
        tier: "BASIC",
        startDate: now,
        endDate: new Date(now.getFullYear() + 100, now.getMonth(), now.getDate()),
        maxMessages: 10,
        messageCount: 0,
        lastReset: now,
      },
    });
  }

  const lastResetDate = new Date(sub.lastReset);
  if (
    now.getDate() !== lastResetDate.getDate() ||
    now.getMonth() !== lastResetDate.getMonth() ||
    now.getFullYear() !== lastResetDate.getFullYear()
  ) {
    sub = await prisma.subscription.update({
      where: { id: sub.id },
      data: { messageCount: 0, lastReset: now },
    });
  }

  return sub;
}

export async function applyPaidTransaction(transactionId: string) {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction || transaction.status !== "PENDING") {
    return false;
  }

  const tier = resolveSubscriptionTier(transaction.amount);
  const { maxMessages } = resolveSubscriptionLimits(tier);
  const now = new Date();
  const endDate = new Date();
  endDate.setDate(now.getDate() + 30);

  await prisma.$transaction([
    prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: "PAID" },
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
        lastReset: now,
      },
      update: {
        tier,
        startDate: now,
        endDate,
        maxMessages,
        messageCount: 0,
        lastReset: now,
      },
    }),
  ]);

  console.log(`[SePay Webhook] Successfully upgraded User ${transaction.userId} to ${tier}`);
  return true;
}
