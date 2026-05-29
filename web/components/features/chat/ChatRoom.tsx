"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useSearchParams, useRouter } from "next/navigation";
import { api, streamChat } from "@/lib/api";
import type { ChatMessage, Citation, DocumentCatalogGroup } from "@/types";
import type { ChatSessionDetailsResponse, StreamCitation, CreateChatSessionInput, DocumentCatalogResponse } from "@/api/chat";
import {
    Box,
    Text,
    Title,
    Textarea,
    ActionIcon,
    Paper,
    Group,
    Stack,
    Badge,
    Loader,
    Alert,
    Tooltip,
    Button,
    Modal,
    ScrollArea,
    TextInput,
    Checkbox,
    Divider,
} from "@mantine/core";
import {
    IconSend,
    IconAlertCircle,
    IconSparkles,
    IconBook,
    IconInfoCircle,
    IconSearch,
} from "@tabler/icons-react";

type ChatRowCitation = Citation | StreamCitation;

type ChatRowItem =
    | (ChatMessage & {
        kind: "message";
    })
    | {
        kind: "streaming";
        id: string;
        sender: "ASSISTANT";
        content: string;
        citations: ChatRowCitation[];
        createdAt: string;
        isStreamingPlaceholder: true;
    }
    | {
        kind: "error";
        id: string;
        error: string;
        isErrorPlaceholder: true;
        createdAt: string;
    };

function ChatRoomContent() {
    const quotaExceededNotice =
        "Bạn đã hết quota chat của gói hiện tại. Hãy chờ đến khi quota được đặt lại hoặc nâng cấp gói cao hơn để tiếp tục.";

    const queryClient = useQueryClient();
    const searchParams = useSearchParams();
    const router = useRouter();
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const activeSessionId = searchParams.get("sessionId");

    const [messageInput, setMessageInput] = useState<string>("");
    const [streamingContent, setStreamingContent] = useState<string>("");
    const [streamingCitations, setStreamingCitations] = useState<ChatRowCitation[]>([]);
    const [isStreaming, setIsStreaming] = useState<boolean>(false);
    const [streamingError, setStreamingError] = useState<string | null>(null);
    const [pickerOpened, setPickerOpened] = useState<boolean>(false);
    const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
    const [documentSearch, setDocumentSearch] = useState<string>("");

    const { data: documentCatalogData } = useQuery<DocumentCatalogResponse>({
        queryKey: ["chat-document-catalog"],
        queryFn: () => api.getDocumentCatalog(),
    });
    const documentCatalogGroups = documentCatalogData?.groups || [];

    const createSessionMutation = useMutation({
        mutationFn: (payload: CreateChatSessionInput) => api.createChatSession(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
        },
    });

    const { data: activeSessionData, isLoading: isMessagesLoading } = useQuery<ChatSessionDetailsResponse>({
        queryKey: ["chat-session-details", activeSessionId],
        queryFn: () => api.getChatSessionDetails(activeSessionId!),
        enabled: !!activeSessionId,
    });

    const scrollToBottom = (behavior: "smooth" | "auto" = "smooth") => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
                top: scrollContainerRef.current.scrollHeight,
                behavior,
            });
        }
    };

    const getCreateSessionPayload = (): CreateChatSessionInput => ({
        scopeMode: "SELECTED_DOCUMENTS",
        documentIds: selectedDocumentIds,
    });

    useEffect(() => {
        const behavior = isStreaming ? "auto" : "smooth";
        const frame = window.requestAnimationFrame(() => {
            scrollToBottom(behavior);
        });

        return () => window.cancelAnimationFrame(frame);
    }, [
        activeSessionData?.session?.messages?.length,
        streamingContent,
        isStreaming,
        streamingError,
    ]);

    const normalizedDocumentSearch = documentSearch.trim().toLowerCase();
    const visibleDocumentGroups = documentCatalogGroups
        .map((group) => {
            const documents = group.documents.filter((document) => {
                if (!normalizedDocumentSearch) {
                    return true;
                }

                const courseLabel = `${group.course.code} ${group.course.name}`.toLowerCase();
                const documentLabel = `${document.name} ${document.fileType}`.toLowerCase();
                return courseLabel.includes(normalizedDocumentSearch) || documentLabel.includes(normalizedDocumentSearch);
            });

            return {
                ...group,
                documents,
            };
        })
        .filter((group) => group.documents.length > 0);

    const selectedDocuments = documentCatalogGroups
        .flatMap((group) => group.documents)
        .filter((document) => selectedDocumentIds.includes(document.id));
    const selectedCourseIds = Array.from(new Set(selectedDocuments.map((document) => document.courseId)));

    const toggleDocumentSelection = (documentId: string, checked: boolean) => {
        setSelectedDocumentIds((current) => {
            if (checked) {
                return Array.from(new Set([...current, documentId]));
            }

            return current.filter((currentDocumentId) => currentDocumentId !== documentId);
        });
    };

    const toggleGroupSelection = (group: DocumentCatalogGroup, checked: boolean) => {
        const groupDocumentIds = group.documents
            .filter((document) => document.selectable)
            .map((document) => document.id);

        setSelectedDocumentIds((current) => {
            const currentSet = new Set(current);

            if (checked) {
                groupDocumentIds.forEach((documentId) => currentSet.add(documentId));
                return Array.from(currentSet);
            }

            return current.filter((documentId) => !groupDocumentIds.includes(documentId));
        });
    };

    const handleSendMessage = async () => {
        if (!messageInput.trim() || isStreaming) return;

        if (!activeSessionId) {
            setPickerOpened(true);
            return;
        }

        const sessionId = activeSessionId;
        const userMessage = messageInput;

        setMessageInput("");
        setStreamingContent("");
        setStreamingCitations([]);
        setStreamingError(null);
        setIsStreaming(true);

        queryClient.setQueryData(
            ["chat-session-details", sessionId],
            (old: ChatSessionDetailsResponse | undefined) => {
                const newMsg: ChatMessage = {
                    id: "temp-user-msg",
                    sender: "USER",
                    content: userMessage,
                    createdAt: new Date().toISOString(),
                };
                if (!old?.session) {
                    return {
                        session: {
                            id: sessionId,
                            title: "Cuộc hội thoại mới",
                            createdAt: new Date().toISOString(),
                            courseId: null,
                            scopeMode: "SELECTED_DOCUMENTS",
                            scopedCourses: [],
                            scopedDocuments: [],
                            scopeLabel: "Đang chờ chọn tài liệu",
                            scopeSummary: "Đang chờ chọn tài liệu",
                            messages: [newMsg],
                            course: null,
                        },
                    };
                }
                return {
                    ...old,
                    session: {
                        ...old.session,
                        messages: [...old.session.messages, newMsg],
                    },
                };
            }
        );

        await streamChat(
            sessionId,
            userMessage,
            (chunk) => setStreamingContent((prev) => prev + chunk),
            (citations) => setStreamingCitations(citations),
            (error) => {
                setStreamingError(error);
                setIsStreaming(false);
            },
        );

        setIsStreaming(false);
        queryClient.invalidateQueries({ queryKey: ["chat-session-details", sessionId] });
        queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
        queryClient.invalidateQueries({ queryKey: ["subscription"] });
    };

    const handleCreateSessionWithDocuments = async () => {
        if (selectedDocumentIds.length === 0 || createSessionMutation.isPending) {
            return;
        }

        try {
            const res = await createSessionMutation.mutateAsync(getCreateSessionPayload());
            setSelectedDocumentIds([]);
            setDocumentSearch("");
            setPickerOpened(false);
            router.push(`/student/chat?sessionId=${res.session.id}`);
        } catch {
            setStreamingError("Không thể tạo phiên chat mới");
        }
    };

    const activeSession = activeSessionData?.session;
    const messages = activeSession?.messages || [];
    const activeScopeLabel = activeSession?.scopeSummary
        || activeSession?.scopeLabel
        || (activeSession?.scopeMode === "SELECTED_DOCUMENTS"
            ? activeSession.scopedDocuments?.length === 1
                ? activeSession.scopedDocuments[0].name
                : `${activeSession.scopedDocuments?.length || 0} tài liệu đã chọn`
            : activeSession?.scopeMode === "SELECTED_COURSES"
                ? activeSession.scopedCourses?.length === 1
                    ? `${activeSession.scopedCourses[0].code} - ${activeSession.scopedCourses[0].name}`
                    : `${activeSession.scopedCourses?.length || 0} môn đã chọn`
                : "Tất cả môn");

    const virtualItems: ChatRowItem[] = [
        ...messages.map((message) => ({
            ...message,
            kind: "message" as const,
        })),
        ...(isStreaming
            ? [
                  {
                      id: "streaming-placeholder",
                      kind: "streaming" as const,
                      sender: "ASSISTANT" as const,
                      content: streamingContent,
                      citations: streamingCitations,
                      createdAt: new Date().toISOString(),
                      isStreamingPlaceholder: true as const,
                  },
              ]
            : []),
        ...(streamingError
            ? [
                  {
                      id: "error-placeholder",
                      kind: "error" as const,
                      createdAt: new Date().toISOString(),
                      isErrorPlaceholder: true as const,
                      error: streamingError,
                  },
              ]
            : []),
    ];

    // TanStack Virtual returns unstable helpers that React Compiler cannot memoize safely.
    // eslint-disable-next-line react-hooks/incompatible-library
    const rowVirtualizer = useVirtualizer({
        count: virtualItems.length,
        getScrollElement: () => scrollContainerRef.current,
        estimateSize: (index) => {
            const item = virtualItems[index];

            if (!item) return 100;
            if (item.kind === "error") return 108;
            if (item.kind === "streaming") return item.content ? 132 : 84;

            return item.sender === "USER" ? 96 : 128;
        },
        getItemKey: (index) => virtualItems[index]?.id ?? index,
        overscan: 8,
    });

    return (
        <Box className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-zinc-950" style={{ minWidth: 0 }}>
            {/* Background decoration */}
            <Box style={{ position: "absolute", top: "10%", left: "-10%", width: 400, height: 400, borderRadius: "9999px", backgroundColor: "rgba(99, 102, 241, 0.04)", filter: "blur(120px)", pointerEvents: "none" }} />
            <Box style={{ position: "absolute", bottom: "-10%", right: "-10%", width: 500, height: 500, borderRadius: "9999px", backgroundColor: "rgba(124, 58, 237, 0.04)", filter: "blur(140px)", pointerEvents: "none" }} />

            <Box className="shrink-0 border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-3 backdrop-blur">
                <Group justify="space-between" gap="md" wrap="nowrap">
                    <Box>
                        {activeSession ? (
                            <Stack gap={2}>
                                <Group gap="xs">
                                    <IconSparkles size={14} color="var(--mantine-color-indigo-4)" />
                                    <Title order={5} style={{ fontSize: "var(--mantine-font-size-xs)", fontWeight: 700, color: "var(--mantine-color-zinc-1)" }}>
                                        {activeSession.title || "Hội thoại mới"}
                                    </Title>
                                </Group>
                                <Text size="xs" c="dimmed">
                                    {activeScopeLabel}
                                </Text>
                            </Stack>
                        ) : (
                            <Stack gap={2}>
                                <Title order={5} style={{ fontSize: "var(--mantine-font-size-xs)", fontWeight: 700, color: "var(--mantine-color-zinc-4)" }}>
                                    Trợ lý AI Học tập
                                </Title>
                                <Text size="xs" c="dimmed">
                                    Chưa chọn phạm vi tài liệu
                                </Text>
                            </Stack>
                        )}
                    </Box>

                    {isStreaming && (
                        <Badge
                            variant="light"
                            color="indigo"
                            size="sm"
                            radius="xl"
                            leftSection={<Loader size={10} color="indigo" />}
                        >
                            Đang xử lý...
                        </Badge>
                    )}
                </Group>
            </Box>

            <Box
                ref={scrollContainerRef}
                className="custom-scrollbar flex-1 min-h-0 overflow-y-auto"
            >
                <Box className="flex w-full min-w-0 flex-col px-4 py-6">
                    {!activeSessionId && !isStreaming ? (
                        <Stack align="center" justify="center" gap="lg" className="min-h-[60vh] text-center" style={{ width: "100%" }}>
                            <Paper
                                radius="md"
                                p="lg"
                                style={{
                                    width: "100%",
                                    maxWidth: 720,
                                    border: "1px solid #27272a",
                                    background: "linear-gradient(180deg, rgba(24,24,27,0.92), rgba(9,9,11,0.96))",
                                }}
                            >
                                <Stack gap="md" align="center">
                                    <Badge variant="light" color="indigo" radius="xs">
                                        Session mới
                                    </Badge>
                                    <div>
                                        <Text size="lg" fw={600} c="zinc.1" mb={4}>
                                            Chọn tài liệu trước khi bắt đầu
                                        </Text>
                                        <Text size="xs" c="dimmed" style={{ lineHeight: 1.6 }}>
                                            Mỗi session mới phải khóa vào một hoặc nhiều tài liệu cụ thể. Cách này giúp RAG bám đúng nguồn và giảm từ chối vô ích.
                                        </Text>
                                    </div>

                                    <Button
                                        leftSection={<IconBook size={14} />}
                                        onClick={() => setPickerOpened(true)}
                                        radius="xs"
                                        color="indigo"
                                    >
                                      Chọn tài liệu
                                    </Button>

                                    <Text size="xs" c="dimmed">
                                        Đã chọn {selectedDocumentIds.length} tài liệu từ {selectedCourseIds.length} môn.
                                    </Text>
                                </Stack>
                            </Paper>
                        </Stack>
                    ) : isMessagesLoading ? (
                        <Stack align="center" justify="center" className="min-h-[60vh]">
                            <Loader size="md" color="indigo" />
                        </Stack>
                    ) : (
                        <Box style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: "100%", position: "relative" }}>
                            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                const item = virtualItems[virtualRow.index];
                                if (!item) return null;

                                const isError = item.kind === "error";
                                const isQuotaError = isError && /limit_exceeded|quota/i.test(item.error);
                                const isStreamingPlaceholder = item.kind === "streaming";
                                const isUser = item.kind === "message" && item.sender === "USER";
                                const citations = "citations" in item ? item.citations ?? [] : [];

                                return (
                                    <Box
                                        key={virtualRow.key}
                                        data-index={virtualRow.index}
                                        ref={rowVirtualizer.measureElement}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            paddingBottom: 24,
                                            transform: `translateY(${virtualRow.start}px)`,
                                        }}
                                    >
                                        {isError ? (
                                            isQuotaError ? (
                                                <Paper
                                                    p="md"
                                                    radius="xs"
                                                    style={{
                                                        maxWidth: '85%',
                                                        margin: '0 auto',
                                                        color: 'var(--mantine-color-zinc-1)',
                                                        border: '1px solid rgba(244, 114, 182, 0.25)',
                                                        background: 'rgba(24, 24, 27, 0.92)',
                                                    }}
                                                >
                                                    <Text size="sm" style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                                        {quotaExceededNotice}
                                                    </Text>
                                                </Paper>
                                            ) : (
                                                <Alert
                                                    icon={<IconAlertCircle size={16} />}
                                                    title="Lỗi stream"
                                                    color="red"
                                                    radius="xs"
                                                    style={{ maxWidth: '85%', margin: '0 auto' }}
                                                >
                                                    Lỗi stream: {item.error}
                                                </Alert>
                                            )
                                        ) : (
                                            <Group
                                                align="flex-start"
                                                gap="md"
                                                justify={isUser ? 'flex-end' : 'flex-start'}
                                                style={{ width: '100%', maxWidth: '100%', margin: isUser ? '0 0 0 auto' : '0 auto 0 0' }}
                                            >
                                                {!isUser && (
                                                    <Paper
                                                        radius="xl"
                                                        style={{
                                                            width: 32,
                                                            height: 32,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            background: 'linear-gradient(135deg, var(--mantine-color-indigo-5), var(--mantine-color-violet-6))',
                                                            border: '1px solid rgba(99, 102, 241, 0.3)',
                                                            color: 'white',
                                                            marginTop: 4,
                                                        }}
                                                    >
                                                        <IconSparkles size={16} />
                                                    </Paper>
                                                )}

                                                <Stack gap="xs" style={{ flex: 1, minWidth: 0, alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                                                    <Paper
                                                        p="md"
                                                        radius="xs"
                                                        bg={isUser ? 'deepBlue.7' : 'zinc.900/20'}
                                                        style={{
                                                            color: 'var(--mantine-color-zinc-1)',
                                                            border: isUser ? 'none' : '1px solid #27272a',
                                                            borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                                                            maxWidth: '100%',
                                                        }}
                                                    >
                                                        {isStreamingPlaceholder && !item.content ? (
                                                            <Group gap="xs" py="xs">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
                                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]" />
                                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]" />
                                                            </Group>
                                                        ) : (
                                                            <Text size="sm" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.6 }}>
                                                                {item.content}
                                                            </Text>
                                                        )}
                                                    </Paper>

                                                    {!isUser && citations.length > 0 && (
                                                        <Group gap="xs" wrap="wrap" style={{ paddingLeft: 4 }}>
                                                            {citations.map((cite, i) => (
                                                                <Badge
                                                                    key={i}
                                                                    variant="outline"
                                                                    color="gray"
                                                                    radius="xs"
                                                                    size="xs"
                                                                    leftSection={<IconBook size={10} color="var(--mantine-color-indigo-4)" />}
                                                                    style={{ textTransform: 'none', cursor: 'default' }}
                                                                    title={cite.documentName}
                                                                >
                                                                    {cite.documentName.split("_").slice(1).join("_") || cite.documentName} (Trang {cite.page})
                                                                </Badge>
                                                            ))}
                                                        </Group>
                                                    )}
                                                </Stack>
                                            </Group>
                                        )}
                                    </Box>
                                );
                            })}
                        </Box>
                    )}
                </Box>
            </Box>

            <Modal
                opened={pickerOpened}
                onClose={() => setPickerOpened(false)}
                title="Chọn tài liệu cho session mới"
                centered
                size="xl"
                radius="md"
                overlayProps={{ opacity: 0.55, blur: 4 }}
            >
                <Stack gap="md">
                    <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
                        Chọn một hoặc nhiều tài liệu đã hoàn tất xử lý. Session mới sẽ chỉ truy xuất trong phạm vi bạn xác nhận ở đây.
                    </Text>

                    <TextInput
                        value={documentSearch}
                        onChange={(event) => setDocumentSearch(event.currentTarget.value)}
                        placeholder="Tìm theo tên tài liệu, mã môn, hoặc tên môn"
                        leftSection={<IconSearch size={14} />}
                        radius="xs"
                    />

                    <Group justify="space-between" align="center">
                        <Text size="sm" fw={600} c="zinc.1">
                            Đã chọn {selectedDocumentIds.length} tài liệu từ {selectedCourseIds.length} môn
                        </Text>
                        <Button
                            variant="light"
                            color="gray"
                            size="xs"
                            onClick={() => setSelectedDocumentIds([])}
                            disabled={selectedDocumentIds.length === 0}
                        >
                            Bỏ chọn tất cả
                        </Button>
                    </Group>

                    <ScrollArea h={480} type="auto" offsetScrollbars>
                        <Stack gap="sm">
                            {visibleDocumentGroups.length === 0 ? (
                                <Paper p="md" radius="xs" style={{ border: "1px solid #27272a", background: "rgba(24,24,27,0.75)" }}>
                                    <Text size="sm" c="dimmed">
                                        Không tìm thấy tài liệu phù hợp.
                                    </Text>
                                </Paper>
                            ) : (
                                visibleDocumentGroups.map((group) => {
                                    const selectableDocuments = group.documents.filter((document) => document.selectable);
                                    const selectedSelectableCount = selectableDocuments.filter((document) => selectedDocumentIds.includes(document.id)).length;
                                    const allSelected = selectableDocuments.length > 0 && selectedSelectableCount === selectableDocuments.length;
                                    const indeterminate = selectedSelectableCount > 0 && !allSelected;

                                    return (
                                        <Paper
                                            key={group.course.id}
                                            p="md"
                                            radius="xs"
                                            style={{
                                                border: "1px solid #27272a",
                                                background: "rgba(24,24,27,0.75)",
                                            }}
                                        >
                                            <Group justify="space-between" align="flex-start" mb="sm" wrap="nowrap">
                                                <Stack gap={2} style={{ minWidth: 0 }}>
                                                    <Text size="sm" fw={700} c="zinc.1">
                                                        {group.course.code}
                                                    </Text>
                                                    <Text size="xs" c="dimmed">
                                                        {group.course.name}
                                                    </Text>
                                                </Stack>

                                                <Button
                                                    size="xs"
                                                    variant="light"
                                                    onClick={() => toggleGroupSelection(group, !allSelected)}
                                                    disabled={selectableDocuments.length === 0}
                                                >
                                                    {allSelected ? "Bỏ chọn" : "Chọn hết"}
                                                </Button>
                                            </Group>

                                            <Checkbox
                                                checked={allSelected}
                                                indeterminate={indeterminate}
                                                onChange={(event) => toggleGroupSelection(group, event.currentTarget.checked)}
                                                label={`${selectedSelectableCount}/${selectableDocuments.length} tài liệu đã chọn`}
                                                size="sm"
                                                radius="xs"
                                                mb="sm"
                                            />

                                            <Stack gap="xs">
                                                {group.documents.map((document) => {
                                                    const checked = selectedDocumentIds.includes(document.id);

                                                    return (
                                                        <Paper
                                                            key={document.id}
                                                            p="sm"
                                                            radius="xs"
                                                            style={{
                                                                border: "1px solid #3f3f46",
                                                                background: checked ? "rgba(59, 130, 246, 0.12)" : "rgba(9,9,11,0.6)",
                                                            }}
                                                        >
                                                            <Group justify="space-between" align="flex-start" wrap="nowrap">
                                                                <Checkbox
                                                                    checked={checked}
                                                                    disabled={!document.selectable}
                                                                    onChange={(event) => toggleDocumentSelection(document.id, event.currentTarget.checked)}
                                                                    label={
                                                                        <Stack gap={2}>
                                                                            <Text size="sm" fw={500} c="zinc.1">
                                                                                {document.name}
                                                                            </Text>
                                                                            <Text size="xs" c="dimmed">
                                                                                {document.fileType.toUpperCase()} · {document.status}
                                                                            </Text>
                                                                        </Stack>
                                                                    }
                                                                />

                                                                <Badge size="sm" radius="xs" variant="light" color={document.selectable ? "indigo" : "gray"}>
                                                                    {document.selectable ? "Chọn được" : "Đang xử lý"}
                                                                </Badge>
                                                            </Group>
                                                        </Paper>
                                                    );
                                                })}
                                            </Stack>
                                        </Paper>
                                    );
                                })
                            )}
                        </Stack>
                    </ScrollArea>

                    <Divider color="zinc.8" />

                    <Group justify="space-between" align="center">
                        <Text size="xs" c="dimmed">
                            Session mới sẽ bị khóa vào phạm vi đã chọn. Muốn đổi phạm vi sau đó, tạo session mới.
                        </Text>

                        <Group gap="xs">
                            <Button variant="light" color="gray" onClick={() => setPickerOpened(false)}>
                                Hủy
                            </Button>
                            <Button
                                color="indigo"
                                onClick={() => void handleCreateSessionWithDocuments()}
                                loading={createSessionMutation.isPending}
                                disabled={selectedDocumentIds.length === 0}
                            >
                                Tạo cuộc hội thoại
                            </Button>
                        </Group>
                    </Group>
                </Stack>
            </Modal>

            <Box className="shrink-0 border-t border-zinc-800/80 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent px-4 py-2">
                <Box className="w-full">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            void handleSendMessage();
                        }}
                    >
                        <Paper
                            p={6}
                            radius="xs"
                            bg="zinc.900/60"
                            style={{
                                border: '1px solid #3f3f46',
                                backdropFilter: 'blur(12px)',
                                display: 'flex',
                                alignItems: 'flex-end',
                                gap: 'var(--mantine-spacing-xs)',
                            }}
                        >
                            <Textarea
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        void handleSendMessage();
                                    }
                                }}
                                placeholder={activeSessionId ? (isStreaming ? "Đang phản hồi..." : "Nhập câu hỏi tại đây...") : "Chọn tài liệu trước khi nhập câu hỏi"}
                                disabled={isStreaming || !activeSessionId}
                                autosize
                                minRows={1}
                                maxRows={6}
                                variant="unstyled"
                                size="sm"
                                style={{ flex: 1, paddingLeft: 10, paddingTop: 2, paddingBottom: 2 }}
                                styles={{
                                    input: {
                                        color: 'var(--mantine-color-zinc-1)',
                                        minHeight: 32,
                                        paddingTop: 4,
                                        paddingBottom: 4,
                                        '&::placeholder': {
                                            color: 'var(--mantine-color-zinc-5)',
                                        }
                                    }
                                }}
                            />
                            <ActionIcon
                                type="submit"
                                color="zinc.1"
                                variant="filled"
                                size="md"
                                radius="xl"
                                disabled={!activeSessionId || !messageInput.trim() || isStreaming}
                                style={{
                                    backgroundColor: (!activeSessionId || !messageInput.trim() || isStreaming) ? 'var(--mantine-color-zinc-8)' : 'var(--mantine-color-zinc-2)',
                                    color: (!activeSessionId || !messageInput.trim() || isStreaming) ? 'var(--mantine-color-zinc-6)' : '#09090b',
                                }}
                            >
                                {isStreaming ? <Loader size={16} color="zinc.6" /> : <IconSend size={16} />}
                            </ActionIcon>
                        </Paper>
                    </form>
                    <Group justify="flex-end" mt={2}>
                        <Tooltip
                            label="AI có thể mắc lỗi. Hãy luôn kiểm tra lại nguồn trích dẫn từ tài liệu."
                            withArrow
                            position="top-end"
                            multiline
                            w={220}
                        >
                            <ActionIcon
                                variant="subtle"
                                color="zinc.5"
                                size="xs"
                                radius="xl"
                                aria-label="Thông tin cảnh báo"
                            >
                                <IconInfoCircle size={12} />
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                </Box>
            </Box>
        </Box>
    );
}

export function ChatRoom() {
    return (
        <Suspense fallback={<Box style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#09090b' }}><Loader color="indigo" /></Box>}>
            <ChatRoomContent />
        </Suspense>
    );
}
