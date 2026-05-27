'use client';

import { useState } from 'react';
import { Group, Text, Box, Button } from '@mantine/core';
import { Dropzone, PDF_MIME_TYPE, MS_WORD_MIME_TYPE, MS_POWERPOINT_MIME_TYPE } from '@mantine/dropzone';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Upload, FileText, X, Loader2 } from 'lucide-react';

interface DocumentUploadFormProps {
    courseId: string;
}

export function DocumentUploadForm({ courseId }: DocumentUploadFormProps) {
    const [file, setFile] = useState<File | null>(null);
    const queryClient = useQueryClient();

    const uploadMutation = useMutation({
        mutationFn: (f: File) => api.uploadDocument(courseId, f),
        onSuccess: () => {
            setFile(null); // Reset form sau khi upload thành công
            // Yêu cầu React Query gọi lại API lấy danh sách tài liệu mới nhất
            queryClient.invalidateQueries({ queryKey: ['documents', courseId] });
        },
        onError: (error: any) => {
            alert(`Lỗi khi tải lên: ${error.message}`);
        }
    });

    const handleUpload = () => {
        if (file) uploadMutation.mutate(file);
    };

    return (
        <Box className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6">
            <Dropzone
                onDrop={(files) => setFile(files[0])}
                onReject={() => alert('File không hợp lệ hoặc vượt quá 50MB')}
                maxSize={50 * 1024 ** 2} // 50MB theo chuẩn SRS [cite: 138]
                accept={[...PDF_MIME_TYPE, ...MS_WORD_MIME_TYPE, ...MS_POWERPOINT_MIME_TYPE]}
                maxFiles={1}
                radius="md"
                className="bg-zinc-950/50 border-2 border-dashed border-zinc-700 hover:border-indigo-500 hover:bg-indigo-500/5 transition-all"
            >
                <Group justify="center" gap="xl" mih={180} style={{ pointerEvents: 'none' }}>
                    <Dropzone.Accept>
                        <Upload className="w-12 h-12 text-indigo-500" />
                    </Dropzone.Accept>
                    <Dropzone.Reject>
                        <X className="w-12 h-12 text-red-500" />
                    </Dropzone.Reject>
                    <Dropzone.Idle>
                        <FileText className="w-12 h-12 text-zinc-500" />
                    </Dropzone.Idle>

                    <div className="text-center">
                        <Text size="lg" inline className="text-zinc-200 font-semibold mb-2">
                            Kéo thả tài liệu bài giảng vào đây
                        </Text>
                        <Text size="sm" inline className="text-zinc-500">
                            Hoặc click để chọn file (PDF, DOCX, PPTX). Tối đa 50MB.
                        </Text>
                    </div>
                </Group>
            </Dropzone>

            {file && (
                <Group justify="space-between" mt="md" className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <Group gap="sm">
                        <FileText className="w-5 h-5 text-indigo-400" />
                        <Text size="sm" className="text-zinc-300 font-medium">
                            {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </Text>
                    </Group>
                    <Button
                        color="brandBlue"
                        radius="xs"
                        onClick={handleUpload}
                        disabled={uploadMutation.isPending}
                        leftSection={uploadMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    >
                        {uploadMutation.isPending ? 'Đang xử lý...' : 'Bắt đầu nạp tài liệu'}
                    </Button>
                </Group>
            )}
        </Box>
    );
}