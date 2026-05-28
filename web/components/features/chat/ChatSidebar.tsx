'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from "next/link";
import { AppShell, ActionIcon, Badge, Box, Button, Group, Loader, Menu, Modal, NavLink, Progress, Stack, Text, TextInput } from '@mantine/core';
import { IconArrowRight, IconDotsVertical, IconMessage, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { api } from '@/lib/api';
import { chatApi } from '@/api/chat';
import type { ChatSession } from '@/types';

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
    const router = useRouter();
    const queryClient = useQueryClient();
    const currentSessionId = searchParams.get('sessionId');
    const [renameSession, setRenameSession] = useState<ChatSession | null>(null);
    const [renameTitle, setRenameTitle] = useState('');
    const [deleteSession, setDeleteSession] = useState<ChatSession | null>(null);

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

    const renameMutation = useMutation({
        mutationFn: ({ sessionId, title }: { sessionId: string; title: string }) =>
            chatApi.renameChatSession(sessionId, title),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["chat-session-details", variables.sessionId] });
            queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
            setRenameSession(null);
            setRenameTitle('');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (sessionId: string) => chatApi.deleteChatSession(sessionId),
        onSuccess: (_, sessionId) => {
            queryClient.invalidateQueries({ queryKey: ["chat-session-details", sessionId] });
            queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
            if (currentSessionId === sessionId) {
                router.push('/student/chat');
            }
            setDeleteSession(null);
        },
    });

    const openRenameModal = (session: ChatSession) => {
        setRenameSession(session);
        setRenameTitle(session.title || 'Cuộc hội thoại');
    };

    const closeRenameModal = () => {
        if (renameMutation.isPending) {
            return;
        }
        setRenameSession(null);
        setRenameTitle('');
    };

    const closeDeleteModal = () => {
        if (deleteMutation.isPending) {
            return;
        }
        setDeleteSession(null);
    };

    const submitRename = () => {
        if (!renameSession) {
            return;
        }

        const nextTitle = renameTitle.trim();
        if (!nextTitle) {
            return;
        }

        renameMutation.mutate({ sessionId: renameSession.id, title: nextTitle });
    };

    const submitDelete = () => {
        if (!deleteSession) {
            return;
        }

        deleteMutation.mutate(deleteSession.id);
    };

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
                        <Group key={session.id} gap="xs" wrap="nowrap" align="stretch" mb="xs">
                            <NavLink
                                component={Link}
                                href={`/student/chat?sessionId=${session.id}`}
                                label={session.title || "Cuộc hội thoại"}
                                description={formatSessionScope(session)}
                                leftSection={<IconMessage size="1rem" stroke={1.5} />}
                                active={currentSessionId === session.id}
                                style={{ flex: 1, minWidth: 0 }}
                            />
                            <Menu position="bottom-end" withinPortal shadow="md" width={180}>
                                <Menu.Target>
                                    <ActionIcon
                                        variant="subtle"
                                        color="gray"
                                        aria-label={`Tùy chọn cho ${session.title || "cuộc hội thoại"}`}
                                    >
                                        <IconDotsVertical size="1rem" />
                                    </ActionIcon>
                                </Menu.Target>
                                <Menu.Dropdown>
                                    <Menu.Item
                                        leftSection={<IconPencil size="0.85rem" />}
                                        onClick={() => openRenameModal(session)}
                                    >
                                        Đổi tên
                                    </Menu.Item>
                                    <Menu.Item
                                        leftSection={<IconTrash size="0.85rem" />}
                                        color="red"
                                        onClick={() => setDeleteSession(session)}
                                    >
                                        Xóa
                                    </Menu.Item>
                                </Menu.Dropdown>
                            </Menu>
                        </Group>
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

            <Modal
                opened={!!renameSession}
                onClose={closeRenameModal}
                title="Đổi tên cuộc hội thoại"
                centered
            >
                <Stack gap="md">
                    <TextInput
                        label="Tên cuộc hội thoại"
                        value={renameTitle}
                        onChange={(event) => setRenameTitle(event.currentTarget.value)}
                        placeholder="Nhập tên mới"
                        autoFocus
                    />
                    <Group justify="end">
                        <Button variant="light" color="gray" onClick={closeRenameModal} disabled={renameMutation.isPending}>
                            Hủy
                        </Button>
                        <Button
                            onClick={submitRename}
                            loading={renameMutation.isPending}
                            disabled={!renameTitle.trim()}
                            color="brandBlue"
                        >
                            Lưu
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            <Modal
                opened={!!deleteSession}
                onClose={closeDeleteModal}
                title="Xóa cuộc hội thoại"
                centered
            >
                <Stack gap="md">
                    <Text size="sm">
                        Bạn có chắc muốn xóa cuộc hội thoại {deleteSession?.title || 'Cuộc hội thoại'}? Hành động này không thể hoàn tác.
                    </Text>
                    <Group justify="end">
                        <Button variant="light" color="gray" onClick={closeDeleteModal} disabled={deleteMutation.isPending}>
                            Hủy
                        </Button>
                        <Button color="red" onClick={submitDelete} loading={deleteMutation.isPending}>
                            Xóa
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </AppShell.Navbar>
    );
}
