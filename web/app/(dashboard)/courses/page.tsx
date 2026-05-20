"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  User,
  AlertCircle,
  Trash2,
} from "lucide-react";

export default function CoursesPage() {
  const queryClient = useQueryClient();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [documentActionError, setDocumentActionError] = useState<string | null>(
    null,
  );
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(
    null,
  );

  // 1. Session query
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
    },
  });

  // 3. Courses query
  const { data: coursesData, isLoading: isCoursesLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: api.getCourses,
    enabled: isLoggedIn,
    select: (data) => {
      // Auto-select first course if none selected yet
      if (data?.courses?.length > 0 && !selectedCourseId) {
        setSelectedCourseId(data.courses[0].id);
      }
      return data;
    },
  });

  // 4. Documents query (polls every 2s if any doc is PENDING or PROCESSING)
  const {
    data: docsData,
    isLoading: isDocsLoading,
    refetch: refetchDocs,
    isFetching: isDocsFetching,
  } = useQuery({
    queryKey: ["documents", selectedCourseId],
    queryFn: () => api.getDocuments(selectedCourseId!),
    enabled: isLoggedIn && !!selectedCourseId,
    refetchInterval: (query) => {
      const docs = query.state.data?.documents || [];
      const hasPendingOrProcessing = docs.some(
        (doc: any) => doc.status === "PENDING" || doc.status === "PROCESSING",
      );
      return hasPendingOrProcessing ? 2000 : false;
    },
  });

  // 5. Upload document mutation
  const uploadMutation = useMutation({
    mutationFn: ({ courseId, file }: { courseId: string; file: File }) =>
      api.uploadDocument(courseId, file),
    onSuccess: () => {
      setUploadFile(null);
      setUploadError(null);
      queryClient.invalidateQueries({
        queryKey: ["documents", selectedCourseId],
      });
    },
    onError: (err: any) => {
      setUploadError(err.message || "Tải tệp lên thất bại");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({
      courseId,
      documentId,
    }: {
      courseId: string;
      documentId: string;
    }) => api.deleteDocument(courseId, documentId),
    onMutate: ({ documentId }) => {
      setDeletingDocumentId(documentId);
      setDocumentActionError(null);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["documents", variables.courseId],
      });
    },
    onError: (err: any) => {
      setDocumentActionError(err.message || "Xóa tài liệu thất bại");
    },
    onSettled: () => {
      setDeletingDocumentId(null);
    },
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf") {
        setUploadFile(file);
        setUploadError(null);
      } else {
        setUploadError("Chỉ hỗ trợ tệp định dạng PDF");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === "application/pdf") {
        setUploadFile(file);
        setUploadError(null);
      } else {
        setUploadError("Chỉ hỗ trợ tệp định dạng PDF");
      }
    }
  };

  const handleUploadSubmit = () => {
    if (!selectedCourseId || !uploadFile) return;
    uploadMutation.mutate({ courseId: selectedCourseId, file: uploadFile });
  };

  const courses = coursesData?.courses || [];
  const documents = docsData?.documents || [];
  const selectedCourse = courses.find((c: any) => c.id === selectedCourseId);

  return (
    <div className="flex-1 min-h-screen flex flex-col font-sans bg-zinc-950 text-zinc-100 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] right-[-10%] w-100 h-100 rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-15%] w-125 h-125 rounded-full bg-violet-600/5 blur-[140px] pointer-events-none" />

      {/* Container */}
      <div className="max-w-6xl mx-auto w-full px-6 py-10 flex-1 flex flex-col z-10">
        {/* Navigation Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800/60 mb-8">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-9 h-9 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center transition-colors text-zinc-400 hover:text-zinc-100 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-zinc-50">
                Tài liệu môn học
              </h1>
              <p className="text-xs text-zinc-400">
                Tải lên slide PDF bài giảng để trợ lý AI học nội dung
              </p>
            </div>
          </div>

          {/* User auth badge */}
          {isLoggedIn && sessionData?.user && (
            <div className="flex items-center gap-2 text-xs bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-medium text-zinc-300">
                {sessionData.user.name}
              </span>
            </div>
          )}
        </div>

        {/* Not Logged In Banner */}
        {!isSessionLoading && !isLoggedIn && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 mb-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-amber-400 text-sm">
                  Chưa đăng nhập để kiểm thử API
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed mt-1 max-w-xl">
                  Để bảo mật dữ liệu đa trường (Multi-tenant isolation), hệ
                  thống yêu cầu một phiên làm việc hợp lệ. Nhấn nút để tự động
                  đăng nhập nhanh làm tài khoản sinh viên kiểm thử.
                </p>
              </div>
            </div>
            <button
              onClick={() => loginMutation.mutate()}
              disabled={loginMutation.isPending}
              className="bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs px-5 py-2.5 rounded-xl transition-all shadow-md active:bg-amber-700 whitespace-nowrap cursor-pointer"
            >
              {loginMutation.isPending ? "Đang xác thực..." : "Dev Quick Login"}
            </button>
          </div>
        )}

        {isLoggedIn && (
          <div className="grid lg:grid-cols-3 gap-8 flex-1">
            {/* Sidebar - Course List & Upload Box */}
            <div className="lg:col-span-1 space-y-6">
              {/* Course Selector Card */}
              <div className="bg-zinc-900/40 backdrop-blur-md rounded-3xl border border-zinc-800/80 p-6">
                <h2 className="text-sm font-semibold text-zinc-400 mb-4">
                  Chọn môn học
                </h2>
                {isCoursesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-zinc-500 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    Đang nạp môn học...
                  </div>
                ) : courses.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-2">
                    Không tìm thấy môn học nào
                  </p>
                ) : (
                  <div className="space-y-2">
                    {courses.map((course: any) => (
                      <button
                        key={course.id}
                        onClick={() => setSelectedCourseId(course.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-xs font-semibold flex flex-col gap-1 cursor-pointer ${
                          selectedCourseId === course.id
                            ? "bg-indigo-600/10 border-indigo-500/30 text-indigo-300"
                            : "bg-zinc-900/20 border-zinc-800/40 text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200"
                        }`}
                      >
                        <span className="text-zinc-200">{course.name}</span>
                        <span className="text-[10px] text-zinc-500 font-mono uppercase">
                          {course.code}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* PDF Upload Card */}
              {selectedCourseId && (
                <div className="bg-zinc-900/40 backdrop-blur-md rounded-3xl border border-zinc-800/80 p-6 space-y-4">
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-200">
                      Tải tài liệu PDF
                    </h2>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Tải lên slide của môn: {selectedCourse?.name}
                    </p>
                  </div>

                  {/* Drag and Drop Zone */}
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`border border-dashed rounded-2xl p-6 text-center transition-all relative flex flex-col items-center justify-center min-h-35 ${
                      dragActive
                        ? "border-indigo-500 bg-indigo-500/5"
                        : "border-zinc-800 bg-zinc-950/20 hover:border-zinc-700"
                    }`}
                  >
                    <input
                      type="file"
                      id="pdf-file-input"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {uploadFile ? (
                      <div className="space-y-3">
                        <FileText className="w-10 h-10 text-indigo-400 mx-auto" />
                        <div
                          className="max-w-50 mx-auto text-xs font-medium text-zinc-300 truncate"
                          title={uploadFile.name}
                        >
                          {uploadFile.name}
                        </div>
                        <button
                          onClick={() => setUploadFile(null)}
                          className="text-[10px] text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                        >
                          Xóa tệp đã chọn
                        </button>
                      </div>
                    ) : (
                      <label
                        htmlFor="pdf-file-input"
                        className="cursor-pointer space-y-2"
                      >
                        <Upload className="w-8 h-8 text-zinc-500 mx-auto" />
                        <p className="text-xs text-zinc-300 font-medium">
                          Kéo thả tệp hoặc chọn từ máy
                        </p>
                        <p className="text-[10px] text-zinc-500 font-normal">
                          Chỉ chấp nhận tệp định dạng PDF
                        </p>
                      </label>
                    )}
                  </div>

                  {uploadError && (
                    <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    onClick={handleUploadSubmit}
                    disabled={!uploadFile || uploadMutation.isPending}
                    className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Đang tải lên...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Nạp vào Vector DB
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Main Area - Document Status List */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-zinc-900/40 backdrop-blur-md rounded-3xl border border-zinc-800/80 p-6 min-h-100 flex flex-col justify-between">
                {/* Header list */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800/60 pb-4">
                    <div>
                      <h2 className="text-base font-bold text-zinc-50">
                        Danh sách tài liệu đã nạp
                      </h2>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Tải lên slide PDF học liệu để hệ thống chunking &
                        indexing
                      </p>
                    </div>
                    {selectedCourseId && (
                      <button
                        onClick={() => refetchDocs()}
                        disabled={isDocsLoading}
                        className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors text-zinc-400 hover:text-zinc-100 disabled:opacity-50 cursor-pointer"
                        title="Tải lại danh sách"
                      >
                        <RefreshCw
                          className={`w-4 h-4 ${isDocsFetching ? "animate-spin text-indigo-400" : ""}`}
                        />
                      </button>
                    )}
                  </div>

                  {documentActionError && (
                    <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{documentActionError}</span>
                    </div>
                  )}

                  {/* List content */}
                  {!selectedCourseId ? (
                    <div className="text-center py-16 text-zinc-500 text-xs">
                      Vui lòng chọn một môn học ở danh sách bên trái
                    </div>
                  ) : isDocsLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                      <p className="text-xs text-zinc-500 font-medium">
                        Đang tải danh sách tài liệu...
                      </p>
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="text-center py-16 text-zinc-500 text-xs space-y-2">
                      <FileText className="w-8 h-8 text-zinc-600 mx-auto" />
                      <p>Chưa có tài liệu nào cho môn học này</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-800/40">
                      {documents.map((doc: any) => (
                        <div
                          key={doc.id}
                          className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-0 last:pb-0"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5 text-zinc-400">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <p
                                className="text-xs font-semibold text-zinc-200 line-clamp-1 break-all"
                                title={doc.name}
                              >
                                {doc.name}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-zinc-500 font-mono">
                                  ID: {doc.id.slice(0, 8)}...
                                </span>
                                <span className="w-1 h-1 rounded-full bg-zinc-700" />
                                <span className="text-[10px] text-zinc-500">
                                  {new Date(doc.createdAt).toLocaleString(
                                    "vi-VN",
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="flex items-center gap-2">
                            {doc.status === "COMPLETED" && (
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Đã sẵn sàng
                              </span>
                            )}
                            {doc.status === "PENDING" && (
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-full animate-pulse">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                Chờ xử lý
                              </span>
                            )}
                            {doc.status === "PROCESSING" && (
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full animate-pulse">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Đang xử lý
                              </span>
                            )}
                            {doc.status === "FAILED" && (
                              <span
                                className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full"
                                title={doc.errorMessage || "Lỗi không rõ"}
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Lỗi nạp dữ liệu
                              </span>
                            )}
                            {doc.status !== "PENDING" &&
                              doc.status !== "PROCESSING" && (
                                <button
                                  onClick={() => {
                                    if (!selectedCourseId) return;

                                    const confirmed = window.confirm(
                                      `Xóa tài liệu "${doc.name}"? Thao tác này sẽ xóa vector và các chunk PDF đã sinh.`,
                                    );

                                    if (!confirmed) {
                                      return;
                                    }

                                    deleteMutation.mutate({
                                      courseId: selectedCourseId,
                                      documentId: doc.id,
                                    });
                                  }}
                                  disabled={deletingDocumentId === doc.id}
                                  className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Xóa tài liệu"
                                >
                                  {deletingDocumentId === doc.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                  {deletingDocumentId === doc.id
                                    ? "Đang xóa"
                                    : "Xóa"}
                                </button>
                              )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer notes */}
                <div className="border-t border-zinc-800/40 pt-4 mt-6 text-[10px] text-zinc-500 flex items-center justify-between">
                  <span>Tự động cập nhật trạng thái khi file đang xử lý</span>
                  {selectedCourseId &&
                    documents.some(
                      (d: any) =>
                        d.status === "PENDING" || d.status === "PROCESSING",
                    ) && (
                      <span className="flex items-center gap-1 text-indigo-400 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        Đang đồng bộ...
                      </span>
                    )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
