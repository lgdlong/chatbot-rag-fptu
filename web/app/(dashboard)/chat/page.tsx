"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { api, streamChat } from "@/lib/api";
import Link from "next/link";
import {
  ArrowLeft,
  MessageSquare,
  Send,
  Plus,
  Loader2,
  User,
  Bot,
  FileText,
  AlertCircle,
  Clock,
  Sparkles,
  BookOpen,
} from "lucide-react";

export default function ChatPage() {
  const queryClient = useQueryClient();

  // States
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState<string>("");

  // Streaming states
  const [streamingContent, setStreamingContent] = useState<string>("");
  const [streamingCitations, setStreamingCitations] = useState<any[]>([]);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamingError, setStreamingError] = useState<string | null>(null);

  const parentRef = useRef<HTMLDivElement>(null);

  // 1. Session Query
  const { data: sessionData, isLoading: isSessionLoading } = useQuery({
    queryKey: ["session"],
    queryFn: () => api.getSession().catch(() => null),
    retry: false,
  });

  const isLoggedIn = !!sessionData?.user;

  // 2. Dev login mutation
  const loginMutation = useMutation({
    mutationFn: api.devLogin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
    },
  });

  // 3. Courses Query
  const { data: coursesData, isLoading: isCoursesLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: api.getCourses,
    enabled: isLoggedIn,
    select: (data) => {
      if (data?.courses?.length > 0 && !selectedCourseId) {
        setSelectedCourseId(data.courses[0].id);
      }
      return data;
    },
  });

  // 4. Chat Sessions Query
  const { data: chatSessionsData, isLoading: isSessionsLoading } = useQuery({
    queryKey: ["chat-sessions"],
    queryFn: api.getChatSessions,
    enabled: isLoggedIn,
    select: (data) => {
      // Auto-select latest session if none is selected
      if (data?.sessions?.length > 0 && !activeSessionId) {
        setActiveSessionId(data.sessions[0].id);
      }
      return data;
    },
  });

  // 5. Active Session Details (Messages)
  const { data: activeSessionData, isLoading: isMessagesLoading } = useQuery({
    queryKey: ["chat-session-details", activeSessionId],
    queryFn: () => api.getChatSessionDetails(activeSessionId!),
    enabled: isLoggedIn && !!activeSessionId,
  });

  // 6. Create Chat Session Mutation
  const createSessionMutation = useMutation({
    mutationFn: (courseId: string) => api.createChatSession(courseId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
      setActiveSessionId(data.session.id);
    },
  });

  // Scroll to bottom when messages or streaming content changes
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

  // Handle Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeSessionId || isStreaming) return;

    const userMessage = messageInput;
    setMessageInput("");
    setStreamingContent("");
    setStreamingCitations([]);
    setStreamingError(null);
    setIsStreaming(true);

    // Add user message to UI immediately by modifying query cache or just setting streaming states
    // Invalidate queries so user message is loaded in background
    queryClient.setQueryData(
      ["chat-session-details", activeSessionId],
      (old: any) => {
        if (!old || !old.session) return old;
        return {
          ...old,
          session: {
            ...old.session,
            messages: [
              ...old.session.messages,
              {
                id: "temp-user-msg",
                sender: "USER",
                content: userMessage,
                createdAt: new Date().toISOString(),
              },
            ],
          },
        };
      },
    );

    // Call SSE streaming
    await streamChat(
      activeSessionId,
      userMessage,
      (chunk) => {
        setStreamingContent((prev) => prev + chunk);
      },
      (citations) => {
        setStreamingCitations(citations);
      },
      (error) => {
        setStreamingError(error);
        setIsStreaming(false);
      },
    );

    // Finish streaming, reset and refetch
    setIsStreaming(false);
    queryClient.invalidateQueries({
      queryKey: ["chat-session-details", activeSessionId],
    });
    queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
  };

  const handleCreateNewSession = () => {
    if (!selectedCourseId) return;
    createSessionMutation.mutate(selectedCourseId);
  };

  const courses = coursesData?.courses || [];
  const chatSessions = chatSessionsData?.sessions || [];
  const activeSession = activeSessionData?.session;
  const messages = activeSession?.messages || [];

  const selectedCourse = courses.find((c: any) => c.id === selectedCourseId);

  // Virtual items list for TanStack Virtual
  const virtualItems: any[] = [
    ...messages,
    ...(isStreaming
      ? [
          {
            id: "streaming-placeholder",
            sender: "BOT",
            content: streamingContent,
            citations: streamingCitations,
            isStreamingPlaceholder: true,
          },
        ]
      : []),
    ...(streamingError
      ? [
          {
            id: "error-placeholder",
            isErrorPlaceholder: true,
            error: streamingError,
          },
        ]
      : []),
  ];

  const rowVirtualizer = useVirtualizer({
    count: virtualItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 5,
  });

  return (
    <div className="h-[100dvh] w-full flex flex-col font-sans bg-zinc-950 text-zinc-100 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

      {/* Container split into Sidebar and Chat space */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* SIDEBAR */}
        <aside className="w-full lg:w-80 bg-zinc-900/50 backdrop-blur-md border-r border-zinc-800/80 flex flex-col shrink-0 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-zinc-800/60 flex items-center justify-between gap-3">
            <Link
              href="/"
              className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center transition-colors text-zinc-400 hover:text-zinc-100 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex-1 text-center lg:text-left">
              <h2 className="text-xs font-bold text-zinc-300">
                Lịch sử hội thoại
              </h2>
            </div>
            {isLoggedIn && (
              <button
                onClick={handleCreateNewSession}
                disabled={createSessionMutation.isPending || !selectedCourseId}
                className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-colors disabled:opacity-40 cursor-pointer"
                title="Tạo hội thoại mới"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* User Status Check */}
          {!isSessionLoading && !isLoggedIn && (
            <div className="p-4 flex-1 flex flex-col items-center justify-center text-center gap-3">
              <AlertCircle className="w-6 h-6 text-amber-500" />
              <p className="text-[10px] text-zinc-400">
                Yêu cầu đăng nhập nhanh để kiểm thử Chat RAG
              </p>
              <button
                onClick={() => loginMutation.mutate()}
                className="text-[10px] bg-amber-600 hover:bg-amber-500 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Dev Auto Login
              </button>
            </div>
          )}

          {isLoggedIn && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Course selection filters */}
              <div className="p-3 border-b border-zinc-800/40">
                <label className="text-[10px] font-bold text-zinc-500 block mb-1">
                  Môn học hiện tại
                </label>
                <select
                  value={selectedCourseId || ""}
                  onChange={(e) => setSelectedCourseId(e.target.value || null)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1.5 px-2 text-xs font-semibold text-zinc-200 outline-none focus:border-indigo-500/50"
                >
                  <option value="">-- Chọn môn học --</option>
                  {courses.map((course: any) => (
                    <option key={course.id} value={course.id}>
                      {course.name} ({course.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Sessions List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {isSessionsLoading ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-xs text-zinc-500">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Đang nạp hội thoại...
                  </div>
                ) : chatSessions.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500 text-[10px]">
                    Chưa có phiên chat nào. Bấm nút "+" để bắt đầu.
                  </div>
                ) : (
                  chatSessions.map((session: any) => {
                    const isSelected = activeSessionId === session.id;
                    return (
                      <button
                        key={session.id}
                        onClick={() => setActiveSessionId(session.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                          isSelected
                            ? "bg-zinc-900 border-zinc-800 text-indigo-400 shadow-md"
                            : "bg-transparent border-transparent text-zinc-400 hover:bg-zinc-900/30 hover:text-zinc-200"
                        }`}
                      >
                        <MessageSquare className="w-4 h-4 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-zinc-200 truncate">
                            {session.course?.name || "Môn học RAG"}
                          </p>
                          <p className="text-[9px] text-zinc-500 flex items-center gap-1 mt-0.5 font-mono">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(session.updatedAt).toLocaleDateString(
                              "vi-VN",
                            )}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </aside>

        {/* MAIN CHAT AREA */}
        <section className="flex-1 flex flex-col bg-zinc-950/80 backdrop-blur-sm relative overflow-hidden min-w-0">
          {/* Active Session Header */}
          <div className="p-4 border-b border-zinc-800/60 bg-zinc-900/20 flex items-center justify-between shrink-0">
            {activeSession ? (
              <div>
                <h3 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  {activeSession.course?.name}
                </h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  Mã lớp: {activeSession.course?.code} | Session ID:{" "}
                  {activeSession.id.slice(0, 8)}...
                </p>
              </div>
            ) : (
              <div>
                <h3 className="text-xs font-bold text-zinc-400">
                  Chưa chọn phiên làm việc
                </h3>
                <p className="text-[10px] text-zinc-600 mt-0.5">
                  Vui lòng tạo hoặc chọn một lịch sử hội thoại
                </p>
              </div>
            )}

            {/* Status bar */}
            {isStreaming && (
              <span className="text-[10px] text-indigo-400 flex items-center gap-1.5 animate-pulse bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-lg font-semibold">
                <Loader2 className="w-3 h-3 animate-spin" />
                AI RAG Đang stream...
              </span>
            )}
          </div>

          {/* Messages Display Box */}
          <div
            ref={parentRef}
            className="flex-1 overflow-y-auto min-h-0 custom-scrollbar"
          >
            {!activeSessionId ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-2 text-zinc-500">
                <MessageSquare className="w-8 h-8 text-zinc-600" />
                <p className="text-xs font-medium">
                  Bắt đầu đặt câu hỏi cho trợ lý học tập
                </p>
                <p className="text-[10px] text-zinc-600">
                  Nội dung trả lời sẽ được trích dẫn trực tiếp từ các file slide
                  đã nạp.
                </p>
              </div>
            ) : isMessagesLoading ? (
              <div className="h-full flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <p className="text-xs text-zinc-500 font-medium">
                  Đang nạp nội dung hội thoại...
                </p>
              </div>
            ) : virtualItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-2 text-zinc-500">
                <MessageSquare className="w-8 h-8 text-zinc-600" />
                <p className="text-xs font-medium">
                  Bắt đầu đặt câu hỏi cho trợ lý học tập
                </p>
                <p className="text-[10px] text-zinc-600">
                  Nội dung trả lời sẽ được trích dẫn trực tiếp từ các file slide
                  đã nạp.
                </p>
              </div>
            ) : (
              <div className="p-4">
                <div
                  style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: "100%",
                    position: "relative",
                  }}
                >
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const item = virtualItems[virtualRow.index];
                    if (!item) return null;

                    const isError =
                      "isErrorPlaceholder" in item && item.isErrorPlaceholder;
                    const isStreamingPlaceholder =
                      "isStreamingPlaceholder" in item &&
                      item.isStreamingPlaceholder;

                    return (
                      <div
                        key={virtualRow.key}
                        data-index={virtualRow.index}
                        ref={rowVirtualizer.measureElement}
                        className="absolute top-0 left-0 w-full pb-4"
                        style={{
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        {isError ? (
                          <div className="flex items-start gap-2 max-w-[85%] mr-auto text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-2xl rounded-tl-none">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>Lỗi stream: {item.error}</span>
                          </div>
                        ) : isStreamingPlaceholder ? (
                          <div className="flex gap-3 max-w-[85%] mr-auto">
                            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center justify-center shrink-0">
                              <Bot className="w-4 h-4" />
                            </div>

                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="bg-zinc-900/60 border border-zinc-800/60 text-zinc-200 rounded-2xl rounded-tl-none px-4 py-3 text-xs leading-relaxed">
                                {item.content ? (
                                  <p className="whitespace-pre-wrap break-words">
                                    {item.content}
                                  </p>
                                ) : (
                                  <div className="flex items-center gap-2 text-zinc-500 py-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]" />
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]" />
                                  </div>
                                )}
                              </div>

                              {item.citations && item.citations.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5 px-1 animate-fade-in">
                                  <span className="text-[9px] font-bold text-zinc-500 flex items-center gap-1 mr-1">
                                    <BookOpen className="w-2.5 h-2.5" />
                                    Nguồn tham khảo:
                                  </span>
                                  {item.citations.map(
                                    (cite: any, i: number) => (
                                      <span
                                        key={i}
                                        className="inline-flex items-center gap-1 text-[9px] text-zinc-400 bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 font-mono cursor-default"
                                        title={cite.documentName}
                                      >
                                        <FileText className="w-2.5 h-2.5 text-zinc-500" />
                                        {cite.documentName
                                          .split("_")
                                          .slice(1)
                                          .join("_") || cite.documentName}{" "}
                                        (Slide {cite.page})
                                      </span>
                                    ),
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          (() => {
                            const isUser = item.sender === "USER";
                            return (
                              <div
                                className={`flex gap-3 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                              >
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                                    isUser
                                      ? "bg-indigo-600/10 border-indigo-500/30 text-indigo-400"
                                      : "bg-zinc-900 border-zinc-800 text-zinc-300"
                                  }`}
                                >
                                  {isUser ? (
                                    <User className="w-4 h-4" />
                                  ) : (
                                    <Bot className="w-4 h-4" />
                                  )}
                                </div>

                                <div className="space-y-1.5 flex-1 min-w-0">
                                  <div
                                    className={`rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                                      isUser
                                        ? "bg-indigo-600 text-white font-medium rounded-tr-none"
                                        : "bg-zinc-900/60 border border-zinc-800/60 text-zinc-200 rounded-tl-none font-normal"
                                    }`}
                                  >
                                    <p className="whitespace-pre-wrap break-words">
                                      {item.content}
                                    </p>
                                  </div>

                                  {!isUser &&
                                    item.citations &&
                                    item.citations.length > 0 && (
                                      <div className="flex flex-wrap items-center gap-1.5 px-1">
                                        <span className="text-[9px] font-bold text-zinc-500 flex items-center gap-1 mr-1">
                                          <BookOpen className="w-2.5 h-2.5" />
                                          Nguồn tham khảo:
                                        </span>
                                        {item.citations.map(
                                          (cite: any, i: number) => (
                                            <span
                                              key={i}
                                              className="inline-flex items-center gap-1 text-[9px] text-zinc-400 bg-zinc-900 hover:text-zinc-200 border border-zinc-800 rounded px-1.5 py-0.5 font-mono cursor-default"
                                              title={cite.documentName}
                                            >
                                              <FileText className="w-2.5 h-2.5 text-zinc-500" />
                                              {cite.documentName
                                                .split("_")
                                                .slice(1)
                                                .join("_") ||
                                                cite.documentName}{" "}
                                              (Slide {cite.page})
                                            </span>
                                          ),
                                        )}
                                      </div>
                                    )}
                                </div>
                              </div>
                            );
                          })()
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Message Input Panel */}
          {activeSessionId && (
            <div className="p-4 border-t border-zinc-800/60 bg-zinc-900/10 shrink-0">
              <form
                onSubmit={handleSendMessage}
                className="flex gap-2 items-center"
              >
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={
                    isStreaming
                      ? "Đang phản hồi..."
                      : "Hỏi trợ lý AI về tài liệu..."
                  }
                  disabled={isStreaming}
                  className="flex-1 h-11 bg-zinc-900/60 border border-zinc-800/80 rounded-xl px-4 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 outline-none disabled:opacity-60 transition-all font-normal"
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim() || isStreaming}
                  className="w-11 h-11 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-zinc-850 disabled:text-zinc-600 text-white rounded-xl flex items-center justify-center transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-500/20 shrink-0 cursor-pointer"
                >
                  {isStreaming ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>
              <p className="text-[9px] text-zinc-500 text-center mt-2.5">
                Mô hình có thể phản hồi thiếu sót hoặc sai lệch. Hãy luôn đối
                chiếu tài liệu nguồn được trích dẫn.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
