'use client';

import { useState } from 'react';
import { Button, Center, Divider, Paper, PasswordInput, Text, TextInput, Title, Alert, Select, Stack, Collapse } from '@mantine/core';
import { IconBrandGoogle, IconAlertCircle, IconCode } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    
    // Quick Dev Bypass
    const [opened, { toggle }] = useDisclosure(false);
    const [selectedRole, setSelectedRole] = useState<string | null>('student');

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        try {
            const res = await api.login(email, password);
            if (res.user) {
                // Chuyển hướng người dùng dựa theo vai trò (role) của họ
                const userRole = res.user.role?.toLowerCase() || 'student';
                if (userRole === 'lecturer') {
                    router.push('/lecturer/courses');
                } else if (userRole === 'admin') {
                    router.push('/admin/dashboard');
                } else {
                    router.push('/student/chat');
                }
            } else {
                setError("Đăng nhập thất bại. Vui lòng kiểm tra thông tin.");
            }
        } catch (err: any) {
            console.error("Login error:", err);
            setError(err.message || "Không thể kết nối đến máy chủ API.");
        } finally {
            setLoading(false);
        }
    };

    const handleDevBypassLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const role = (selectedRole as 'student' | 'lecturer' | 'admin') || 'student';
            const res = await api.devLogin(role);
            if (res.success) {
                if (role === 'lecturer') {
                    router.push('/lecturer/courses');
                } else if (role === 'admin') {
                    router.push('/admin/dashboard');
                } else {
                    router.push('/student/chat');
                }
            } else {
                setError("Dev login failed.");
            }
        } catch (err: any) {
            setError(err.message || "Lỗi bypass đăng nhập.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Center style={{ flex: 1, minHeight: '100vh' }}>
            <Paper radius="xs" p="xl" withBorder w="100%" maw={400} bg="zinc.900">
                <Title order={2} ta="center" mt="md" mb="xs">
                    RAG Chatbot
                </Title>
                <Text c="dimmed" size="sm" ta="center" mb="xl">
                    Đăng nhập để tiếp tục tra cứu tài liệu
                </Text>

                {error && (
                    <Alert icon={<IconAlertCircle size="1rem" />} title="Lỗi đăng nhập" color="red" radius="xs" mb="lg">
                        {error}
                    </Alert>
                )}

                <Button
                    fullWidth
                    leftSection={<IconBrandGoogle size="1.2rem" />}
                    variant="default"
                    radius="xs"
                    color="gray"
                    mb="lg"
                    onClick={() => {
                        // Demo OAuth chuyển trang hoặc báo thông báo
                        alert("Đăng nhập bằng Google đang chuyển hướng qua Google OAuth của Better Auth...");
                        window.location.href = "http://localhost:8000/api/auth/login/google";
                    }}
                >
                    Đăng nhập với Google
                </Button>

                <Divider label="Hoặc đăng nhập bằng Email" labelPosition="center" my="lg" />

                <form onSubmit={handleEmailLogin}>
                    <TextInput
                        label="Email"
                        placeholder="student@fpt.edu.vn"
                        required
                        radius="xs"
                        mb="md"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                    />
                    <PasswordInput
                        label="Mật khẩu"
                        placeholder="Nhập mật khẩu của bạn"
                        required
                        radius="xs"
                        mb="xl"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                    />

                    <Button fullWidth radius="xs" color="brandBlue" type="submit" loading={loading}>
                        Đăng nhập
                    </Button>
                </form>

                {/* Phần hỗ trợ Dev Bypass nhanh trong quá trình phát triển */}
                <Stack mt="xl" gap="xs">
                    <Button 
                        variant="subtle" 
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
                                Tự động tạo và đính kèm Session Cookie của Better Auth chuẩn trên cổng 8000.
                            </Text>
                            <Select
                                label="Chọn vai trò thử nghiệm"
                                placeholder="Chọn vai trò"
                                data={[
                                    { value: 'student', label: 'Sinh viên (STUDENT)' },
                                    { value: 'lecturer', label: 'Giảng viên (LECTURER)' },
                                    { value: 'admin', label: 'Quản trị viên (ADMIN)' }
                                ]}
                                value={selectedRole}
                                onChange={setSelectedRole}
                                mb="md"
                                size="xs"
                                radius="xs"
                            />
                            <Button 
                                fullWidth 
                                color="indigo" 
                                size="xs" 
                                radius="xs"
                                onClick={handleDevBypassLogin}
                                loading={loading}
                            >
                                Bypass & Đăng nhập ngay
                            </Button>
                        </Paper>
                    </Collapse>
                </Stack>
            </Paper>
        </Center>
    );
}