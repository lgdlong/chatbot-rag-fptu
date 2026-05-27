'use client';

import { AppShell, Group, Title, Button } from '@mantine/core';
import { LogOut, BookOpen } from 'lucide-react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function LecturerLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();

    const handleLogout = async () => {
        await api.logout();
        router.push('/');
    };

    return (
        <AppShell header={{ height: 60 }}>
            <AppShell.Header bg="zinc.900" style={{ borderBottom: '1px solid #27272a' }}>
                <Group h="100%" px="xl" justify="space-between">
                    <Group gap="xs">
                        <BookOpen className="w-5 h-5 text-amber-400" />
                        <Title order={4} c="brandGold.5" className="text-sm font-bold uppercase tracking-wider">
                            Cổng Giảng Viên - Quản Lý Học Liệu
                        </Title>
                    </Group>
                    <Button variant="subtle" color="red" radius="xs" size="xs" leftSection={<LogOut className="w-3.5 h-3.5" />} onClick={handleLogout}>
                        Đăng xuất Portal
                    </Button>
                </Group>
            </AppShell.Header>

            <AppShell.Main bg="zinc.950" pt={80}>
                {children}
            </AppShell.Main>
        </AppShell>
    );
}