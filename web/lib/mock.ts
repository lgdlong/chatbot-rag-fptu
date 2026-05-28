import { ChatSession, ChatMessage, Subscription } from '@/types';

export const MOCK_SESSIONS: ChatSession[] = [
    { id: 's1', title: 'Hỏi về Use Case Diagram', createdAt: '2026-05-27T10:00:00Z' },
    { id: 's2', title: 'Kiến trúc Monolith vs Microservices', createdAt: '2026-05-26T14:30:00Z' },
];

export const MOCK_SUBSCRIPTION: Subscription = {
    tier: 'SILVER',
    messageCount: 12,
    maxMessages: 50,
    endDate: '2026-06-27T00:00:00Z',
    lastReset: '2026-05-28T08:00:00Z',
};
