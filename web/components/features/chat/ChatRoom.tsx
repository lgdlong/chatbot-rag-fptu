"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useSearchParams, useRouter } from "next/navigation";
import { api, streamChat } from "@/lib/api";
import {
    MessageSquare,
    Send,
    Loader2,
    User,
    Bot,
    FileText,
    AlertCircle,
    Sparkles,
    BookOpen,
} from "lucide-react";

function ChatRoomContent() {
    const queryClient = useQueryClient();
    const searchParams = useSearchParams();
    const router = useRouter();
    const parentRef = useRef<HTMLDivElement>(null);

    const activeSessionId = searchParams.get("sessionId");

    const [messageInput, setMessageInput] = useState<string>("");
    const [streamingContent, setStreamingContent] = useState<string>("");
    const [streamingCitations, setStreamingCitations] = useState<any[]>([]);
    const [isStreaming, setIsStreaming] = useState<boolean>(false);
    const [streamingError, setStreamingError] = useState<string | null>(null);

    const { data: activeSessionData, isLoading: isMessagesLoading } = useQuery({
        queryKey: ["chat-session-details", activeSessionId],
        queryFn: () => api.getChatSessionDetails(activeSessionId!),
        enabled: !!activeSessionId,
    });

    const scrollToBottom = (behavior: "smooth" | "auto" = "smooth") => {
        if (parentRef.current) {
            parentRef.current.scrollTo({
                top: parentRef.current.scrollHeight,
                behavior,
            });
        }
    };

    useEffect(() => {
        scrollToBottom(isStreaming ? "auto" : "smooth");
        const timer = setTimeout(() => {
            scrollToBottom(isStreaming ? "auto" : "smooth");
        }, 50);
        return () => clearTimeout(timer);
    }, [
        activeSessionData?.session?.messages,
        streamingContent,
        isStreaming,
        streamingError,
    ]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim() || isStreaming) return;

        let targetSessionId = activeSessionId;
        const userMessage = messageInput;

        setMessageInput("");
        setStreamingContent("");
        setStreamingCitations([]);
        setStreamingError(null);
        setIsStreaming(true);

        if (!targetSessionId) {
            try {
                const res = await api.createChatSession("c1");
                targetSessionId = res.session.id;
                router.push(`/student/chat?sessionId=${targetSessionId}`);
            } catch (err) {
                setStreamingError("Không thể tạo phiên chat mới");
                setIsStreaming(false);
                return;
            }
        }

        queryClient.setQueryData(
            ["chat-session-details", targetSessionId],
            (old: any) => {
                const newMsg = {
                    id: "temp-user-msg",
                    sender: "USER",
                    content: userMessage,
                    createdAt: new Date().toISOString(),
                };
                if (!old || !old.session) {
                    return { session: { id: targetSessionId, messages: [newMsg] } };
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
            targetSessionId,
            userMessage,
            (chunk) => setStreamingContent((prev) => prev + chunk),
            (citations) => setStreamingCitations(citations),
            (error) => {
                setStreamingError(error);
                setIsStreaming(false);
            },
        );

        setIsStreaming(false);
        queryClient.invalidateQueries({ queryKey: ["chat-session-details", targetSessionId] });
        queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
    };

    const activeSession = activeSessionData?.session;
    const messages = activeSession?.messages || [];

    const virtualItems: any[] = [
        ...messages,
        ...(isStreaming ? [{ id: "streaming-placeholder", sender: "BOT", content: streamingContent, citations: streamingCitations, isStreamingPlaceholder: true }] : []),
        ...(streamingError ? [{ id: "error-placeholder", isErrorPlaceholder: true, error: streamingError }] : []),
    ];

    const rowVirtualizer = useVirtualizer({
        count: virtualItems.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 100,
        overscan: 5,
    });

    return (
        <section className="flex-1 flex flex-col bg-zinc-950 relative overflow-hidden min-w-0 h-full">
            <div className="absolute top-[10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/5 blur-[140px] pointer-events-none" />
            {/* Header tinh giản */}
            <div className="absolute top-0 w-full z-10 p-4 bg-gradient-to-b from-zinc-950 via-zinc-950/80 to-transparent flex items-center justify-between shrink-0 pointer-events-none">
                {activeSession ? (
                    <div className="pointer-events-auto">
                        <h3 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                            {activeSession.course?.name || "Hội thoại mới"}
                        </h3>
                    </div>
                ) : (
                    <div className="pointer-events-auto">
                        <h3 className="text-xs font-bold text-zinc-400">Trợ lý AI Học tập</h3>
                    </div>
                )}

                {isStreaming && (
                    <span className="pointer-events-auto text-[10px] text-indigo-400 flex items-center gap-1.5 animate-pulse bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full font-semibold shadow-lg">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Đang xử lý...
                    </span>
                )}
            </div>

            {/* Messages Area - Căn giữa với max-w-4xl */}
            <div ref={parentRef} className="flex-1 overflow-y-auto custom-scrollbar flex justify-center pt-16 pb-32">
                <div className="w-full max-w-4xl px-4">
                    {!activeSessionId && !isStreaming ? (
                        <div className="h-full flex flex-col items-center justify-center text-center gap-4 text-zinc-500 min-h-[60vh]">
                            <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800/80 flex items-center justify-center shadow-2xl">
                                <Sparkles className="w-8 h-8 text-indigo-400" />
                            </div>
                            <div>
                                <p className="text-lg font-medium text-zinc-200 mb-1">Tôi có thể giúp gì cho bạn?</p>
                                <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
                                    Trợ lý AI được cung cấp kiến thức trực tiếp từ tài liệu bài giảng của Giảng viên.
                                </p>
                            </div>
                        </div>
                    ) : isMessagesLoading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-3 min-h-[60vh]">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                        </div>
                    ) : (
                        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: "100%", position: "relative" }}>
                            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                const item = virtualItems[virtualRow.index];
                                if (!item) return null;

                                const isError = "isErrorPlaceholder" in item && item.isErrorPlaceholder;
                                const isStreamingPlaceholder = "isStreamingPlaceholder" in item && item.isStreamingPlaceholder;
                                const isUser = item.sender === "USER";

                                return (
                                    <div
                                        key={virtualRow.key}
                                        data-index={virtualRow.index}
                                        ref={rowVirtualizer.measureElement}
                                        className="absolute top-0 left-0 w-full pb-6"
                                        style={{ transform: `translateY(${virtualRow.start}px)` }}
                                    >
                                        {isError ? (
                                            <div className="flex items-start gap-2 max-w-[85%] mx-auto text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-2xl">
                                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                                <span>Lỗi stream: {item.error}</span>
                                            </div>
                                        ) : (
                                            <div className={`flex gap-4 max-w-[90%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}>
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border shadow-sm ${isUser ? "bg-zinc-800 border-zinc-700 text-zinc-300 hidden" : "bg-gradient-to-tr from-indigo-500 to-violet-600 border-indigo-500/30 text-white mt-1"}`}>
                                                    {!isUser && <Sparkles className="w-4 h-4" />}
                                                </div>

                                                <div className="space-y-2 flex-1 min-w-0">
                                                    <div className={`px-5 py-3.5 text-sm leading-relaxed ${isUser ? "bg-zinc-800 text-zinc-100 rounded-3xl" : "bg-transparent text-zinc-200"}`}>
                                                        {isStreamingPlaceholder && !item.content ? (
                                                            <div className="flex items-center gap-1.5 text-zinc-500 py-1">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
                                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]" />
                                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]" />
                                                            </div>
                                                        ) : (
                                                            <p className="whitespace-pre-wrap break-words">{item.content}</p>
                                                        )}
                                                    </div>

                                                    {!isUser && item.citations && item.citations.length > 0 && (
                                                        <div className="flex flex-wrap items-center gap-2 px-2 animate-fade-in mt-1">
                                                            {item.citations.map((cite: any, i: number) => (
                                                                <span key={i} className="inline-flex items-center gap-1.5 text-[10px] text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 font-mono cursor-default hover:bg-zinc-800 hover:text-zinc-200 transition-colors" title={cite.documentName}>
                                                                    <BookOpen className="w-3 h-3 text-indigo-400" />
                                                                    {cite.documentName.split("_").slice(1).join("_") || cite.documentName} (Trang {cite.page})
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Input Chat Styling giống Gemini */}
            <div className="absolute bottom-0 w-full bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent pt-10 pb-6 px-4 flex flex-col items-center">
                <div className="max-w-3xl w-full relative">
                    <form
                        onSubmit={handleSendMessage}
                        className="flex items-end gap-2 bg-zinc-800/60 backdrop-blur-xl border border-zinc-700/50 hover:border-zinc-600 focus-within:border-zinc-500 focus-within:bg-zinc-800/80 rounded-[32px] pl-6 pr-2 py-2 shadow-2xl transition-all"
                    >
                        <textarea
                            value={messageInput}
                            onChange={(e) => {
                                setMessageInput(e.target.value);
                                e.target.style.height = 'auto';
                                e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage(e as any);
                                }
                            }}
                            placeholder={isStreaming ? "Đang phản hồi..." : "Nhập câu hỏi tại đây..."}
                            disabled={isStreaming}
                            rows={1}
                            className="flex-1 max-h-[150px] bg-transparent border-none text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-0 disabled:opacity-60 resize-none py-2.5 custom-scrollbar"
                        />
                        <button
                            type="submit"
                            disabled={!messageInput.trim() || isStreaming}
                            className="w-10 h-10 mb-0.5 rounded-full bg-zinc-200 hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-900 flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-sm"
                        >
                            {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
                        </button>
                    </form>
                    <p className="text-[10px] text-zinc-500 text-center mt-3 font-medium">
                        AI có thể mắc lỗi. Hãy luôn kiểm tra lại nguồn trích dẫn từ tài liệu.
                    </p>
                </div>
            </div>
        </section>
    );
}

export function ChatRoom() {
    return (
        <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>}>
            <ChatRoomContent />
        </Suspense>
    );
}