'use client';

import { Box, Button, Center, Divider, Group, Paper, PasswordInput, Text, TextInput, Title } from '@mantine/core';
import { IconBrandGoogle } from '@tabler/icons-react';
import Link from 'next/link';

export default function LoginPage() {
    return (
        <Center style={{ flex: 1, minHeight: '100vh' }}>
            <Paper radius="xs" p="xl" withBorder w="100%" maw={400} bg="zinc.900">
                <Title order={2} ta="center" mt="md" mb="xs">
                    RAG Chatbot
                </Title>
                <Text c="dimmed" size="sm" ta="center" mb="xl">
                    Đăng nhập để tiếp tục tra cứu tài liệu
                </Text>

                <Group grow mb="md" mt="md">
                    <Button
                        leftSection={<IconBrandGoogle size="1.2rem" />}
                        variant="default"
                        radius="xs"
                        color="gray"
                    >
                        Đăng nhập với Google
                    </Button>
                </Group>

                <Divider label="Hoặc đăng nhập bằng Email" labelPosition="center" my="lg" />

                <form onSubmit={(e) => e.preventDefault()}>
                    <TextInput
                        label="Email"
                        placeholder="student@fpt.edu.vn"
                        required
                        radius="xs"
                        mb="md"
                    />
                    <PasswordInput
                        label="Mật khẩu"
                        placeholder="Nhập mật khẩu của bạn"
                        required
                        radius="xs"
                        mb="xl"
                    />

                    <Button fullWidth radius="xs" color="brandBlue" type="submit">
                        Đăng nhập
                    </Button>
                </form>

                <Text ta="center" mt="md" size="sm">
                    Chưa có tài khoản?{' '}
                    <Text component={Link} href="/register" c="brandBlue.4" fw={500} style={{ textDecoration: 'none' }}>
                        Đăng ký ngay
                    </Text>
                </Text>
            </Paper>
        </Center>
    );
}