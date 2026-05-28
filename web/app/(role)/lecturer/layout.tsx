'use client';

import { AppShell, Group, Title, Button } from '@mantine/core';
import { IconLogout, IconBook } from '@tabler/icons-react';
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
                        <IconBook size={20} color="var(--mantine-color-gold-5)" />
                        <Title order={4} c="gold.5" style={{ fontSize: 'var(--mantine-font-size-sm)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Cổng Giảng Viên - Quản Lý Học Liệu
                        </Title>
                    </Group>
                    <Button variant="light" color="red" radius="xs" size="xs" leftSection={<IconLogout size={14} />} onClick={handleLogout}>
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
