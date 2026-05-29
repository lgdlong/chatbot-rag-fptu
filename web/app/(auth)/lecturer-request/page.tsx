'use client';

import { lecturerRequestsApi } from '@/api/lecturer-requests';
import { useForm } from '@tanstack/react-form';
import {
  Alert,
  Anchor,
  Button,
  Center,
  Paper,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle } from '@tabler/icons-react';
import Link from 'next/link';
import { useState } from 'react';

export default function LecturerRequestPage() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
      reason: '',
    },
    onSubmit: async ({ value, formApi }) => {
      setSubmitError(null);

      try {
        await lecturerRequestsApi.create({
          name: value.name.trim(),
          email: value.email.trim().toLowerCase(),
          reason: value.reason.trim(),
        });

        setIsSubmitted(true);
        notifications.show({
          color: 'teal',
          title: 'Đã ghi nhận yêu cầu',
          message: 'Admin sẽ rà soát và cấp tài khoản giảng viên nếu thông tin hợp lệ.',
        });
        formApi.reset();
      } catch (error: unknown) {
        setSubmitError(error instanceof Error ? error.message : 'Không thể gửi yêu cầu lúc này.');
      }
    },
  });

  return (
    <Center style={{ flex: 1, minHeight: '100vh', padding: 16 }}>
      <Paper radius="xs" p="xl" withBorder w="100%" maw={560} bg="zinc.900">
        <Title order={2} ta="center" mb="xs">
          Yêu cầu cấp tài khoản giảng viên
        </Title>
        <Text c="dimmed" size="sm" ta="center" mb="xl">
          Dành cho giảng viên FPTU chưa có tài khoản truy cập hệ thống quản lý tài liệu.
        </Text>

        {submitError && (
          <Alert icon={<IconAlertCircle size="1rem" />} title="Gửi yêu cầu thất bại" color="red" radius="xs" mb="lg">
            {submitError}
          </Alert>
        )}

        {isSubmitted && (
          <Alert title="Yêu cầu đã được gửi" color="teal" radius="xs" mb="lg">
            Yêu cầu của bạn đang ở trạng thái chờ duyệt. Sau khi admin phê duyệt, tài khoản và mật khẩu tạm thời sẽ được cấp.
          </Alert>
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <Stack gap="md">
            <form.Field
              name="name"
              validators={{
                onChange: ({ value }) => (!value.trim() ? 'Họ và tên là bắt buộc' : undefined),
              }}
            >
              {(field) => (
                <TextInput
                  label="Họ và tên"
                  placeholder="Nguyễn Văn A"
                  radius="xs"
                  required
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.currentTarget.value)}
                  onBlur={field.handleBlur}
                  error={field.state.meta.isTouched && field.state.meta.errors.length ? field.state.meta.errors.join(', ') : null}
                />
              )}
            </form.Field>

            <form.Field
              name="email"
              validators={{
                onChange: ({ value }) => {
                  const normalized = value.trim().toLowerCase();
                  if (!normalized) return 'Email FPTU là bắt buộc';
                  if (!/^[^\s@]+@fpt\.edu\.vn$/.test(normalized)) return 'Chỉ chấp nhận email @fpt.edu.vn';
                  return undefined;
                },
              }}
            >
              {(field) => (
                <TextInput
                  label="Email FPTU"
                  placeholder="giangvien@fpt.edu.vn"
                  radius="xs"
                  required
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.currentTarget.value)}
                  onBlur={field.handleBlur}
                  error={field.state.meta.isTouched && field.state.meta.errors.length ? field.state.meta.errors.join(', ') : null}
                />
              )}
            </form.Field>

            <form.Field
              name="reason"
              validators={{
                onChange: ({ value }) => {
                  if (!value.trim()) return 'Vui lòng nêu bộ môn hoặc nhu cầu sử dụng';
                  if (value.trim().length < 10) return 'Nội dung cần đủ rõ để admin xác minh';
                  return undefined;
                },
              }}
            >
              {(field) => (
                <Textarea
                  label="Bộ môn / nhu cầu sử dụng"
                  placeholder="Ví dụ: Giảng viên môn SWD392, cần tải slide và tài liệu học phần lên hệ thống."
                  radius="xs"
                  minRows={4}
                  required
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.currentTarget.value)}
                  onBlur={field.handleBlur}
                  error={field.state.meta.isTouched && field.state.meta.errors.length ? field.state.meta.errors.join(', ') : null}
                />
              )}
            </form.Field>

            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <Button type="submit" radius="xs" color="indigo" loading={isSubmitting} disabled={!canSubmit}>
                  Gửi yêu cầu
                </Button>
              )}
            </form.Subscribe>
          </Stack>
        </form>

        <Text c="dimmed" size="xs" ta="center" mt="xl">
          Đã có tài khoản?{' '}
          <Anchor component={Link} href="/login" c="indigo.3">
            Quay lại đăng nhập
          </Anchor>
        </Text>
      </Paper>
    </Center>
  );
}
