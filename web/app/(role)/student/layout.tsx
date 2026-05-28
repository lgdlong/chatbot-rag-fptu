'use client';

import { AppShell, Burger, Group, Title, Button } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { ChatSidebar } from '@/components/features/chat/ChatSidebar';
import { IconLogout } from '@tabler/icons-react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Suspense } from 'react';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
    const [opened, { toggle }] = useDisclosure();
    const router = useRouter();

    const handleLogout = async () => {
        await api.logout();
        router.push('/');
    };

    return (
        <AppShell
            header={{ height: 60 }}
            navbar={{ width: 280, breakpoint: 'sm', collapsed: { mobile: !opened } }}
            padding="md"
        >
            <AppShell.Header bg="zinc.900" style={{ borderBottom: '1px solid #27272a' }}>
                <Group h="100%" px="md" justify="space-between">
                    <Group>
                        <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" color="gray" />
                        <Title order={4} c="deepBlue.4" style={{ fontSize: 'var(--mantine-font-size-sm)', fontWeight: 700 }}>FPTU RAG - SINH VIÊN</Title>
                    </Group>
                    <Button variant="light" color="red" radius="xs" size="xs" leftSection={<IconLogout size={14} />} onClick={handleLogout}>
                        Đăng xuất
                    </Button>
                </Group>
            </AppShell.Header>

            <Suspense fallback={
                <AppShell.Navbar p="md" display="flex" style={{ flexDirection: 'column' }}>
                    <div style={{ flex: 1 }} />
                </AppShell.Navbar>
            }>
                <ChatSidebar />
            </Suspense>

            <AppShell.Main
                bg="zinc.950"
                style={{
                    display: 'flex',
                    minHeight: 0,
                    width: '100%',
                    height: 'calc(100dvh - var(--app-shell-header-height))',
                    overflow: 'hidden',
                }}
            >
                {children}
            </AppShell.Main>
        </AppShell>
    );
}
