'use client';

import { AppShell, Group, Title, Button } from '@mantine/core';
import { IconLogout, IconShield } from '@tabler/icons-react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();

    // Hàm xử lý đăng xuất, xóa session giả lập và đẩy về trang đăng nhập chủ
    const handleLogout = async () => {
        await api.logout();
        router.push('/');
    };

    return (
        <AppShell header={{ height: 60 }}>
            <AppShell.Header bg="zinc.900" style={{ borderBottom: '1px solid #27272a' }}>
                <Group h="100%" px="xl" justify="space-between">
                    <Group gap="xs">
                        <IconShield size={20} color="var(--mantine-color-teal-5)" />
                        <Title order={4} c="zinc.100" style={{ fontSize: 'var(--mantine-font-size-sm)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Hệ thống Quản trị - Admin Portal
                        </Title>
                    </Group>
                    <Button
                        variant="light"
                        color="red"
                        radius="xs"
                        size="xs"
                        leftSection={<IconLogout size={14} />}
                        onClick={handleLogout}
                    >
                        Đăng xuất Admin
                    </Button>
                </Group>
            </AppShell.Header>

            <AppShell.Main bg="zinc.950" pt={80}>
                {children}
            </AppShell.Main>
        </AppShell>
    );
}
