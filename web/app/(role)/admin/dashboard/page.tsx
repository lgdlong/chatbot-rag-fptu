'use client';

import { useState } from 'react';
import { Card, Text, SimpleGrid, Title, Table, Button, Group, Tabs, TextInput, Select, PasswordInput, Badge, Box, Stack, Loader } from '@mantine/core';
import { 
    IconShield, 
    IconUsers, 
    IconServer, 
    IconCurrencyDollar, 
    IconUserPlus, 
    IconUserCheck, 
    IconLayoutDashboard
} from '@tabler/icons-react';
import { useForm } from '@tanstack/react-form';

export default function AdminDashboard() {
    const [isCreating, setIsCreating] = useState(false);

    // Mock data danh sách duyệt Giảng viên
    const [pendingRequests, setPendingRequests] = useState([
        { id: "req1", name: "Dr. Lê Văn B", email: "blv@fpt.edu.vn", reason: "Giảng dạy bộ môn Kỹ nghệ phần mềm Kỳ 5" },
        { id: "req2", name: "ThS. Nguyễn Thị C", email: "cnt@fpt.edu.vn", reason: "Phụ trách môn Design Patterns" },
    ]);

    // Xử lý duyệt giảng viên giả lập
    const handleApprove = (id: string) => {
        setPendingRequests(pendingRequests.filter(req => req.id !== id));
        alert("Đã phê duyệt và gửi email cấp tài khoản cho Giảng viên!");
    };

    const handleReject = (id: string) => {
        setPendingRequests(pendingRequests.filter(req => req.id !== id));
        alert("Đã từ chối yêu cầu.");
    };

    // TanStack Form cho cấp phát tài khoản
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
                alert(`Cấp phát tài khoản ${value.role.toUpperCase()} thành công!\nHọ tên: ${value.name}\nEmail: ${value.email}`);
                formApi.reset();
            }, 1000);
        },
    });

    return (
        <Box style={{ minHeight: 'calc(100vh - 60px)', position: 'relative', overflow: 'hidden', backgroundColor: '#09090b' }}>
            {/* Hiệu ứng ánh sáng nền giống trang Giảng viên */}
            <Box style={{ position: 'absolute', top: '-10%', right: '-10%', width: 400, height: 400, borderRadius: '9999px', backgroundColor: 'rgba(99, 102, 241, 0.04)', filter: 'blur(120px)', pointerEvents: 'none' }} />
            <Box style={{ position: 'absolute', bottom: '-10%', left: '-15%', width: 500, height: 500, borderRadius: '9999px', backgroundColor: 'rgba(124, 58, 237, 0.04)', filter: 'blur(140px)', pointerEvents: 'none' }} />

            {/* Nội dung chính bọc trong relative z-10 để nổi lên trên ánh sáng */}
            <Box style={{ position: 'relative', zIndex: 10, padding: 32, maxWidth: 1200, margin: '0 auto' }}>
                <Box style={{ marginBottom: 32 }}>
                    <Title order={2} style={{ color: 'var(--mantine-color-zinc-0)', fontWeight: 700 }}>Hệ thống Quản trị (Admin Portal)</Title>
                    <Text size="sm" c="dimmed" mt={4}>Giám sát hạ tầng, quản lý phân quyền và phê duyệt tài khoản.</Text>
                </Box>

                <Tabs defaultValue="overview" color="indigo" radius="xs" variant="outline">
                    <Tabs.List style={{ borderColor: '#27272a', marginBottom: 24 }}>
                        <Tabs.Tab value="overview" leftSection={<IconLayoutDashboard size={16} />} style={{ transition: 'background-color 0.2s' }}>
                            Tổng quan Hệ thống
                        </Tabs.Tab>
                        <Tabs.Tab
                            value="approvals"
                            leftSection={<IconUserCheck size={16} />}
                            rightSection={
                                pendingRequests.length > 0 ? (
                                    <Badge w={20} h={20} variant="filled" size="sm" color="red" p={0} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {pendingRequests.length}
                                    </Badge>
                                ) : null
                            }
                            style={{ transition: 'background-color 0.2s' }}
                        >
                            Duyệt Giảng viên
                        </Tabs.Tab>
                        <Tabs.Tab value="provisioning" leftSection={<IconUserPlus size={16} />} style={{ transition: 'background-color 0.2s' }}>
                            Cấp phát Tài khoản
                        </Tabs.Tab>
                    </Tabs.List>

                    {/* TAB 1: TỔNG QUAN */}
                    <Tabs.Panel value="overview">
                        <SimpleGrid cols={{ base: 1, sm: 4 }} spacing="md">
                            <Card bg="zinc.900/40" withBorder style={{ borderColor: '#27272a', backdropFilter: 'blur(12px)' }} radius="xs" p="md">
                                <IconShield size={20} color="var(--mantine-color-indigo-4)" style={{ marginBottom: 8 }} />
                                <Text size="xs" c="dimmed" fw={700}>TỔNG SỐ TENANT</Text>
                                <Text size="xl" fw={700} mt={4} style={{ color: 'var(--mantine-color-zinc-2)' }}>3 Trường học</Text>
                            </Card>
                            <Card bg="zinc.900/40" withBorder style={{ borderColor: '#27272a', backdropFilter: 'blur(12px)' }} radius="xs" p="md">
                                <IconUsers size={20} color="var(--mantine-color-teal-4)" style={{ marginBottom: 8 }} />
                                <Text size="xs" c="dimmed" fw={700}>NGƯỜI DÙNG HOẠT ĐỘNG</Text>
                                <Text size="xl" fw={700} mt={4} style={{ color: 'var(--mantine-color-zinc-2)' }}>1,240 Học viên</Text>
                            </Card>
                            <Card bg="zinc.900/40" withBorder style={{ borderColor: '#27272a', backdropFilter: 'blur(12px)' }} radius="xs" p="md">
                                <IconServer size={20} color="var(--mantine-color-amber-4)" style={{ marginBottom: 8 }} />
                                <Text size="xs" c="dimmed" fw={700}>MÔ HÌNH EMBEDDING</Text>
                                <Text size="sm" fw={600} mt={8} style={{ color: 'var(--mantine-color-amber-3)' }}>bge-vi-base + Gemini</Text>
                            </Card>
                            <Card bg="zinc.900/40" withBorder style={{ borderColor: '#27272a', backdropFilter: 'blur(12px)' }} radius="xs" p="md">
                                <IconCurrencyDollar size={20} color="var(--mantine-color-red-4)" style={{ marginBottom: 8 }} />
                                <Text size="xs" c="dimmed" fw={700}>CHI PHÍ API THÁNG NÀY</Text>
                                <Text size="xl" fw={700} mt={4} style={{ color: 'var(--mantine-color-zinc-2)' }}>$42.50</Text>
                            </Card>
                        </SimpleGrid>
                    </Tabs.Panel>

                    {/* TAB 2: DUYỆT YÊU CẦU GIẢNG VIÊN */}
                    <Tabs.Panel value="approvals">
                        <Card bg="zinc.900/40" withBorder style={{ borderColor: '#27272a', backdropFilter: 'blur(12px)' }} radius="xs" p="lg">
                            <Box style={{ marginBottom: 16 }}>
                                <Title order={4} style={{ color: 'var(--mantine-color-zinc-2)' }}>Yêu cầu đăng ký tài khoản Giảng viên chờ duyệt</Title>
                                <Text size="xs" c="dimmed" mt={4}>Kiểm tra thông tin trước khi cấp quyền upload tài liệu RAG.</Text>
                            </Box>

                            {pendingRequests.length === 0 ? (
                                <Box style={{ textAlign: 'center', padding: '48px 0', color: 'var(--mantine-color-zinc-5)', border: '1px dashed #27272a', borderRadius: 'var(--mantine-radius-xs)' }}>
                                    Không có yêu cầu đăng ký nào đang chờ duyệt.
                                </Box>
                            ) : (
                                <Table verticalSpacing="sm">
                                    <Table.Thead>
                                        <Table.Tr style={{ borderColor: '#27272a' }}>
                                            <Table.Th style={{ color: 'var(--mantine-color-zinc-4)', borderColor: '#27272a' }}>Họ và tên</Table.Th>
                                            <Table.Th style={{ color: 'var(--mantine-color-zinc-4)', borderColor: '#27272a' }}>Email FPTU</Table.Th>
                                            <Table.Th style={{ color: 'var(--mantine-color-zinc-4)', borderColor: '#27272a' }}>Lý do / Bộ môn</Table.Th>
                                            <Table.Th style={{ color: 'var(--mantine-color-zinc-4)', borderColor: '#27272a', textAlign: 'right' }}>Thao tác</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {pendingRequests.map((req) => (
                                            <Table.Tr key={req.id} style={{ borderColor: '#27272a' }}>
                                                <Table.Td style={{ fontWeight: 500, color: 'var(--mantine-color-zinc-2)', borderColor: '#27272a' }}>{req.name}</Table.Td>
                                                <Table.Td style={{ fontFamily: 'var(--mantine-font-family-mono)', fontSize: 'var(--mantine-font-size-xs)', color: 'var(--mantine-color-zinc-4)', borderColor: '#27272a' }}>{req.email}</Table.Td>
                                                <Table.Td style={{ fontSize: 'var(--mantine-font-size-xs)', color: 'var(--mantine-color-zinc-4)', borderColor: '#27272a' }}>{req.reason}</Table.Td>
                                                <Table.Td style={{ borderColor: '#27272a', textAlign: 'right' }}>
                                                    <Group gap="xs" justify="flex-end">
                                                        <Button size="xs" color="teal" radius="xs" onClick={() => handleApprove(req.id)}>
                                                            Phê duyệt
                                                        </Button>
                                                        <Button size="xs" color="red" variant="light" radius="xs" onClick={() => handleReject(req.id)}>
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
                    </Tabs.Panel>

                    {/* TAB 3: CẤP PHÁT TÀI KHOẢN TAY */}
                    <Tabs.Panel value="provisioning">
                        <Box style={{ maxWidth: 600 }}>
                            <Card bg="zinc.900/40" withBorder style={{ borderColor: '#27272a', backdropFilter: 'blur(12px)' }} radius="xs" p="xl">
                                <Box style={{ marginBottom: 24 }}>
                                    <Title order={4} style={{ color: 'var(--mantine-color-zinc-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <IconUserPlus size={20} color="var(--mantine-color-indigo-4)" />
                                        Cấp phát tài khoản mới
                                    </Title>
                                    <Text size="xs" c="dimmed" mt={4}>
                                        Tạo trực tiếp tài khoản cho Sinh viên, Giảng viên hoặc Admin khác bỏ qua bước đăng ký.
                                    </Text>
                                </Box>

                                <form 
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        adminForm.handleSubmit();
                                    }}
                                >
                                    <Stack gap="md">
                                        <adminForm.Field
                                            name="role"
                                            validators={{
                                                onChange: ({ value }) => !value ? 'Loại tài khoản là bắt buộc' : undefined,
                                            }}
                                        >
                                            {(field) => (
                                                <Select
                                                    label="Loại tài khoản (Role)"
                                                    placeholder="Chọn quyền truy cập"
                                                    data={[
                                                        { value: 'student', label: 'Sinh viên (Student)' },
                                                        { value: 'lecturer', label: 'Giảng viên (Lecturer)' },
                                                        { value: 'admin', label: 'Quản trị viên (Admin)' },
                                                    ]}
                                                    required
                                                    radius="xs"
                                                    value={field.state.value}
                                                    onChange={(val) => field.handleChange(val || 'student')}
                                                    onBlur={field.handleBlur}
                                                    error={field.state.meta.isTouched && field.state.meta.errors.length ? field.state.meta.errors.join(', ') : null}
                                                    styles={{
                                                        label: { color: '#a1a1aa', marginBottom: 5 },
                                                        input: { backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#f4f4f5' }
                                                    }}
                                                />
                                            )}
                                        </adminForm.Field>

                                        <adminForm.Field
                                            name="name"
                                            validators={{
                                                onChange: ({ value }) => {
                                                    if (!value) return 'Họ và tên là bắt buộc';
                                                    if (value.length < 2) return 'Họ và tên tối thiểu phải từ 2 ký tự';
                                                    return undefined;
                                                },
                                            }}
                                        >
                                            {(field) => (
                                                <TextInput
                                                    label="Họ và tên"
                                                    placeholder="Nhập tên người dùng..."
                                                    required
                                                    radius="xs"
                                                    value={field.state.value}
                                                    onChange={(e) => field.handleChange(e.target.value)}
                                                    onBlur={field.handleBlur}
                                                    error={field.state.meta.isTouched && field.state.meta.errors.length ? field.state.meta.errors.join(', ') : null}
                                                    styles={{
                                                        label: { color: '#a1a1aa', marginBottom: 5 },
                                                        input: { backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#f4f4f5' }
                                                    }}
                                                />
                                            )}
                                        </adminForm.Field>

                                        <adminForm.Field
                                            name="email"
                                            validators={{
                                                onChange: ({ value }) => {
                                                    if (!value) return 'Địa chỉ Email là bắt buộc';
                                                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Địa chỉ Email không hợp lệ';
                                                    return undefined;
                                                },
                                            }}
                                        >
                                            {(field) => (
                                                <TextInput
                                                    label="Địa chỉ Email"
                                                    placeholder="email@fpt.edu.vn"
                                                    type="email"
                                                    required
                                                    radius="xs"
                                                    value={field.state.value}
                                                    onChange={(e) => field.handleChange(e.target.value)}
                                                    onBlur={field.handleBlur}
                                                    error={field.state.meta.isTouched && field.state.meta.errors.length ? field.state.meta.errors.join(', ') : null}
                                                    styles={{
                                                        label: { color: '#a1a1aa', marginBottom: 5 },
                                                        input: { backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#f4f4f5' }
                                                    }}
                                                />
                                            )}
                                        </adminForm.Field>

                                        <adminForm.Field
                                            name="password"
                                            validators={{
                                                onChange: ({ value }) => {
                                                    if (!value) return 'Mật khẩu khởi tạo là bắt buộc';
                                                    if (value.length < 6) return 'Mật khẩu tối thiểu phải từ 6 ký tự';
                                                    return undefined;
                                                },
                                            }}
                                        >
                                            {(field) => (
                                                <PasswordInput
                                                    label="Mật khẩu khởi tạo"
                                                    placeholder="Nhập mật khẩu tạm thời..."
                                                    required
                                                    radius="xs"
                                                    value={field.state.value}
                                                    onChange={(e) => field.handleChange(e.target.value)}
                                                    onBlur={field.handleBlur}
                                                    error={field.state.meta.isTouched && field.state.meta.errors.length ? field.state.meta.errors.join(', ') : null}
                                                    styles={{
                                                        label: { color: '#a1a1aa', marginBottom: 5 },
                                                        input: { backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#f4f4f5' }
                                                    }}
                                                />
                                            )}
                                        </adminForm.Field>

                                        <adminForm.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
                                            {([canSubmit, isSubmitting]) => (
                                                <Button
                                                    type="submit"
                                                    color="indigo"
                                                    fullWidth
                                                    radius="xs"
                                                    mt="md"
                                                    disabled={!canSubmit || isCreating || isSubmitting}
                                                    leftSection={isCreating || isSubmitting ? <Loader size="xs" color="white" /> : null}
                                                >
                                                    {isCreating || isSubmitting ? "Đang tạo..." : "Tạo tài khoản"}
                                                </Button>
                                            )}
                                        </adminForm.Subscribe>
                                    </Stack>
                                </form>
                            </Card>
                        </Box>
                    </Tabs.Panel>
                </Tabs>
            </Box>
        </Box>
    );
}
