'use client';

import { AppShell, Box, NavLink, Text, Progress, Group, Badge } from '@mantine/core';
import { IconMessage, IconPlus } from '@tabler/icons-react';
import { MOCK_SESSIONS, MOCK_SUBSCRIPTION } from '@/lib/mock';
import { useSearchParams } from 'next/navigation';
import Link from "next/link";

export function ChatSidebar() {
    const searchParams = useSearchParams();
    const currentSessionId = searchParams.get('sessionId');

    const usagePercent = (MOCK_SUBSCRIPTION.messageCount / MOCK_SUBSCRIPTION.maxMessages) * 100;

    return (
        <AppShell.Navbar p="md" display="flex" style={{ flexDirection: 'column' }}>
            <NavLink
                component={Link}
                href="/student/chat" // Đổi thành /student/chat
                label="Cuộc hội thoại mới"
                leftSection={<IconPlus size="1rem" stroke={1.5} />}
                variant="filled"
                color="brandBlue"
                active={!currentSessionId}
                mb="md"

            />

            <Text size="xs" fw={700} c="dimmed" mb="sm">LỊCH SỬ CHAT</Text>

            <Box style={{ flex: 1, overflowY: 'auto' }}>
                {MOCK_SESSIONS.map((session) => (
                    <NavLink
                        component={Link}
                        key={session.id}
                        href={`/student/chat?sessionId=${session.id}`} // Đổi thành /student/chat
                        label={session.title}
                        leftSection={<IconMessage size="1rem" stroke={1.5} />}
                        active={currentSessionId === session.id}

                    />
                ))}
            </Box>

            <Box mt="auto" pt="md" style={{ borderTop: '1px solid #3f3f46' }}>
                <Group justify="space-between" mb="xs">
                    <Text size="sm" fw={500}>Hạn mức câu hỏi</Text>
                    <Text size="sm" c="dimmed">{MOCK_SUBSCRIPTION.messageCount} / {MOCK_SUBSCRIPTION.maxMessages}</Text>
                </Group>
                <Progress
                    value={usagePercent}
                    color={usagePercent > 80 ? 'red' : 'brandBlue'}
                    radius="xs"
                    size="sm"
                />
                <Group justify="space-between" mt="xs">
                    <Badge color="brandGold.5" variant="filled" size="sm" radius="xs">
                        {MOCK_SUBSCRIPTION.tier}
                    </Badge>
                    <Text size="xs" c="dimmed">Gia hạn: {new Date(MOCK_SUBSCRIPTION.endDate).toLocaleDateString('vi-VN')}</Text>
                </Group>
            </Box>
        </AppShell.Navbar>
    );
}