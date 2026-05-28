'use client';

import { AppShell, Box, NavLink, Text, Progress, Group, Badge, Button, Loader } from '@mantine/core';
import { IconMessage, IconPlus, IconArrowRight } from '@tabler/icons-react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from "next/link";

function formatSessionScope(session: {
    scopeMode?: 'ALL_COURSES' | 'SELECTED_COURSES' | 'SELECTED_DOCUMENTS';
    scopedCourses?: Array<{ code: string; name: string }>;
    scopedDocuments?: Array<{ name: string }>;
    scopeLabel?: string;
}) {
    if (session.scopeLabel) {
        return session.scopeLabel;
    }

    if (session.scopeMode === 'ALL_COURSES' || !session.scopeMode) {
        return 'Tất cả môn';
    }

    if (session.scopeMode === 'SELECTED_DOCUMENTS') {
        if (!session.scopedDocuments || session.scopedDocuments.length === 0) {
            return '0 tài liệu đã chọn';
        }

        if (session.scopedDocuments.length === 1) {
            return session.scopedDocuments[0].name;
        }

        return `${session.scopedDocuments.length} tài liệu đã chọn`;
    }

    if (!session.scopedCourses || session.scopedCourses.length === 0) {
        return '0 môn đã chọn';
    }

    if (session.scopedCourses.length === 1) {
        const course = session.scopedCourses[0];
        return `${course.code} - ${course.name}`;
    }

    return `${session.scopedCourses.length} môn đã chọn`;
}

export function ChatSidebar() {
    const searchParams = useSearchParams();
    const currentSessionId = searchParams.get('sessionId');

    // 1. Tải danh sách phòng chat thật
    const { data: sessionsData, isLoading: isSessionsLoading } = useQuery({
        queryKey: ["chat-sessions"],
        queryFn: () => api.getChatSessions(),
    });
    const sessions = sessionsData?.sessions || [];

    // 2. Tải thông tin cước phí & hạn mức thật
    const { data: subData, isLoading: isSubLoading } = useQuery({
        queryKey: ["subscription"],
        queryFn: () => api.getSubscription(),
    });
    const subscription = subData?.subscription || {
        tier: 'BASIC',
        messageCount: 0,
        maxMessages: 10,
        lastReset: new Date().toISOString(),
        endDate: new Date().toISOString(),
    };

    const remainingMessages = Math.max(subscription.maxMessages - subscription.messageCount, 0);
    const remainingPercent = subscription.maxMessages > 0
        ? (remainingMessages / subscription.maxMessages) * 100
        : 0;
    const remainingColor = remainingPercent <= 20 ? 'red' : 'brandBlue';
    const quotaResetLabel = subscription.lastReset
        ? `Đặt lại từ lần reset gần nhất: ${new Date(subscription.lastReset).toLocaleString('vi-VN')}`
        : "Chưa có thông tin lần reset gần nhất.";

    return (
        <AppShell.Navbar p="md" display="flex" style={{ flexDirection: 'column' }}>
            <NavLink
                component={Link}
                href="/student/chat"
                label="Cuộc hội thoại mới"
                description="Tạo session với phạm vi tài liệu rõ ràng"
                leftSection={<IconPlus size="1rem" stroke={1.5} />}
                variant="filled"
                color="brandBlue"
                active={!currentSessionId}
                mb="md"
            />

            <Text size="xs" fw={700} c="dimmed" mb="sm">LỊCH SỬ CHAT</Text>

            <Box style={{ flex: 1, overflowY: 'auto' }}>
                {isSessionsLoading ? (
                    <Group justify="center" py="xl">
                        <Loader size="sm" color="zinc.5" />
                    </Group>
                ) : sessions.length === 0 ? (
                    <Text size="xs" c="dimmed" ta="center" py="md">Chưa có lịch sử trò chuyện</Text>
                ) : (
                    sessions.map((session) => (
                        <NavLink
                            component={Link}
                            key={session.id}
                            href={`/student/chat?sessionId=${session.id}`}
                            label={session.title || "Cuộc hội thoại"}
                            description={formatSessionScope(session)}
                            leftSection={<IconMessage size="1rem" stroke={1.5} />}
                            active={currentSessionId === session.id}
                        />
                    ))
                )}
            </Box>

            <Box mt="auto" pt="md" style={{ borderTop: '1px solid #3f3f46' }}>
                {isSubLoading ? (
                    <Group justify="center" py="xs">
                        <Loader size="xs" color="indigo" />
                    </Group>
                ) : (
                    <>
                        <Group justify="space-between" mb="xs">
                            <Text size="sm" fw={500}>Hạn mức 5 giờ</Text>
                            <Text size="sm" c="dimmed">
                                Còn {remainingMessages} / {subscription.maxMessages}
                            </Text>
                        </Group>
                        <Progress
                            aria-label="Quota chat còn lại"
                            value={remainingPercent}
                            color={remainingColor}
                            radius="xs"
                            size="sm"
                        />
                        <Group justify="space-between" mt="xs">
                            <Badge color={subscription.tier === 'GOLD' ? 'brandGold.5' : subscription.tier === 'SILVER' ? 'brandBlue' : 'zinc.5'} variant="filled" size="sm" radius="xs">
                                {subscription.tier}
                            </Badge>
                            <Text size="xs" c="dimmed">{quotaResetLabel}</Text>
                        </Group>
                    </>
                )}
                <Button
                    component={Link}
                    href="/student/subscription"
                    leftSection={<IconArrowRight size="1rem" stroke={1.5} />}
                    color="brandBlue"
                    variant="filled"
                    radius="xs"
                    mt="md"
                >
                    Nâng cấp gói
                </Button>
            </Box>
        </AppShell.Navbar>
    );
}
