'use client';

import { AppShell, Burger, Group, Title, Button } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { ChatSidebar } from '@/components/features/chat/ChatSidebar';
import { LogOut } from 'lucide-react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

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
        >
            <AppShell.Header bg="zinc.900" style={{ borderBottom: '1px solid #27272a' }}>
                <Group h="100%" px="md" justify="space-between">
                    <Group>
                        <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" color="gray" />
                        <Title order={4} c="brandBlue.4" className="text-sm font-bold">FPTU RAG - SINH VIÊN</Title>
                    </Group>
                    <Button variant="subtle" color="red" radius="xs" size="xs" leftSection={<LogOut className="w-3.5 h-3.5" />} onClick={handleLogout}>
                        Đăng xuất
                    </Button>
                </Group>
            </AppShell.Header>

            <ChatSidebar />

            <AppShell.Main bg="zinc.950">
                {children}
            </AppShell.Main>
        </AppShell>
    );
}