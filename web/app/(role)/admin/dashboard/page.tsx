'use client';

import { useState } from 'react';
import { Card, Text, SimpleGrid, Title, Table, Button, Group, Tabs, TextInput, Select, PasswordInput, Badge } from '@mantine/core';
import { Shield, Users, Server, DollarSign, UserPlus, UserCheck, LayoutDashboard, Loader2 } from 'lucide-react';

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

    // Xử lý submit form tạo tài khoản thủ công
    const handleCreateAccount = (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        setTimeout(() => {
            setIsCreating(false);
            alert("Cấp phát tài khoản thành công!");
        }, 1000);
    };

    return (
        <div className="min-h-[calc(100vh-60px)] relative overflow-hidden bg-zinc-950 font-sans text-zinc-100">
            {/* Hiệu ứng ánh sáng nền giống trang Giảng viên */}
            <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-15%] w-[500px] h-[500px] rounded-full bg-violet-600/5 blur-[140px] pointer-events-none" />

            {/* Nội dung chính bọc trong relative z-10 để nổi lên trên ánh sáng */}
            <div className="relative z-10 p-8 max-w-6xl mx-auto">
                <div className="mb-8">
                    <Title order={2} className="text-zinc-50">Hệ thống Quản trị (Admin Portal)</Title>
                    <Text size="sm" c="dimmed" mt={4}>Giám sát hạ tầng, quản lý phân quyền và phê duyệt tài khoản.</Text>
                </div>

                <Tabs defaultValue="overview" color="indigo" radius="xs" variant="outline">
                    <Tabs.List className="border-zinc-800 mb-6">
                        <Tabs.Tab value="overview" leftSection={<LayoutDashboard className="w-4 h-4" />} className="hover:bg-zinc-800/50">
                            Tổng quan Hệ thống
                        </Tabs.Tab>
                        <Tabs.Tab
                            value="approvals"
                            leftSection={<UserCheck className="w-4 h-4" />}
                            rightSection={
                                pendingRequests.length > 0 ? (
                                    <Badge w={20} h={20} variant="filled" size="sm" color="red" p={0} className="flex items-center justify-center">
                                        {pendingRequests.length}
                                    </Badge>
                                ) : null
                            }
                            className="hover:bg-zinc-800/50"
                        >
                            Duyệt Giảng viên
                        </Tabs.Tab>
                        <Tabs.Tab value="provisioning" leftSection={<UserPlus className="w-4 h-4" />} className="hover:bg-zinc-800/50">
                            Cấp phát Tài khoản
                        </Tabs.Tab>
                    </Tabs.List>

                    {/* TAB 1: TỔNG QUAN */}
                    <Tabs.Panel value="overview">
                        <SimpleGrid cols={{ base: 1, sm: 4 }} spacing="md">
                            <Card bg="zinc.900/50" withBorder className="border-zinc-800" radius="md" p="md">
                                <Shield className="w-5 h-5 text-indigo-400 mb-2" />
                                <Text size="xs" c="dimmed" fw={700}>TỔNG SỐ TENANT</Text>
                                <Text size="xl" fw={700} mt={4} className="text-zinc-200">3 Trường học</Text>
                            </Card>
                            <Card bg="zinc.900/50" withBorder className="border-zinc-800" radius="md" p="md">
                                <Users className="w-5 h-5 text-emerald-400 mb-2" />
                                <Text size="xs" c="dimmed" fw={700}>NGƯỜI DÙNG HOẠT ĐỘNG</Text>
                                <Text size="xl" fw={700} mt={4} className="text-zinc-200">1,240 Học viên</Text>
                            </Card>
                            <Card bg="zinc.900/50" withBorder className="border-zinc-800" radius="md" p="md">
                                <Server className="w-5 h-5 text-amber-400 mb-2" />
                                <Text size="xs" c="dimmed" fw={700}>MÔ HÌNH EMBEDDING</Text>
                                <Text size="sm" fw={600} mt={8} className="text-amber-300">bge-vi-base + Gemini</Text>
                            </Card>
                            <Card bg="zinc.900/50" withBorder className="border-zinc-800" radius="md" p="md">
                                <DollarSign className="w-5 h-5 text-red-400 mb-2" />
                                <Text size="xs" c="dimmed" fw={700}>CHI PHÍ API THÁNG NÀY</Text>
                                <Text size="xl" fw={700} mt={4} className="text-zinc-200">$42.50</Text>
                            </Card>
                        </SimpleGrid>
                    </Tabs.Panel>

                    {/* TAB 2: DUYỆT YÊU CẦU GIẢNG VIÊN */}
                    <Tabs.Panel value="approvals">
                        <Card bg="zinc.900/50" withBorder className="border-zinc-800" radius="md" p="lg">
                            <div className="mb-4">
                                <Title order={4} className="text-zinc-200">Yêu cầu đăng ký tài khoản Giảng viên chờ duyệt</Title>
                                <Text size="xs" c="dimmed">Kiểm tra thông tin trước khi cấp quyền upload tài liệu RAG.</Text>
                            </div>

                            {pendingRequests.length === 0 ? (
                                <div className="text-center py-12 text-zinc-500 text-sm border border-dashed border-zinc-800 rounded-lg">
                                    Không có yêu cầu đăng ký nào đang chờ duyệt.
                                </div>
                            ) : (
                                <Table verticalSpacing="sm">
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th className="text-zinc-400 border-zinc-800">Họ và tên</Table.Th>
                                            <Table.Th className="text-zinc-400 border-zinc-800">Email FPTU</Table.Th>
                                            <Table.Th className="text-zinc-400 border-zinc-800">Lý do / Bộ môn</Table.Th>
                                            <Table.Th className="text-zinc-400 border-zinc-800 text-right">Thao tác</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {pendingRequests.map((req) => (
                                            <Table.Tr key={req.id} className="border-zinc-800 hover:bg-zinc-800/30">
                                                <Table.Td className="font-medium text-zinc-200">{req.name}</Table.Td>
                                                <Table.Td className="font-mono text-xs text-zinc-400">{req.email}</Table.Td>
                                                <Table.Td className="text-xs text-zinc-400">{req.reason}</Table.Td>
                                                <Table.Td align="right">
                                                    <Group gap="xs" justify="flex-end">
                                                        <Button size="xs" color="teal" radius="xl" onClick={() => handleApprove(req.id)}>
                                                            Phê duyệt
                                                        </Button>
                                                        <Button size="xs" color="red" variant="subtle" radius="xl" onClick={() => handleReject(req.id)}>
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
                        <div className="max-w-2xl">
                            <Card bg="zinc.900/50" withBorder className="border-zinc-800" radius="md" p="xl">
                                <div className="mb-6">
                                    <Title order={4} className="text-zinc-200 flex items-center gap-2">
                                        <UserPlus className="w-5 h-5 text-indigo-400" />
                                        Cấp phát tài khoản mới
                                    </Title>
                                    <Text size="xs" c="dimmed" mt={1}>
                                        Tạo trực tiếp tài khoản cho Sinh viên, Giảng viên hoặc Admin khác bỏ qua bước đăng ký.
                                    </Text>
                                </div>

                                <form onSubmit={handleCreateAccount} className="space-y-5">
                                    <Select
                                        label="Loại tài khoản (Role)"
                                        placeholder="Chọn quyền truy cập"
                                        data={[
                                            { value: 'student', label: 'Sinh viên (Student)' },
                                            { value: 'lecturer', label: 'Giảng viên (Lecturer)' },
                                            { value: 'admin', label: 'Quản trị viên (Admin)' },
                                        ]}
                                        required
                                        radius="md"
                                        styles={{
                                            label: { color: '#a1a1aa', marginBottom: 5 },
                                            input: { backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#f4f4f5' }
                                        }}
                                    />

                                    <TextInput
                                        label="Họ và tên"
                                        placeholder="Nhập tên người dùng..."
                                        required
                                        radius="md"
                                        styles={{
                                            label: { color: '#a1a1aa', marginBottom: 5 },
                                            input: { backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#f4f4f5' }
                                        }}
                                    />

                                    <TextInput
                                        label="Địa chỉ Email"
                                        placeholder="email@fpt.edu.vn"
                                        type="email"
                                        required
                                        radius="md"
                                        styles={{
                                            label: { color: '#a1a1aa', marginBottom: 5 },
                                            input: { backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#f4f4f5' }
                                        }}
                                    />

                                    <PasswordInput
                                        label="Mật khẩu khởi tạo"
                                        placeholder="Nhập mật khẩu tạm thời..."
                                        required
                                        radius="md"
                                        styles={{
                                            label: { color: '#a1a1aa', marginBottom: 5 },
                                            input: { backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#f4f4f5' }
                                        }}
                                    />

                                    <Button
                                        type="submit"
                                        color="indigo"
                                        fullWidth
                                        radius="md"
                                        mt="md"
                                        disabled={isCreating}
                                    >
                                        {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Tạo tài khoản"}
                                    </Button>
                                </form>
                            </Card>
                        </div>
                    </Tabs.Panel>
                </Tabs>
            </div>
        </div>
    );
}