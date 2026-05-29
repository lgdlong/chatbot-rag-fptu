'use client';

import { adminApi, type AdminUser } from '@/api/admin';
import { useQuery } from '@tanstack/react-query';
import {
  Badge,
  Box,
  Card,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconClockHour4,
  IconShieldCheck,
  IconSparkles,
  IconUserBolt,
  IconUserCheck,
  IconUsers,
} from '@tabler/icons-react';

function formatDate(value?: string) {
  if (!value) {
    return 'Chưa có dữ liệu';
  }

  return new Date(value).toLocaleString('vi-VN');
}

function getRoleCount(users: AdminUser[], role: string) {
  return users.filter((user) => String(user.role ?? '').toUpperCase() === role).length;
}

export function AdminOverviewPanel() {
  const usersQuery = useQuery({
    queryKey: ['admin', 'overview', 'users'],
    queryFn: () =>
      adminApi.listUsers({
        limit: 200,
        offset: 0,
        sortBy: 'createdAt',
        sortDirection: 'desc',
      }),
  });

  const lecturerRequestsQuery = useQuery({
    queryKey: ['admin', 'overview', 'lecturer-requests'],
    queryFn: adminApi.getLecturerRequests,
  });

  if (usersQuery.isLoading || lecturerRequestsQuery.isLoading) {
    return (
      <Group justify="center" py="xl">
        <Loader size="sm" />
      </Group>
    );
  }

  if (usersQuery.isError || lecturerRequestsQuery.isError) {
    return (
      <Card
        bg="zinc.900/40"
        withBorder
        radius="xs"
        p="lg"
        style={{ borderColor: '#27272a', backdropFilter: 'blur(12px)' }}
      >
        <Text c="red.4">
          {usersQuery.error?.message || lecturerRequestsQuery.error?.message || 'Không thể tải dữ liệu tổng quan'}
        </Text>
      </Card>
    );
  }

  const users = usersQuery.data?.users ?? [];
  const totalUsers = usersQuery.data?.total ?? users.length;
  const bannedUsers = users.filter((user) => Boolean(user.banned)).length;
  const activeUsers = totalUsers - bannedUsers;
  const adminCount = getRoleCount(users, 'ADMIN');
  const lecturerCount = getRoleCount(users, 'LECTURER');
  const latestUser = users[0];
  const pendingLecturerRequests =
    lecturerRequestsQuery.data?.requests.filter((request) => request.status === 'PENDING').length ?? 0;

  const statCards = [
    {
      label: 'TỔNG TÀI KHOẢN',
      value: totalUsers,
      hint: 'Toàn bộ người dùng trong hệ thống',
      icon: IconUsers,
      color: 'indigo',
    },
    {
      label: 'ĐANG HOẠT ĐỘNG',
      value: activeUsers,
      hint: 'Tài khoản chưa bị khóa',
      icon: IconUserCheck,
      color: 'teal',
    },
    {
      label: 'TÀI KHOẢN BỊ KHÓA',
      value: bannedUsers,
      hint: 'Cần theo dõi và rà soát',
      icon: IconAlertTriangle,
      color: 'red',
    },
    {
      label: 'YÊU CẦU GIẢNG VIÊN',
      value: pendingLecturerRequests,
      hint: 'Đang chờ admin duyệt',
      icon: IconClockHour4,
      color: 'orange',
    },
    {
      label: 'ADMIN',
      value: adminCount,
      hint: 'Nhóm có quyền quản trị',
      icon: IconShieldCheck,
      color: 'pink',
    },
    {
      label: 'LECTURER',
      value: lecturerCount,
      hint: 'Nhóm được quản lý khóa học',
      icon: IconUserBolt,
      color: 'blue',
    },
  ];

  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }} spacing="md">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.label}
              bg="zinc.900/40"
              withBorder
              radius="xs"
              p="lg"
              style={{ borderColor: '#27272a', backdropFilter: 'blur(12px)', minHeight: 148 }}
            >
              <Group justify="space-between" align="flex-start" mb="md">
                <ThemeIcon color={card.color} variant="light" radius="md" size={42}>
                  <Icon size={20} />
                </ThemeIcon>
                <Badge color={card.color} variant="dot" size="sm">
                  Live
                </Badge>
              </Group>
              <Text size="xs" fw={700} c="dimmed">
                {card.label}
              </Text>
              <Title order={3} mt={6} style={{ color: 'var(--mantine-color-zinc-1)' }}>
                {card.value}
              </Title>
              <Text size="sm" mt="xs" c="dimmed">
                {card.hint}
              </Text>
            </Card>
          );
        })}
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="md">
        <Card
          bg="zinc.900/40"
          withBorder
          radius="xs"
          p="lg"
          style={{ borderColor: '#27272a', backdropFilter: 'blur(12px)' }}
        >
          <Group justify="space-between" mb="md">
            <Box>
              <Text size="xs" fw={700} c="dimmed">
                TÀI KHOẢN MỚI NHẤT
              </Text>
              <Title order={4} mt={6} style={{ color: 'var(--mantine-color-zinc-1)' }}>
                {latestUser?.name || 'Chưa có tài khoản'}
              </Title>
            </Box>
            <ThemeIcon color="grape" variant="light" radius="md" size={42}>
              <IconSparkles size={20} />
            </ThemeIcon>
          </Group>
          <Stack gap={8}>
            <Text size="sm" c="dimmed">
              Email: <Text span c="zinc.1">{latestUser?.email || 'N/A'}</Text>
            </Text>
            <Text size="sm" c="dimmed">
              Vai trò: <Text span c="zinc.1">{String(latestUser?.role ?? 'N/A').toUpperCase()}</Text>
            </Text>
            <Text size="sm" c="dimmed">
              Tạo lúc: <Text span c="zinc.1">{formatDate(latestUser?.createdAt)}</Text>
            </Text>
          </Stack>
        </Card>

        <Card
          bg="zinc.900/40"
          withBorder
          radius="xs"
          p="lg"
          style={{ borderColor: '#27272a', backdropFilter: 'blur(12px)' }}
        >
          <Text size="xs" fw={700} c="dimmed">
            GỢI Ý VẬN HÀNH
          </Text>
          <Stack gap="sm" mt="md">
            <Group justify="space-between">
              <Text size="sm" c="zinc.2">Rà soát yêu cầu giảng viên tồn đọng</Text>
              <Badge color={pendingLecturerRequests > 0 ? 'orange' : 'teal'} variant="light">
                {pendingLecturerRequests > 0 ? `${pendingLecturerRequests} cần xử lý` : 'Ổn định'}
              </Badge>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="zinc.2">Theo dõi tài khoản đã bị khóa</Text>
              <Badge color={bannedUsers > 0 ? 'red' : 'teal'} variant="light">
                {bannedUsers > 0 ? `${bannedUsers} account` : 'Không có'}
              </Badge>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="zinc.2">Tỉ lệ tài khoản hoạt động</Text>
              <Badge color="indigo" variant="light">
                {totalUsers > 0 ? `${Math.round((activeUsers / totalUsers) * 100)}%` : '0%'}
              </Badge>
            </Group>
          </Stack>
        </Card>
      </SimpleGrid>
    </Stack>
  );
}
