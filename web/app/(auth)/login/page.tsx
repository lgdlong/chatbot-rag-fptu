'use client';

import { useEffect, useState } from 'react';
import { Anchor, Button, Center, Divider, Paper, PasswordInput, Text, TextInput, Title, Alert, Stack, Collapse } from '@mantine/core';
import { IconAlertCircle, IconCode } from '@tabler/icons-react'; // IconBrandGoogle tạm thời được bỏ để tránh unused warning
import { useDisclosure } from '@mantine/hooks';
// import { notifications } from '@mantine/notifications'; // Tạm thời comment vì chỉ sử dụng trong đăng nhập Google
import { api } from '@/lib/api';
import type { DevLoginAccount } from '@/constants';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from '@tanstack/react-form';

export default function LoginPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [devLoginAccounts, setDevLoginAccounts] = useState<DevLoginAccount[]>([]);
    const [devLoginLoadError, setDevLoginLoadError] = useState<string | null>(null);

    const [opened, { toggle }] = useDisclosure(false);

    const redirectByRole = (role?: string | null) => {
        const normalizedRole = role?.toLowerCase() || 'student';
        if (normalizedRole === 'lecturer') {
            router.push('/lecturer/courses');
        } else if (normalizedRole === 'admin') {
            router.push('/admin/dashboard');
        } else {
            router.push('/student/chat');
        }
    };

    // TanStack Form cho Email/Password Login
    const form = useForm({
        defaultValues: {
            email: '',
            password: '',
        },
        onSubmit: async ({ value }) => {
            setLoading(true);
            setError(null);
            
            try {
                const res = await api.login(value.email, value.password);
                if (res.user) {
                    redirectByRole(res.user.role);
                } else {
                    setError("Đăng nhập thất bại. Vui lòng kiểm tra thông tin.");
                }
            } catch (err: unknown) {
                console.error("Login error:", err);
                const message = err instanceof Error ? err.message : "";
                if (message.toLowerCase().includes("invalid email or password") || message.toLowerCase().includes("invalid")) {
                    setError("Email hoặc mật khẩu không chính xác. Vui lòng thử lại.");
                } else {
                    setError(message || "Không thể kết nối đến máy chủ API.");
                }
            } finally {
                setLoading(false);
            }
        },
    });

    const handleDevBypassLogin = (profile: DevLoginAccount) => {
        form.setFieldValue('email', profile.email);
        form.setFieldValue('password', profile.password);
        queueMicrotask(() => form.handleSubmit());
    };

    useEffect(() => {
        let cancelled = false;

        const loadDevLoginAccounts = async () => {
            try {
                const response = await fetch('/api/dev-login-accounts', { cache: 'no-store' });
                const payload = await response.json() as { accounts?: DevLoginAccount[]; error?: string };

                if (!response.ok) {
                    throw new Error(payload.error || 'Không thể tải danh sách đăng nhập nhanh.');
                }

                if (!cancelled) {
                    setDevLoginAccounts(payload.accounts || []);
                    setDevLoginLoadError(null);
                }
            } catch (err: unknown) {
                if (!cancelled) {
                    setDevLoginAccounts([]);
                    setDevLoginLoadError(err instanceof Error ? err.message : 'Không thể tải danh sách đăng nhập nhanh.');
                }
            }
        };

        if (opened) {
            void loadDevLoginAccounts();
        }

        return () => {
            cancelled = true;
        };
    }, [opened]);

    return (
        <Center style={{ flex: 1, minHeight: '100vh' }}>
            <Paper radius="xs" p="xl" withBorder w="100%" maw={400} bg="zinc.900">
                <Title order={2} ta="center" mt="md" mb="xs">
                    RAG Chatbot
                </Title>
                <Text c="dimmed" size="sm" ta="center" mb="xl">
                    Đăng nhập để tiếp tục tra cứu tài liệu
                </Text>
                <Text c="dimmed" size="xs" ta="center" mb="lg">
                    Chưa có tài khoản giảng viên?{' '}
                    <Anchor component={Link} href="/lecturer-request" c="indigo.3">
                        Gửi yêu cầu cấp tài khoản
                    </Anchor>
                </Text>

                {error && (
                    <Alert icon={<IconAlertCircle size="1rem" />} title="Lỗi đăng nhập" color="red" radius="xs" mb="lg">
                        {error}
                    </Alert>
                )}

                {/* 
                    [CHÚ THÍCH CẤU HÌNH]
                    Chức năng đăng nhập Google tạm thời được ẩn đi theo yêu cầu.
                    Code JSX được bình luận lại để tránh nhầm lẫn cho người dùng và có thể khôi phục nhanh chóng khi cần thiết.
                    
                    Cách khôi phục: Chỉ cần bỏ khối comment này ra.
                <Button
                    fullWidth
                    leftSection={<IconBrandGoogle size="1.2rem" />}
                    variant="light"
                    color="gray"
                    radius="xs"
                    mb="lg"
                    onClick={() => {
                        notifications.show({
                            color: 'yellow',
                            title: 'Tính năng đang phát triển',
                            message: 'Đăng nhập với Google sẽ được cập nhật trong phiên bản tới.',
                        });
                    }}
                >
                    Đăng nhập với Google
                </Button>
                */}

                <Divider label="Hoặc đăng nhập bằng Email" labelPosition="center" my="lg" />

                <form 
                    onSubmit={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        form.handleSubmit();
                    }}
                >
                    <form.Field
                        name="email"
                        validators={{
                            onChange: ({ value }) => {
                                if (!value) return 'Email là bắt buộc';
                                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Email không hợp lệ';
                                return undefined;
                            },
                        }}
                    >
                        {(field) => (
                            <TextInput
                                label="Email"
                                placeholder="student@fpt.edu.vn"
                                required
                                radius="xs"
                                mb="md"
                                value={field.state.value}
                                onChange={(e) => field.handleChange(e.target.value)}
                                onBlur={field.handleBlur}
                                error={field.state.meta.isTouched && field.state.meta.errors.length ? field.state.meta.errors.join(', ') : null}
                                disabled={loading}
                            />
                        )}
                    </form.Field>

                    <form.Field
                        name="password"
                        validators={{
                            onChange: ({ value }) => {
                                if (!value) return 'Mật khẩu là bắt buộc';
                                if (value.length < 6) return 'Mật khẩu phải từ 6 ký tự trở lên';
                                return undefined;
                            },
                        }}
                    >
                        {(field) => (
                            <PasswordInput
                                label="Mật khẩu"
                                placeholder="Nhập mật khẩu của bạn"
                                required
                                radius="xs"
                                mb="xl"
                                value={field.state.value}
                                onChange={(e) => field.handleChange(e.target.value)}
                                onBlur={field.handleBlur}
                                error={field.state.meta.isTouched && field.state.meta.errors.length ? field.state.meta.errors.join(', ') : null}
                                disabled={loading}
                            />
                        )}
                    </form.Field>

                    <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
                        {([canSubmit, isSubmitting]) => (
                            <Button 
                                fullWidth 
                                radius="xs" 
                                color="deepBlue"
                                variant="filled"
                                type="submit" 
                                loading={loading || isSubmitting}
                                disabled={!canSubmit}
                            >
                                Đăng nhập
                            </Button>
                        )}
                    </form.Subscribe>
                </form>

                {/* Phần hỗ trợ Dev Bypass nhanh trong quá trình phát triển */}
                <Stack mt="xl" gap="xs">
                    <Button 
                        variant="light" 
                        color="gray" 
                        size="xs" 
                        leftSection={<IconCode size="0.9rem" />} 
                        onClick={toggle}
                        fullWidth
                    >
                        {opened ? "Ẩn Dev Bypass Console" : "Hiện Dev Bypass Console"}
                    </Button>
                    
                    <Collapse expanded={opened}>
                        <Paper withBorder p="md" bg="zinc.950" radius="xs" className="border-zinc-800">
                            <Text size="xs" c="dimmed" mb="md" ta="center">
                                Dùng đúng tài khoản đã ghi trong `credentials.json` để đăng nhập nhanh.
                            </Text>
                            {devLoginLoadError && (
                                <Alert icon={<IconAlertCircle size="1rem" />} color="red" radius="xs" mb="md">
                                    {devLoginLoadError}
                                </Alert>
                            )}
                            <Stack gap="xs">
                                {devLoginAccounts.map((profile) => (
                                    <Button
                                        key={profile.email}
                                        fullWidth
                                        radius="xs"
                                        size="xs"
                                        variant="light"
                                        color={String(profile.role).toLowerCase() === 'admin' ? 'red' : String(profile.role).toLowerCase() === 'lecturer' ? 'indigo' : 'teal'}
                                        onClick={() => handleDevBypassLogin(profile)}
                                        loading={loading}
                                        style={{ justifyContent: 'flex-start', height: 'auto', paddingBlock: 10 }}
                                    >
                                        <Stack gap={0} align="flex-start">
                                            <Text size="xs" fw={700} style={{ lineHeight: 1.2 }}>
                                                {profile.name}
                                            </Text>
                                            <Text size="10px" c="dimmed" style={{ lineHeight: 1.2 }}>
                                                {profile.email}
                                            </Text>
                                        </Stack>
                                    </Button>
                                ))}
                                {devLoginAccounts.length === 0 && !devLoginLoadError && (
                                    <Text size="xs" c="dimmed" ta="center" py="xs">
                                        Đang tải danh sách tài khoản nhanh...
                                    </Text>
                                )}
                            </Stack>
                        </Paper>
                    </Collapse>
                </Stack>
            </Paper>
        </Center>
    );
}
