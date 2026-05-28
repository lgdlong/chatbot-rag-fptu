'use client';

import { useState, type FormEvent } from 'react';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    ActionIcon,
    Alert,
    Badge,
    Box,
    Button,
    Card,
    Container,
    Grid,
    Group,
    Loader,
    Modal,
    Menu,
    Paper,
    Stack,
    Table,
    Text,
    TextInput,
    Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
    IconAlertCircle,
    IconAlertTriangle,
    IconFileText,
    IconDotsVertical,
    IconPencil,
    IconPlus,
    IconRefresh,
    IconTrash,
    IconUser,
} from '@tabler/icons-react';
import { api } from '@/lib/api';
import { DocumentUploadForm } from '@/components/features/documents/DocumentUploadForm';
import type { Course, Document } from '@/types';

function formatDate(value?: string | Date) {
    if (!value) {
        return 'Chưa có';
    }

    return new Date(value).toLocaleString('vi-VN');
}

function getDocumentStatusBadge(document: Document) {
    if (document.status === 'COMPLETED') {
        return (
            <Badge color="teal" variant="light">
                Đã sẵn sàng
            </Badge>
        );
    }

    if (document.status === 'PENDING') {
        return (
            <Badge color="yellow" variant="light" leftSection={<IconRefresh size={12} className="animate-spin" />}>
                Chờ xử lý
            </Badge>
        );
    }

    if (document.status === 'PROCESSING') {
        return (
            <Badge color="indigo" variant="light" leftSection={<Loader size={10} color="indigo" />}>
                Đang xử lý
            </Badge>
        );
    }

    return (
        <Badge color="red" variant="light" leftSection={<IconAlertTriangle size={12} />}>
            Lỗi nạp dữ liệu
        </Badge>
    );
}

export default function CoursesPage() {
    const queryClient = useQueryClient();
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
    const [courseFormOpened, courseFormHandlers] = useDisclosure(false);
    const [deleteCourseOpened, deleteCourseHandlers] = useDisclosure(false);
    const [courseFormMode, setCourseFormMode] = useState<'create' | 'edit'>('create');
    const [courseFormCourseId, setCourseFormCourseId] = useState<string | null>(null);
    const [courseCode, setCourseCode] = useState('');
    const [courseName, setCourseName] = useState('');
    const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);

    const { data: sessionData, isLoading: isSessionLoading } = useQuery({
        queryKey: ['session'],
        queryFn: () => api.getSession().catch(() => null),
        retry: false,
    });

    const isLoggedIn = Boolean(sessionData?.user);
    const role = String(sessionData?.user?.role ?? '').toLowerCase();
    const canManageCourses = role === 'lecturer' || role === 'admin';

    const loginMutation = useMutation({
        mutationFn: api.devLogin,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['session'] });
            queryClient.invalidateQueries({ queryKey: ['courses'] });
        },
    });

    const coursesQuery = useQuery({
        queryKey: ['courses'],
        queryFn: api.getCourses,
        enabled: isLoggedIn && canManageCourses,
        staleTime: 0,
    });

    const courses = coursesQuery.data?.courses ?? [];
    const activeCourseId =
        selectedCourseId && courses.some((course) => course.id === selectedCourseId)
            ? selectedCourseId
            : courses[0]?.id ?? null;
    const selectedCourse = courses.find((course) => course.id === activeCourseId) ?? null;

    const documentsQuery = useQuery({
        queryKey: ['documents', activeCourseId],
        queryFn: () => api.getDocuments(activeCourseId ?? ''),
        enabled: isLoggedIn && canManageCourses && Boolean(activeCourseId),
        refetchInterval: (query) => {
            const documents = query.state.data?.documents ?? [];
            const hasPendingDocuments = documents.some(
                (document: Document) => document.status === 'PENDING' || document.status === 'PROCESSING',
            );

            return hasPendingDocuments ? 2000 : false;
        },
    });

    const documents = documentsQuery.data?.documents ?? [];
    const isDocumentsLoading = documentsQuery.isLoading;
    const isDocumentsFetching = documentsQuery.isFetching;

    const createCourseMutation = useMutation({
        mutationFn: (payload: { code: string; name: string }) => api.createCourse(payload),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['courses'] });
            setSelectedCourseId(result.course.id);
            setCourseCode('');
            setCourseName('');
            closeCourseForm();
            notifications.show({
                color: 'teal',
                title: 'Đã thêm môn học',
                message: `${result.course.code} - ${result.course.name}`,
            });
        },
        onError: (error: Error) => {
            notifications.show({
                color: 'red',
                title: 'Không thể tạo môn học',
                message: error.message,
            });
        },
    });

    const updateCourseMutation = useMutation({
        mutationFn: ({ courseId, payload }: { courseId: string; payload: { code: string; name: string } }) =>
            api.updateCourse(courseId, payload),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['courses'] });
            setSelectedCourseId(result.course.id);
            closeCourseForm();
            notifications.show({
                color: 'teal',
                title: 'Đã cập nhật môn học',
                message: `${result.course.code} - ${result.course.name}`,
            });
        },
        onError: (error: Error) => {
            notifications.show({
                color: 'red',
                title: 'Không thể cập nhật môn học',
                message: error.message,
            });
        },
    });

    const deleteCourseMutation = useMutation({
        mutationFn: (courseId: string) => api.deleteCourse(courseId),
        onSuccess: (_data, courseId) => {
            queryClient.invalidateQueries({ queryKey: ['courses'] });
            if (selectedCourseId === courseId) {
                setSelectedCourseId(null);
            }
            setCourseToDelete(null);
            deleteCourseHandlers.close();
            notifications.show({
                color: 'teal',
                title: 'Đã xoá môn học',
                message: 'Môn học đã được xoá khỏi hệ thống.',
            });
        },
        onError: (error: Error) => {
            notifications.show({
                color: 'red',
                title: 'Không thể xoá môn học',
                message: error.message,
            });
        },
    });

    const deleteDocumentMutation = useMutation({
        mutationFn: ({ courseId, documentId }: { courseId: string; documentId: string }) =>
            api.deleteDocument(courseId, documentId),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['documents', variables.courseId] });
            queryClient.invalidateQueries({ queryKey: ['courses'] });
            notifications.show({
                color: 'teal',
                title: 'Đã xoá tài liệu',
                message: 'Tài liệu và dữ liệu chunk liên quan đã được xoá.',
            });
        },
        onError: (error: Error) => {
            notifications.show({
                color: 'red',
                title: 'Không thể xoá tài liệu',
                message: error.message,
            });
        },
    });

    const handleCreateCourse = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const payload = {
            code: courseCode.trim(),
            name: courseName.trim(),
        };

        if (courseFormMode === 'edit' && courseFormCourseId) {
            updateCourseMutation.mutate({
                courseId: courseFormCourseId,
                payload,
            });
            return;
        }

        createCourseMutation.mutate(payload);
    };

    const handleDeleteCourse = () => {
        if (!courseToDelete) {
            return;
        }

        deleteCourseMutation.mutate(courseToDelete.id);
    };

    const openCreateCourseForm = () => {
        setCourseFormMode('create');
        setCourseFormCourseId(null);
        setCourseCode('');
        setCourseName('');
        courseFormHandlers.open();
    };

    const openEditCourseForm = (course: Course) => {
        setCourseFormMode('edit');
        setCourseFormCourseId(course.id);
        setCourseCode(course.code);
        setCourseName(course.name);
        courseFormHandlers.open();
    };

    const closeCourseForm = () => {
        setCourseFormMode('create');
        setCourseFormCourseId(null);
        setCourseCode('');
        setCourseName('');
        courseFormHandlers.close();
    };

    const totalDocuments = documents.length;

    return (
        <Box
            style={{
                minHeight: '100vh',
                position: 'relative',
                overflow: 'hidden',
                background: 'linear-gradient(180deg, #050507 0%, #0b0b10 45%, #09090b 100%)',
            }}
        >
            <Box
                style={{
                    position: 'absolute',
                    inset: '10% auto auto -5%',
                    width: 360,
                    height: 360,
                    borderRadius: '9999px',
                    background: 'rgba(59, 130, 246, 0.08)',
                    filter: 'blur(110px)',
                    pointerEvents: 'none',
                }}
            />
            <Box
                style={{
                    position: 'absolute',
                    right: '-10%',
                    bottom: '-10%',
                    width: 440,
                    height: 440,
                    borderRadius: '9999px',
                    background: 'rgba(16, 185, 129, 0.06)',
                    filter: 'blur(130px)',
                    pointerEvents: 'none',
                }}
            />

            <Container size="xl" py="xl" style={{ position: 'relative', zIndex: 1 }}>
                <Stack gap="lg">
                    <Paper withBorder radius="lg" p="lg" bg="var(--mantine-color-dark-8)">
                        <Group justify="space-between" align="flex-start" gap="lg">
                            <div>
                                <Title order={2} c="gray.0">
                                    Quản lý môn học
                                </Title>
                                <Text size="sm" c="dimmed" mt={4}>
                                    Tạo môn học mới, nạp tài liệu PDF và xoá môn khi đã dọn sạch tài liệu bên trong.
                                </Text>
                            </div>

                            {isLoggedIn && sessionData?.user && (
                                <Paper withBorder radius="md" px="sm" py="xs" bg="var(--mantine-color-dark-7)">
                                    <Group gap="xs">
                                        <IconUser size={14} color="var(--mantine-color-blue-4)" />
                                        <Text size="xs" fw={600} c="gray.0">
                                            {sessionData.user.name}
                                        </Text>
                                    </Group>
                                </Paper>
                            )}
                        </Group>

                        <Group justify="space-between" mt="md" gap="md" wrap="wrap">
                            <Text size="xs" c="dimmed">
                                Dùng giao diện Mantine cho modal, bảng dữ liệu và nút thao tác để đồng bộ với hệ thống.
                            </Text>
                            <Group gap="xs">
                                <Button
                                    variant="light"
                                    leftSection={<IconPlus size={16} />}
                                    onClick={openCreateCourseForm}
                                    disabled={!canManageCourses}
                                >
                                    Thêm môn học
                                </Button>
                                <ActionIcon
                                    variant="default"
                                    size="lg"
                                    aria-label="Làm mới danh sách"
                                    onClick={() => queryClient.invalidateQueries({ queryKey: ['courses'] })}
                                    disabled={coursesQuery.isFetching}
                                >
                                    <IconRefresh size={16} className={coursesQuery.isFetching ? 'animate-spin' : ''} />
                                </ActionIcon>
                            </Group>
                        </Group>
                    </Paper>

                    {!isSessionLoading && !isLoggedIn && (
                        <Alert
                            icon={<IconAlertCircle size={16} />}
                            title="Chưa đăng nhập"
                            color="yellow"
                            variant="light"
                            radius="lg"
                        >
                            <Group justify="space-between" align="center" gap="md" wrap="wrap">
                                <Text size="sm">
                                    Hệ thống yêu cầu một phiên hợp lệ trước khi quản lý môn học.
                                </Text>
                                <Button
                                    variant="filled"
                                    color="yellow"
                                    onClick={() => loginMutation.mutate('lecturer')}
                                    loading={loginMutation.isPending}
                                >
                                    Dev Quick Login
                                </Button>
                            </Group>
                        </Alert>
                    )}

                    {isLoggedIn && !canManageCourses && (
                        <Alert
                            icon={<IconAlertCircle size={16} />}
                            title="Không đủ quyền"
                            color="red"
                            variant="light"
                            radius="lg"
                        >
                            Trang này chỉ dành cho lecturer hoặc admin.
                        </Alert>
                    )}

                    {isLoggedIn && canManageCourses && (
                        <Grid gap="lg" align="stretch">
                            <Grid.Col span={{ base: 12, lg: 4 }}>
                                <Stack gap="lg">
                                    <Card withBorder radius="lg" padding="lg" bg="var(--mantine-color-dark-8)">
                                        <Group justify="space-between" mb="md">
                                            <div>
                                                <Text fw={700} c="gray.0">
                                                    Danh sách môn học
                                                </Text>
                                                <Text size="xs" c="dimmed" mt={4}>
                                                    Chọn một môn để xem tài liệu, hoặc xoá nếu không còn tài liệu.
                                                </Text>
                                            </div>
                                            <Badge variant="light" color="blue">
                                                {courses.length} môn
                                            </Badge>
                                        </Group>

                                        {coursesQuery.isLoading ? (
                                            <Group gap="xs" py="md">
                                                <Loader size="sm" />
                                                <Text size="sm" c="dimmed">
                                                    Đang tải danh sách môn học...
                                                </Text>
                                            </Group>
                                        ) : courses.length === 0 ? (
                                            <Paper withBorder radius="md" p="md" bg="var(--mantine-color-dark-9)">
                                                <Text size="sm" c="dimmed">
                                                    Chưa có môn học nào. Hãy tạo môn học đầu tiên.
                                                </Text>
                                            </Paper>
                                        ) : (
                                            <Box style={{ overflowX: 'auto' }}>
                                                <Table highlightOnHover verticalSpacing="sm" withRowBorders={false}>
                                                    <Table.Thead>
                                                        <Table.Tr>
                                                            <Table.Th>Môn học</Table.Th>
                                                            <Table.Th>Tài liệu</Table.Th>
                                                            <Table.Th />
                                                        </Table.Tr>
                                                    </Table.Thead>
                                                    <Table.Tbody>
                                                        {courses.map((course) => {
                                                            const isSelected = course.id === activeCourseId;
                                                            const documentCount = course.documentCount ?? 0;
                                                            const canDeleteCourse = documentCount === 0;

                                                            return (
                                                                <Table.Tr
                                                                    key={course.id}
                                                                    onClick={() => setSelectedCourseId(course.id)}
                                                                    style={{
                                                                        cursor: 'pointer',
                                                                        backgroundColor: isSelected
                                                                            ? 'rgba(59, 130, 246, 0.08)'
                                                                            : undefined,
                                                                    }}
                                                                >
                                                                    <Table.Td>
                                                                        <Stack gap={2}>
                                                                            <Text fw={700} c={isSelected ? 'blue.2' : 'gray.0'}>
                                                                                {course.name}
                                                                            </Text>
                                                                            <Text size="xs" c="dimmed" tt="uppercase">
                                                                                {course.code}
                                                                            </Text>
                                                                        </Stack>
                                                                    </Table.Td>
                                                                    <Table.Td>
                                                                        <Badge variant="light" color={documentCount > 0 ? 'blue' : 'gray'}>
                                                                            {documentCount} tài liệu
                                                                        </Badge>
                                                                    </Table.Td>
                                                                    <Table.Td>
                                                                        <Group justify="flex-end" gap="xs">
                                                                            <Menu shadow="md" width={180} position="bottom-end">
                                                                                <Menu.Target>
                                                                                    <ActionIcon
                                                                                        variant="subtle"
                                                                                        color="gray"
                                                                                        aria-label={`Tùy chọn cho môn ${course.code}`}
                                                                                        onClick={(event) => event.stopPropagation()}
                                                                                    >
                                                                                        <IconDotsVertical size={16} />
                                                                                    </ActionIcon>
                                                                                </Menu.Target>

                                                                                <Menu.Dropdown onClick={(event) => event.stopPropagation()}>
                                                                                    <Menu.Item
                                                                                        leftSection={<IconPencil size={14} />}
                                                                                        onClick={() => openEditCourseForm(course)}
                                                                                    >
                                                                                        Chỉnh sửa
                                                                                    </Menu.Item>
                                                                                    <Menu.Item
                                                                                        color="red"
                                                                                        leftSection={<IconTrash size={14} />}
                                                                                        disabled={!canDeleteCourse}
                                                                                        onClick={() => {
                                                                                            if (!canDeleteCourse) {
                                                                                                notifications.show({
                                                                                                    color: 'yellow',
                                                                                                    title: 'Không thể xoá môn',
                                                                                                    message: 'Môn học phải trống tài liệu trước khi xoá.',
                                                                                                });
                                                                                                return;
                                                                                            }

                                                                                            setCourseToDelete(course);
                                                                                            deleteCourseHandlers.open();
                                                                                        }}
                                                                                    >
                                                                                        Xoá
                                                                                    </Menu.Item>
                                                                                </Menu.Dropdown>
                                                                            </Menu>
                                                                        </Group>
                                                                    </Table.Td>
                                                                </Table.Tr>
                                                            );
                                                        })}
                                                    </Table.Tbody>
                                                </Table>
                                            </Box>
                                        )}
                                    </Card>

                                    <Card withBorder radius="lg" padding="lg" bg="var(--mantine-color-dark-8)">
                                        <Group justify="space-between" mb="md">
                                            <div>
                                                <Text fw={700} c="gray.0">
                                                    Tải tài liệu vào môn học
                                                </Text>
                                                <Text size="xs" c="dimmed" mt={4}>
                                                    Chỉ cho phép PDF để khớp với pipeline ingestion hiện tại.
                                                </Text>
                                            </div>
                                            <Badge variant="light" color="red">
                                                PDF
                                            </Badge>
                                        </Group>

                                        {selectedCourse ? (
                                            <DocumentUploadForm
                                                courseId={selectedCourse.id}
                                                courseName={`${selectedCourse.code} - ${selectedCourse.name}`}
                                            />
                                        ) : (
                                            <Paper withBorder radius="md" p="md" bg="var(--mantine-color-dark-9)">
                                                <Text size="sm" c="dimmed">
                                                    Chọn một môn học để bắt đầu tải tài liệu.
                                                </Text>
                                            </Paper>
                                        )}
                                    </Card>
                                </Stack>
                            </Grid.Col>

                            <Grid.Col span={{ base: 12, lg: 8 }}>
                                <Card withBorder radius="lg" padding="lg" bg="var(--mantine-color-dark-8)">
                                    <Group justify="space-between" align="flex-start" mb="md">
                                        <div>
                                            <Text fw={700} c="gray.0">
                                                Danh sách tài liệu
                                            </Text>
                                            <Text size="xs" c="dimmed" mt={4}>
                                                Tài liệu đã nạp theo môn học đang chọn, có thể xoá khi không còn xử lý.
                                            </Text>
                                        </div>

                                        <Group gap="xs">
                                            <Badge variant="light" color="blue">
                                                {selectedCourse ? `${selectedCourse.code}` : 'Chưa chọn'}
                                            </Badge>
                                            <ActionIcon
                                                variant="default"
                                                size="lg"
                                                aria-label="Làm mới danh sách tài liệu"
                                                onClick={() => activeCourseId && documentsQuery.refetch()}
                                                disabled={!activeCourseId || documentsQuery.isLoading}
                                            >
                                                <IconRefresh size={16} className={isDocumentsFetching ? 'animate-spin' : ''} />
                                            </ActionIcon>
                                        </Group>
                                    </Group>

                                    {selectedCourse ? (
                                        <Stack gap="md">
                                            <Paper withBorder radius="md" p="md" bg="var(--mantine-color-dark-9)">
                                                <Group justify="space-between" align="flex-start">
                                                    <div>
                                                        <Text fw={700} c="gray.0">
                                                            {selectedCourse.name}
                                                        </Text>
                                                        <Text size="xs" c="dimmed" mt={4}>
                                                            {selectedCourse.code} · {selectedCourse.documentCount ?? 0} tài liệu đã ghi nhận
                                                        </Text>
                                                    </div>
                                                    <Badge color="gray" variant="light">
                                                        {formatDate(selectedCourse.createdAt)}
                                                    </Badge>
                                                </Group>
                                            </Paper>

                                            {isDocumentsLoading ? (
                                                <Group gap="xs" py="md" justify="center">
                                                    <Loader size="sm" />
                                                    <Text size="sm" c="dimmed">
                                                        Đang tải tài liệu...
                                                    </Text>
                                                </Group>
                                            ) : totalDocuments === 0 ? (
                                                <Paper withBorder radius="md" p="xl" bg="var(--mantine-color-dark-9)">
                                                    <Stack align="center" gap="xs">
                                                        <IconFileText size={32} color="var(--mantine-color-dimmed)" />
                                                        <Text fw={600} c="gray.0">
                                                            Chưa có tài liệu nào
                                                        </Text>
                                                        <Text size="sm" c="dimmed" ta="center">
                                                            Nạp một file PDF vào môn học này để hệ thống bắt đầu xử lý.
                                                        </Text>
                                                    </Stack>
                                                </Paper>
                                            ) : (
                                                <Box style={{ overflowX: 'auto' }}>
                                                    <Table verticalSpacing="sm" highlightOnHover withRowBorders={false}>
                                                        <Table.Thead>
                                                            <Table.Tr>
                                                                <Table.Th>Tài liệu</Table.Th>
                                                                <Table.Th>Trạng thái</Table.Th>
                                                                <Table.Th>Ngày tạo</Table.Th>
                                                                <Table.Th />
                                                            </Table.Tr>
                                                        </Table.Thead>
                                                        <Table.Tbody>
                                                            {documents.map((document) => {
                                                                const isDeletable =
                                                                    document.status !== 'PENDING' &&
                                                                    document.status !== 'PROCESSING';

                                                                return (
                                                                    <Table.Tr key={document.id}>
                                                                        <Table.Td>
                                                                            <Stack gap={2}>
                                                                                <Text fw={600} c="gray.0" lineClamp={1}>
                                                                                    {document.name}
                                                                                </Text>
                                                                                <Text size="xs" c="dimmed">
                                                                                    {document.id.slice(0, 8)} · {document.fileType.toUpperCase()}
                                                                                </Text>
                                                                            </Stack>
                                                                        </Table.Td>
                                                                        <Table.Td>{getDocumentStatusBadge(document)}</Table.Td>
                                                                        <Table.Td>
                                                                            <Text size="sm" c="dimmed">
                                                                                {formatDate(document.createdAt)}
                                                                            </Text>
                                                                        </Table.Td>
                                                                        <Table.Td>
                                                                            <Group justify="flex-end">
                                                                                <Menu shadow="md" width={160} position="bottom-end">
                                                                                    <Menu.Target>
                                                                                        <ActionIcon
                                                                                            variant="subtle"
                                                                                            color="gray"
                                                                                            aria-label={`Tùy chọn cho tài liệu ${document.name}`}
                                                                                            onClick={(event) => event.stopPropagation()}
                                                                                        >
                                                                                            <IconDotsVertical size={16} />
                                                                                        </ActionIcon>
                                                                                    </Menu.Target>

                                                                                    <Menu.Dropdown onClick={(event) => event.stopPropagation()}>
                                                                                        <Menu.Item
                                                                                            color="red"
                                                                                            leftSection={<IconTrash size={14} />}
                                                                                            disabled={!isDeletable || deleteDocumentMutation.isPending}
                                                                                            onClick={() =>
                                                                                                deleteDocumentMutation.mutate({
                                                                                                    courseId: selectedCourse.id,
                                                                                                    documentId: document.id,
                                                                                                })
                                                                                            }
                                                                                        >
                                                                                            Xoá
                                                                                        </Menu.Item>
                                                                                    </Menu.Dropdown>
                                                                                </Menu>
                                                                            </Group>
                                                                        </Table.Td>
                                                                    </Table.Tr>
                                                                );
                                                            })}
                                                        </Table.Tbody>
                                                    </Table>
                                                </Box>
                                            )}
                                        </Stack>
                                    ) : (
                                        <Paper withBorder radius="md" p="xl" bg="var(--mantine-color-dark-9)">
                                            <Stack align="center" gap="xs">
                                                <IconAlertCircle size={32} color="var(--mantine-color-blue-4)" />
                                                <Text fw={600} c="gray.0">
                                                    Chưa chọn môn học
                                                </Text>
                                                <Text size="sm" c="dimmed" ta="center">
                                                    Chọn một môn học ở bảng bên trái để xem và quản lý tài liệu.
                                                </Text>
                                            </Stack>
                                        </Paper>
                                    )}
                                </Card>
                            </Grid.Col>
                        </Grid>
                    )}
                </Stack>
            </Container>

            <Modal
                opened={courseFormOpened}
                onClose={closeCourseForm}
                title={courseFormMode === 'edit' ? 'Chỉnh sửa môn học' : 'Thêm môn học mới'}
                centered
                radius="lg"
            >
                <form onSubmit={handleCreateCourse}>
                    <Stack gap="md">
                        <TextInput
                            label="Mã môn học"
                            placeholder="VD: SWD392"
                            value={courseCode}
                            onChange={(event) => setCourseCode(event.currentTarget.value)}
                            required
                            autoFocus
                        />
                        <TextInput
                            label="Tên môn học"
                            placeholder="VD: Software Design and Implementation"
                            value={courseName}
                            onChange={(event) => setCourseName(event.currentTarget.value)}
                            required
                        />

                        <Group justify="flex-end" mt="xs">
                            <Button variant="light" color="gray" onClick={closeCourseForm} type="button">
                                Huỷ
                            </Button>
                            <Button
                                type="submit"
                                loading={courseFormMode === 'edit' ? updateCourseMutation.isPending : createCourseMutation.isPending}
                            >
                                {courseFormMode === 'edit' ? 'Lưu thay đổi' : 'Tạo môn học'}
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>

            <Modal
                opened={deleteCourseOpened}
                onClose={() => {
                    setCourseToDelete(null);
                    deleteCourseHandlers.close();
                }}
                title="Xoá môn học"
                centered
                radius="lg"
            >
                <Stack gap="md">
                    <Alert icon={<IconAlertTriangle size={16} />} color="yellow" variant="light">
                        Môn học chỉ được xoá khi không còn tài liệu. Nếu còn tài liệu, hệ thống sẽ từ chối thao tác này.
                    </Alert>

                    <Paper withBorder radius="md" p="md" bg="var(--mantine-color-dark-9)">
                        <Stack gap={4}>
                            <Text fw={700} c="gray.0">
                                {courseToDelete?.name}
                            </Text>
                            <Text size="sm" c="dimmed">
                                {courseToDelete?.code} · {courseToDelete?.documentCount ?? 0} tài liệu
                            </Text>
                        </Stack>
                    </Paper>

                    <Group justify="flex-end">
                        <Button
                            variant="light"
                            color="gray"
                            onClick={() => {
                                setCourseToDelete(null);
                                deleteCourseHandlers.close();
                            }}
                        >
                            Huỷ
                        </Button>
                        <Button color="red" onClick={handleDeleteCourse} loading={deleteCourseMutation.isPending}>
                            Xoá môn học
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Box>
    );
}
