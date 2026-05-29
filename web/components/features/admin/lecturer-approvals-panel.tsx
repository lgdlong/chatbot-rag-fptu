'use client';

import { adminApi } from '@/api/admin';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';

type LecturerApprovalAction =
  | {
      type: 'approve' | 'reject';
      request: {
        id: string;
        name: string;
        email: string;
        reason: string;
      };
    }
  | null;

export function LecturerApprovalsPanel() {
  const queryClient = useQueryClient();
  const [pendingAction, setPendingAction] = useState<LecturerApprovalAction>(null);
  const requestsQuery = useQuery({
    queryKey: ['admin', 'lecturer-requests'],
    queryFn: adminApi.getLecturerRequests,
  });

  const approveMutation = useMutation({
    mutationFn: adminApi.approveLecturerRequest,
    onSuccess: (data) => {
      notifications.show({
        color: 'teal',
        title: 'Đã phê duyệt giảng viên',
        message: `${data.credentials.email} - Mật khẩu tạm: ${data.credentials.temporaryPassword}`,
      });
      setPendingAction(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'lecturer-requests'] });
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Phê duyệt thất bại',
        message: error.message,
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: adminApi.rejectLecturerRequest,
    onSuccess: () => {
      notifications.show({
        color: 'teal',
        title: 'Đã từ chối yêu cầu',
        message: 'Yêu cầu đăng ký giảng viên đã được cập nhật.',
      });
      setPendingAction(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'lecturer-requests'] });
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'Từ chối thất bại',
        message: error.message,
      });
    },
  });

  const pendingRequests =
    requestsQuery.data?.requests.filter((request) => request.status === 'PENDING') ?? [];
  const isConfirmLoading =
    pendingAction?.type === 'approve' ? approveMutation.isPending : rejectMutation.isPending;

  const closeConfirmModal = () => {
    if (isConfirmLoading) {
      return;
    }

    setPendingAction(null);
  };

  const submitConfirmAction = () => {
    if (!pendingAction) {
      return;
    }

    if (pendingAction.type === 'approve') {
      approveMutation.mutate(pendingAction.request.id);
      return;
    }

    rejectMutation.mutate(pendingAction.request.id);
  };

  return (
    <>
      <Card
        bg="zinc.900/40"
        withBorder
        radius="xs"
        p="lg"
        style={{ borderColor: '#27272a', backdropFilter: 'blur(12px)' }}
      >
        <Box mb={16}>
          <Title order={4} style={{ color: 'var(--mantine-color-zinc-2)' }}>
            Yêu cầu đăng ký tài khoản giảng viên chờ duyệt
          </Title>
          <Text size="xs" c="dimmed" mt={4}>
            Kiểm tra thông tin trước khi cấp quyền upload tài liệu RAG.
          </Text>
        </Box>

        {requestsQuery.isLoading ? (
          <Group justify="center" py="xl">
            <Loader size="sm" />
          </Group>
        ) : requestsQuery.isError ? (
          <Box
            style={{
              textAlign: 'center',
              padding: '48px 0',
              color: 'var(--mantine-color-red-4)',
              border: '1px dashed #27272a',
              borderRadius: 'var(--mantine-radius-xs)',
            }}
          >
            {requestsQuery.error.message}
          </Box>
        ) : pendingRequests.length === 0 ? (
          <Box
            style={{
              textAlign: 'center',
              padding: '48px 0',
              color: 'var(--mantine-color-zinc-5)',
              border: '1px dashed #27272a',
              borderRadius: 'var(--mantine-radius-xs)',
            }}
          >
            Không có yêu cầu đăng ký nào đang chờ duyệt.
          </Box>
        ) : (
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr style={{ borderColor: '#27272a' }}>
                <Table.Th style={{ color: 'var(--mantine-color-zinc-4)' }}>Họ và tên</Table.Th>
                <Table.Th style={{ color: 'var(--mantine-color-zinc-4)' }}>Email FPTU</Table.Th>
                <Table.Th style={{ color: 'var(--mantine-color-zinc-4)' }}>Lý do / Bộ môn</Table.Th>
                <Table.Th style={{ color: 'var(--mantine-color-zinc-4)', textAlign: 'right' }}>
                  Thao tác
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {pendingRequests.map((request) => (
                <Table.Tr key={request.id} style={{ borderColor: '#27272a' }}>
                  <Table.Td style={{ fontWeight: 500, color: 'var(--mantine-color-zinc-2)' }}>
                    {request.name}
                  </Table.Td>
                  <Table.Td
                    style={{
                      fontFamily: 'var(--mantine-font-family-mono)',
                      fontSize: 'var(--mantine-font-size-xs)',
                      color: 'var(--mantine-color-zinc-4)',
                    }}
                  >
                    {request.email}
                  </Table.Td>
                  <Table.Td style={{ fontSize: 'var(--mantine-font-size-xs)', color: '#a1a1aa' }}>
                    {request.reason}
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Group gap="xs" justify="flex-end">
                      <Button
                        size="xs"
                        color="teal"
                        radius="xs"
                        loading={approveMutation.isPending && pendingAction?.request.id === request.id}
                        onClick={() =>
                          setPendingAction({
                            type: 'approve',
                            request: {
                              id: request.id,
                              name: request.name,
                              email: request.email,
                              reason: request.reason,
                            },
                          })
                        }
                      >
                        Phê duyệt
                      </Button>
                      <Button
                        size="xs"
                        color="red"
                        variant="light"
                        radius="xs"
                        loading={rejectMutation.isPending && pendingAction?.request.id === request.id}
                        onClick={() =>
                          setPendingAction({
                            type: 'reject',
                            request: {
                              id: request.id,
                              name: request.name,
                              email: request.email,
                              reason: request.reason,
                            },
                          })
                        }
                      >
                        Từ chối
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      <Modal opened={Boolean(pendingAction)} onClose={closeConfirmModal} title="Xác nhận thao tác" centered radius="xs">
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {pendingAction?.type === 'approve'
              ? 'Bạn có chắc muốn phê duyệt yêu cầu này không? Hệ thống sẽ tạo tài khoản giảng viên và sinh mật khẩu tạm thời.'
              : 'Bạn có chắc muốn từ chối yêu cầu này không? Yêu cầu sẽ được đánh dấu là đã xử lý và không còn nằm trong danh sách chờ duyệt.'}
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
              {pendingAction?.request.name}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              {pendingAction?.request.email}
            </Text>
            <Text size="xs" c="dimmed" mt={8}>
              {pendingAction?.request.reason}
            </Text>
          </Box>
          <Group justify="flex-end">
            <Button variant="light" color="gray" radius="xs" onClick={closeConfirmModal} disabled={isConfirmLoading}>
              Hủy
            </Button>
            <Button
              color={pendingAction?.type === 'approve' ? 'teal' : 'red'}
              radius="xs"
              loading={isConfirmLoading}
              onClick={submitConfirmAction}
            >
              {pendingAction?.type === 'approve' ? 'Xác nhận phê duyệt' : 'Xác nhận từ chối'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
