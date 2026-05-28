// web/api/subscriptions.ts
import { apiClient } from "./client";
import { Subscription } from "../types";

export interface SubscriptionResponse {
    subscription: Subscription;
}

export interface UpgradeResponse {
    success: boolean;
    demoMode?: boolean;
    checkoutUrl?: string;
    transactionId: string;
    referenceCode: string;
    auditContent: string;
    message?: string;
    subscription?: Subscription;
}

export const subscriptionsApi = {
    // 1. Lấy thông tin gói cước và hạn mức hiện tại của người dùng
    getMe: async (): Promise<SubscriptionResponse> => {
        const response = await apiClient.get<SubscriptionResponse>("/api/subscriptions/me");
        return response.data;
    },

    // 2. Yêu cầu nâng cấp gói cước qua SePay (tạo transaction thanh toán VietQR)
    upgrade: async (tier: 'SILVER' | 'GOLD'): Promise<UpgradeResponse> => {
        const response = await apiClient.post<UpgradeResponse>("/api/subscriptions/upgrade", { tier });
        return response.data;
    },
};
