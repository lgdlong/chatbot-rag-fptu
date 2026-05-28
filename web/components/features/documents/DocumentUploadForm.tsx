'use client';

import { useRef, useState } from 'react';
import { Button, FileButton, Group, Paper, Stack, Text } from '@mantine/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { IconFileTypePdf, IconUpload, IconTrash } from '@tabler/icons-react';
import { api } from '@/lib/api';

interface DocumentUploadFormProps {
    courseId: string;
    courseName?: string;
}

export function DocumentUploadForm({ courseId, courseName }: DocumentUploadFormProps) {
    const [file, setFile] = useState<File | null>(null);
    const resetRef = useRef<() => void>(null);
    const queryClient = useQueryClient();

    const clearFile = () => {
        setFile(null);
        resetRef.current?.();
    };

    const uploadMutation = useMutation({
        mutationFn: (selectedFile: File) => api.uploadDocument(courseId, selectedFile),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['documents', courseId] });
            queryClient.invalidateQueries({ queryKey: ['courses'] });
            notifications.show({
                color: 'teal',
                title: 'Đã gửi tài liệu',
                message: 'Tài liệu đã được đưa vào hàng đợi xử lý.',
            });
            clearFile();
        },
        onError: (error: Error) => {
            notifications.show({
                color: 'red',
                title: 'Tải tài liệu thất bại',
                message: error.message,
            });
        },
    });

    return (
        <Stack gap="sm">
            <Paper withBorder radius="md" p="md" bg="var(--mantine-color-dark-8)">
                <Stack gap="xs">
                    <Group justify="space-between" align="flex-start">
                        <div>
                            <Text fw={700} c="gray.0">
                                Tải tài liệu PDF
                            </Text>
                            <Text size="xs" c="dimmed" mt={4}>
                                {courseName ? `Môn hiện tại: ${courseName}` : 'Chọn một môn học để tải tài liệu.'}
                            </Text>
                        </div>

                        <IconFileTypePdf size={22} color="var(--mantine-color-red-4)" />
                    </Group>

                    <Text size="xs" c="dimmed">
                        Hệ thống chỉ nhận file PDF để đảm bảo luồng xử lý chunking và ingestion ổn định.
                    </Text>
                </Stack>
            </Paper>

            <Paper withBorder radius="md" p="md" bg="var(--mantine-color-dark-8)">
                <Stack gap="md">
                    <FileButton resetRef={resetRef} onChange={setFile} accept="application/pdf">
                        {(props) => (
                            <Button {...props} leftSection={<IconUpload size={16} />} variant="light" fullWidth>
                                Chọn file PDF
                            </Button>
                        )}
                    </FileButton>

                    {file ? (
                        <Paper withBorder radius="md" p="sm" bg="var(--mantine-color-dark-9)">
                            <Group justify="space-between" gap="sm">
                                <div>
                                    <Text size="sm" fw={600} c="gray.0" lineClamp={1}>
                                        {file.name}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </Text>
                                </div>

                                <Button
                                    variant="light"
                                    color="red"
                                    size="xs"
                                    leftSection={<IconTrash size={14} />}
                                    onClick={clearFile}
                                >
                                    Xóa
                                </Button>
                            </Group>
                        </Paper>
                    ) : (
                        <Text size="xs" c="dimmed">
                            Chưa chọn file nào.
                        </Text>
                    )}

                    <Button
                        onClick={() => file && uploadMutation.mutate(file)}
                        disabled={!file}
                        loading={uploadMutation.isPending}
                        loaderProps={{ type: 'dots' }}
                        fullWidth
                    >
                        Nạp tài liệu vào môn học
                    </Button>
                </Stack>
            </Paper>
        </Stack>
    );
}
