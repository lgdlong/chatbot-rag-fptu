import { ENV } from "../../config/env.js";

export type SePayTier = "SILVER" | "GOLD";

export interface SePayWebhookPayload {
  id?: number;
  gateway?: string;
  transactionDate?: string;
  accountNumber?: string;
  code?: string | null;
  content?: string;
  transferType?: "in" | "out";
  transferAmount?: number;
  accumulated?: number;
  subAccount?: string | null;
  referenceCode?: string;
}

export interface SePayCheckoutDetails {
  tier: SePayTier;
  amount: number;
  referenceCode: string;
  description: string;
}

const SEPAY_QR_BASE_URL = "https://qr.sepay.vn/img";

export function buildSePayReference(tier: SePayTier, transactionId: string): string {
  return `FPTU-${tier}-${transactionId.replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}

export function buildSePayQrUrl(details: SePayCheckoutDetails): string {
  const url = new URL(SEPAY_QR_BASE_URL);
  url.searchParams.set("acc", ENV.SEPAY_ACCOUNT_NO);
  url.searchParams.set("bank", ENV.SEPAY_BANK_CODE);
  url.searchParams.set("amount", String(details.amount));
  url.searchParams.set(
    "des",
    `${details.description} ${details.referenceCode}`.trim(),
  );
  url.searchParams.set("template", "qronly");
  return url.toString();
}

export function normalizeSePayText(payload: SePayWebhookPayload): string {
  return [payload.content, payload.referenceCode, payload.code]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ")
    .toUpperCase();
}

export function isSePayWebhookAuthorized(authorizationHeader: string | null): boolean {
  if (!ENV.SEPAY_API_KEY) {
    return true;
  }

  const expectedAuth = `Apikey ${ENV.SEPAY_API_KEY}`;
  return authorizationHeader === expectedAuth || authorizationHeader === `Bearer ${ENV.SEPAY_API_KEY}`;
}

export function isSePayIncomingTransfer(payload: SePayWebhookPayload): boolean {
  return payload.transferType === "in" && typeof payload.transferAmount === "number" && payload.transferAmount > 0;
}
