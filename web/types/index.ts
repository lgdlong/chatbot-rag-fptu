export type Role = 'student' | 'lecturer' | 'admin';

export interface User {
    id: string;
    name: string;
    email: string;
    role: Role;
}

export interface ChatSession {
    id: string;
    title: string;
    createdAt: string;
}

export interface Citation {
    id: string;
    sourceFile: string;
    page: number;
    text: string;
}

export interface ChatMessage {
    id: string;
    sender: 'USER' | 'ASSISTANT';
    content: string;
    citations?: Citation[];
    createdAt: string;
}

export interface Subscription {
    tier: 'BASIC' | 'SILVER' | 'GOLD';
    messageCount: number;
    maxMessages: number;
    endDate: string;
}