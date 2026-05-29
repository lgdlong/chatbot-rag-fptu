'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  Grid,
  Loader,
  PasswordInput,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@tanstack/react-form';
import { IconUserPlus } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import {
  AdminSection,
  AdminSidebar,
} from '@/components/features/admin/admin-sidebar';
import { AdminOverviewPanel } from '@/components/features/admin/admin-overview-panel';
import { LecturerApprovalsPanel } from '@/components/features/admin/lecturer-approvals-panel';
import { AccountManagementPanel } from '@/components/features/admin/account-management-panel';

function ProvisioningPanel() {
  const [isCreating, setIsCreating] = useState(false);
  const adminForm = useForm({
    defaultValues: {
      role: 'student',
      name: '',
      email: '',
      password: '',
    },
    onSubmit: async ({ value, formApi }) => {
      setIsCreating(true);
      setTimeout(() => {
        setIsCreating(false);
        notifications.show({
          color: 'teal',
          title: 'Đã tạo tài khoản demo',
          message: `Role ${value.role.toUpperCase()} - ${value.email}`,
        });
        formApi.reset();
      }, 800);
    },
  });

  return (
    <Box maw={640}>
      <Card
        bg="zinc.900/40"
        withBorder
        radius="xs"
        p="xl"
        style={{ borderColor: '#27272a', backdropFilter: 'blur(12px)' }}
      >
        <Box mb={24}>
          <Title
            order={4}
            style={{ color: 'var(--mantine-color-zinc-2)', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <IconUserPlus size={20} color="var(--mantine-color-indigo-4)" />
            Cấp phát tài khoản mới
          </Title>
          <Text size="xs" c="dimmed" mt={4}>
            Khu vực này vẫn đang là luồng demo nội bộ. Chức năng quản lý user thực tế nằm ở mục Quản lý account.
          </Text>
        </Box>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            adminForm.handleSubmit();
          }}
        >
          <Stack gap="md">
            <adminForm.Field name="role">
              {(field) => (
                <Select
                  label="Loại tài khoản"
                  data={[
                    { value: 'student', label: 'Sinh viên' },
                    { value: 'lecturer', label: 'Giảng viên' },
                    { value: 'admin', label: 'Quản trị viên' },
                  ]}
                  radius="xs"
                  value={field.state.value}
                  onChange={(value) => field.handleChange(value || 'student')}
                  styles={{
                    label: { color: '#a1a1aa', marginBottom: 5 },
                    input: { backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#f4f4f5' },
                  }}
                />
              )}
            </adminForm.Field>

            <adminForm.Field name="name">
              {(field) => (
                <TextInput
                  label="Họ và tên"
                  placeholder="Nhập tên người dùng..."
                  radius="xs"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.currentTarget.value)}
                  styles={{
                    label: { color: '#a1a1aa', marginBottom: 5 },
                    input: { backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#f4f4f5' },
                  }}
                />
              )}
            </adminForm.Field>

            <adminForm.Field name="email">
              {(field) => (
                <TextInput
                  label="Email"
                  placeholder="email@fpt.edu.vn"
                  radius="xs"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.currentTarget.value)}
                  styles={{
                    label: { color: '#a1a1aa', marginBottom: 5 },
                    input: { backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#f4f4f5' },
                  }}
                />
              )}
            </adminForm.Field>

            <adminForm.Field name="password">
              {(field) => (
                <PasswordInput
                  label="Mật khẩu khởi tạo"
                  placeholder="Nhập mật khẩu tạm thời..."
                  radius="xs"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.currentTarget.value)}
                  styles={{
                    label: { color: '#a1a1aa', marginBottom: 5 },
                    input: { backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#f4f4f5' },
                  }}
                />
              )}
            </adminForm.Field>

            <Button
              type="submit"
              color="indigo"
              radius="xs"
              mt="md"
              leftSection={isCreating ? <Loader size="xs" color="white" /> : null}
            >
              {isCreating ? 'Đang tạo...' : 'Tạo tài khoản'}
            </Button>
          </Stack>
        </form>
      </Card>
    </Box>
  );
}

export default function AdminDashboardPage() {
  const [activeSection, setActiveSection] = useState<AdminSection>('accounts');

  return (
    <Box
      style={{
        minHeight: 'calc(100vh - 60px)',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#09090b',
      }}
    >
      <Box
        style={{
          position: 'absolute',
          top: '-10%',
          right: '-10%',
          width: 400,
          height: 400,
          borderRadius: '9999px',
          backgroundColor: 'rgba(99, 102, 241, 0.04)',
          filter: 'blur(120px)',
          pointerEvents: 'none',
        }}
      />
      <Box
        style={{
          position: 'absolute',
          bottom: '-10%',
          left: '-15%',
          width: 500,
          height: 500,
          borderRadius: '9999px',
          backgroundColor: 'rgba(124, 58, 237, 0.04)',
          filter: 'blur(140px)',
          pointerEvents: 'none',
        }}
      />

      <Box style={{ position: 'relative', zIndex: 10, padding: 32, maxWidth: 1440, margin: '0 auto' }}>
        <Box mb={32}>
          <Title order={2} style={{ color: 'var(--mantine-color-zinc-0)', fontWeight: 700 }}>
            Hệ thống Quản trị
          </Title>
          <Text size="sm" c="dimmed" mt={4}>
            Điều phối tài khoản, phê duyệt giảng viên và giám sát các tác vụ vận hành từ một sidebar duy nhất.
          </Text>
        </Box>

        <Grid align="flex-start">
          <Grid.Col span={{ base: 12, lg: 3 }}>
            <Box
              p="md"
              style={{
                position: 'sticky',
                top: 92,
                border: '1px solid #27272a',
                borderRadius: 'var(--mantine-radius-xs)',
                backgroundColor: 'rgba(24, 24, 27, 0.7)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <AdminSidebar activeSection={activeSection} onChange={setActiveSection} />
            </Box>
          </Grid.Col>

          <Grid.Col span={{ base: 12, lg: 9 }}>
            {activeSection === 'overview' && <AdminOverviewPanel />}
            {activeSection === 'approvals' && <LecturerApprovalsPanel />}
            {activeSection === 'provisioning' && <ProvisioningPanel />}
            {activeSection === 'accounts' && <AccountManagementPanel />}
          </Grid.Col>
        </Grid>
      </Box>
    </Box>
  );
}
