// web/types/index.ts

export type Role = 'student' | 'lecturer' | 'admin';

export interface User {
    id: string;
    name: string;
    email: string;
    role: Role;
}

export interface Course {
    id: string;
    code: string;
    name: string;
    createdAt?: string;
    updatedAt?: string;
}

export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface Document {
    id: string;
    name: string;
    fileUrl: string;
    fileType: string;
    status: DocumentStatus;
    courseId: string;
    error?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ChatSession {
    id: string;
    title: string;
    userId?: string;
    courseId?: string | null;
    createdAt: string;
    updatedAt?: string;
}

export interface Citation {
    id?: string;
    documentId?: string;
    documentName: string;
    page: number;
    text?: string;
    isDeleted?: boolean;
}

export interface ChatMessage {
    id: string;
    sessionId?: string;
    sender: 'USER' | 'ASSISTANT';
    content: string;
    citations?: Citation[];
    createdAt: string;
}

export interface Subscription {
    id?: string;
    userId?: string;
    tier: 'BASIC' | 'SILVER' | 'GOLD';
    messageCount: number;
    maxMessages: number;
    endDate: string;
    createdAt?: string;
    updatedAt?: string;
}