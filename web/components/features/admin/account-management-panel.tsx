'use client';

import { adminApi } from '@/api/admin';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Loader,
  Menu,
  Modal,
  Pagination,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconBan, IconDotsVertical, IconReload, IconSearch } from '@tabler/icons-react';
import { useState } from 'react';

const PAGE_SIZE = 10;

function formatDate(value?: string | null) {
  if (!value) {
    return 'Chưa có';
  }

  return new Date(value).toLocaleString('vi-VN');
}

function roleColor(role?: string | null) {
  const normalized = String(role ?? '').toUpperCase();
  if (normalized === 'ADMIN') return 'red';
  if (normalized === 'LECTURER') return 'indigo';
  return 'teal';
}

export function AccountManagementPanel() {
  const queryClient = useQueryClient();
  const [searchDraft, setSearchDraft] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [searchField, setSearchField] = useState<'name' | 'email'>('name');
  const [page, setPage] = useState(1);
  const [selectedBanUser, setSelectedBanUser] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);

  const usersQuery = useQuery({
    queryKey: ['admin', 'users', { searchField, searchValue, page }],
    queryFn: () =>
      adminApi.listUsers({
        searchField,
        searchValue: searchValue.trim() || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        sortBy: 'createdAt',
        sortDirection: 'desc',
      }),
  });

  const banMutation = useMutation({
    mutationFn: adminApi.banUser,
    onSuccess: () => {
      notifications.show({
        color: 'teal',
        title: 'Đã khóa tài khoản',
        message: 'Người dùng đã bị cấm đăng nhập và session hiện tại đã bị thu hồi.',
      });
      setSelectedBanUser(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Khóa tài khoản thất bại',
        message: error.message,
      });
    },
  });

  const unbanMutation = useMutation({
    mutationFn: adminApi.unbanUser,
    onSuccess: () => {
      notifications.show({
        color: 'teal',
        title: 'Đã mở khóa tài khoản',
        message: 'Người dùng có thể đăng nhập lại.',
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Mở khóa thất bại',
        message: error.message,
      });
    },
  });

  const totalPages = Math.max(1, Math.ceil((usersQuery.data?.total ?? 0) / PAGE_SIZE));

  return (
    <Card
      bg="zinc.900/40"
      withBorder
      radius="xs"
      p="lg"
      style={{ borderColor: '#27272a', backdropFilter: 'blur(12px)' }}
    >
      <Stack gap="lg">
        <Group justify="space-between" align="flex-end">
          <Box>
            <Title order={4} style={{ color: 'var(--mantine-color-zinc-2)' }}>
              Quản lý account người dùng
            </Title>
            <Text size="xs" c="dimmed" mt={4}>
              Tra cứu theo tên hoặc email, sau đó khóa tài khoản ngay trên bảng.
            </Text>
          </Box>
          <ActionIcon
            variant="light"
            color="gray"
            size="lg"
            onClick={() => usersQuery.refetch()}
            loading={usersQuery.isFetching}
          >
            <IconReload size={16} />
          </ActionIcon>
        </Group>

        <Group align="flex-end">
          <Select
            label="Tìm theo"
            value={searchField}
            onChange={(value) => setSearchField((value as 'name' | 'email') || 'name')}
            data={[
              { value: 'name', label: 'Tên người dùng' },
              { value: 'email', label: 'Email' },
            ]}
            radius="xs"
            styles={{
              label: { color: '#a1a1aa', marginBottom: 5 },
              input: { backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#f4f4f5' },
            }}
          />
          <TextInput
            label="Từ khóa"
            placeholder={searchField === 'name' ? 'Nhập tên cần tìm...' : 'Nhập email cần tìm...'}
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.currentTarget.value)}
            radius="xs"
            style={{ flex: 1 }}
            styles={{
              label: { color: '#a1a1aa', marginBottom: 5 },
              input: { backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#f4f4f5' },
            }}
          />
          <Button
            color="indigo"
            radius="xs"
            leftSection={<IconSearch size={16} />}
            onClick={() => {
              setPage(1);
              setSearchValue(searchDraft);
            }}
          >
            Tìm kiếm
          </Button>
        </Group>

        {usersQuery.isLoading ? (
          <Group justify="center" py="xl">
            <Loader size="sm" />
          </Group>
        ) : usersQuery.isError ? (
          <Box
            style={{
              textAlign: 'center',
              padding: '48px 0',
              color: 'var(--mantine-color-red-4)',
              border: '1px dashed #27272a',
              borderRadius: 'var(--mantine-radius-xs)',
            }}
          >
            {usersQuery.error.message}
          </Box>
        ) : (
          <>
            <Table.ScrollContainer minWidth={900}>
              <Table verticalSpacing="sm" highlightOnHover>
                <Table.Thead>
                  <Table.Tr style={{ borderColor: '#27272a' }}>
                    <Table.Th style={{ color: '#a1a1aa' }}>Tên</Table.Th>
                    <Table.Th style={{ color: '#a1a1aa' }}>Email</Table.Th>
                    <Table.Th style={{ color: '#a1a1aa' }}>Vai trò</Table.Th>
                    <Table.Th style={{ color: '#a1a1aa' }}>Trạng thái</Table.Th>
                    <Table.Th style={{ color: '#a1a1aa' }}>Ngày tạo</Table.Th>
                    <Table.Th style={{ color: '#a1a1aa' }}>Lý do khóa</Table.Th>
                    <Table.Th style={{ color: '#a1a1aa', textAlign: 'right' }}>Thao tác</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {usersQuery.data?.users.map((user) => (
                    <Table.Tr key={user.id} style={{ borderColor: '#27272a' }}>
                      <Table.Td style={{ color: '#f4f4f5', fontWeight: 600 }}>{user.name}</Table.Td>
                      <Table.Td style={{ color: '#d4d4d8' }}>{user.email}</Table.Td>
                      <Table.Td>
                        <Badge color={roleColor(user.role)} variant="light" radius="sm">
                          {String(user.role ?? 'USER').toUpperCase()}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={user.banned ? 'red' : 'teal'} variant="filled" radius="sm">
                          {user.banned ? 'Đã khóa' : 'Hoạt động'}
                        </Badge>
                      </Table.Td>
                      <Table.Td style={{ color: '#a1a1aa' }}>{formatDate(user.createdAt)}</Table.Td>
                      <Table.Td style={{ color: '#a1a1aa', maxWidth: 220 }}>
                        {user.banReason || 'Không có'}
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        {user.banned ? (
                          <Button
                            size="xs"
                            radius="xs"
                            color="teal"
                            variant="light"
                            loading={unbanMutation.isPending}
                            onClick={() => unbanMutation.mutate({ userId: user.id })}
                          >
                            Mở khóa
                          </Button>
                        ) : (
                          <Menu shadow="md" width={180} position="bottom-end" withinPortal>
                            <Menu.Target>
                              <ActionIcon
                                variant="light"
                                color="gray"
                                radius="xs"
                                aria-label={`Mở menu thao tác cho ${user.email}`}
                              >
                                <IconDotsVertical size={16} />
                              </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                              <Menu.Item
                                color="red"
                                leftSection={<IconBan size={14} />}
                                onClick={() =>
                                  setSelectedBanUser({
                                    id: user.id,
                                    name: user.name,
                                    email: user.email,
                                  })
                                }
                              >
                                Ban user
                              </Menu.Item>
                            </Menu.Dropdown>
                          </Menu>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>

            <Group justify="space-between" align="center">
              <Text size="sm" c="dimmed">
                Tổng cộng {usersQuery.data?.total ?? 0} tài khoản
              </Text>
              <Pagination
                total={totalPages}
                value={page}
                onChange={setPage}
                radius="xs"
                color="indigo"
              />
            </Group>
          </>
        )}
      </Stack>

      <Modal
        opened={Boolean(selectedBanUser)}
        onClose={() => {
          if (!banMutation.isPending) {
            setSelectedBanUser(null);
          }
        }}
        title="Xác nhận khóa tài khoản"
        centered
        radius="xs"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Bạn có chắc muốn khóa tài khoản này không? Hành động này sẽ thu hồi toàn bộ session đang hoạt động.
          </Text>
          <Box
            p="sm"
            style={{
              border: '1px solid #27272a',
              borderRadius: 'var(--mantine-radius-xs)',
              backgroundColor: '#111113',
            }}
          >
            <Text size="sm" fw={700} c="zinc.1">
              {selectedBanUser?.name}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              {selectedBanUser?.email}
            </Text>
          </Box>
          <Group justify="flex-end">
            <Button
              variant="light"
              color="gray"
              radius="xs"
              onClick={() => setSelectedBanUser(null)}
              disabled={banMutation.isPending}
            >
              Hủy
            </Button>
            <Tooltip label="Khóa user và thu hồi toàn bộ session">
              <Button
                color="red"
                radius="xs"
                leftSection={<IconBan size={14} />}
                loading={banMutation.isPending}
                onClick={() => {
                  if (!selectedBanUser) {
                    return;
                  }
                  banMutation.mutate({
                    userId: selectedBanUser.id,
                    banReason: 'Tài khoản bị khóa bởi quản trị viên',
                  });
                }}
              >
                Xác nhận ban user
              </Button>
            </Tooltip>
          </Group>
        </Stack>
      </Modal>
    </Card>
  );
}
