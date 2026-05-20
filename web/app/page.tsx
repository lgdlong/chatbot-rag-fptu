'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import Link from 'next/link'
import { 
  BookOpen, 
  MessageSquare, 
  Shield, 
  Zap, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight,
  User,
  Activity,
  Layers
} from 'lucide-react'

export default function Home() {
  const queryClient = useQueryClient()

  // Get active session
  const { data: sessionData, isLoading, isError } = useQuery({
    queryKey: ['session'],
    queryFn: () => api.getSession().catch(() => null),
    retry: false,
  })

  // Dev login mutation
  const loginMutation = useMutation({
    mutationFn: api.devLogin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session'] })
    },
  })

  const handleDevLogin = () => {
    loginMutation.mutate()
  }

  const isLoggedIn = !!sessionData?.user

  return (
    <div className="flex-1 min-h-screen flex flex-col font-sans bg-zinc-950 text-zinc-100 selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[140px] pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-6xl mx-auto w-full px-6 py-12 flex-1 flex flex-col justify-between z-10">
        
        {/* Header / Session Check */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-8 border-b border-zinc-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 via-zinc-100 to-zinc-300">
                FPTU Chatbot RAG
              </h1>
              <p className="text-xs text-zinc-400">Portal Kiểm thử Hệ thống Nghiên cứu RAG</p>
            </div>
          </div>

          {/* Session Status Widget */}
          <div className="flex items-center gap-3 bg-zinc-900/65 backdrop-blur-md px-4 py-2 rounded-2xl border border-zinc-800/80 shadow-inner">
            {isLoading ? (
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="w-2 h-2 rounded-full bg-zinc-500 animate-pulse" />
                Đang kiểm tra phiên làm việc...
              </div>
            ) : isLoggedIn ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-zinc-300">Đã đăng nhập:</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20 max-w-[180px] truncate">
                  <User className="w-3.5 h-3.5" />
                  {sessionData.user.name}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs text-amber-400">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span>Chưa xác thực</span>
                </div>
                <button
                  onClick={handleDevLogin}
                  disabled={loginMutation.isPending}
                  className="text-xs bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium px-3.5 py-1.5 rounded-xl transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-500/20 cursor-pointer"
                >
                  {loginMutation.isPending ? 'Đang đăng nhập...' : 'Dev Auto-Login'}
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-1 flex flex-col justify-center py-16">
          <div className="text-center max-w-2xl mx-auto space-y-6 mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-indigo-300">
              <Activity className="w-3 h-3 text-indigo-400" />
              Công nghệ nhúng bài giảng đa phương thức
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-zinc-50 to-zinc-400">
              Trang kiểm thử quy trình RAG & Upload tài liệu
            </h2>
            <p className="text-zinc-400 text-base md:text-lg max-w-xl mx-auto leading-relaxed">
              Trải nghiệm thực tế quy trình nạp tài liệu PDF qua Golang worker, lập chỉ mục vector, và hỏi đáp trợ lý AI dựa trên tài liệu lớp học theo thời gian thực.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full">
            
            {/* Document Upload Card */}
            <div className="group bg-zinc-900/40 backdrop-blur-md rounded-3xl border border-zinc-800/80 p-8 flex flex-col justify-between hover:border-zinc-700 transition-all hover:bg-zinc-900/60 duration-300 hover:shadow-2xl hover:shadow-indigo-500/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-bl-full group-hover:bg-indigo-500/10 transition-all duration-300 pointer-events-none" />
              <div className="space-y-6">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/25">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-zinc-100 group-hover:text-indigo-400 transition-colors">
                    Nạp tài liệu & Upload PDF
                  </h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Tải lên tài liệu PDF bài giảng, tự động phân chia (Chunking) theo Slide học, sinh embedding và đẩy vào Qdrant Vector database. Hỗ trợ theo dõi trạng thái đồng bộ thời gian thực.
                  </p>
                </div>
              </div>
              <div className="pt-8">
                {isLoggedIn ? (
                  <Link
                    href="/courses"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-all group/btn"
                  >
                    Quản lý & Upload PDF
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                ) : (
                  <button
                    onClick={handleDevLogin}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-indigo-400 transition-all cursor-pointer"
                  >
                    Yêu cầu Đăng nhập để truy cập
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Chat RAG Card */}
            <div className="group bg-zinc-900/40 backdrop-blur-md rounded-3xl border border-zinc-800/80 p-8 flex flex-col justify-between hover:border-zinc-700 transition-all hover:bg-zinc-900/60 duration-300 hover:shadow-2xl hover:shadow-violet-500/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/5 rounded-bl-full group-hover:bg-violet-600/10 transition-all duration-300 pointer-events-none" />
              <div className="space-y-6">
                <div className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-400 flex items-center justify-center border border-violet-500/25">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-zinc-100 group-hover:text-violet-400 transition-colors">
                    Hỏi đáp AI RAG Chat
                  </h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Hội thoại trực tiếp với mô hình ngôn ngữ dựa trên tài liệu bài giảng đã tải lên. Hỗ trợ truyền dữ liệu dạng Stream (SSE) và trả về trích dẫn chi tiết nguồn slide đã tham chiếu.
                  </p>
                </div>
              </div>
              <div className="pt-8">
                {isLoggedIn ? (
                  <Link
                    href="/chat"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-violet-400 hover:text-violet-300 transition-all group/btn"
                  >
                    Bắt đầu Hỏi đáp RAG
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                ) : (
                  <button
                    onClick={handleDevLogin}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-indigo-400 transition-all cursor-pointer"
                  >
                    Yêu cầu Đăng nhập để truy cập
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

          </div>
        </main>

        {/* Footer info */}
        <footer className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-zinc-800/60 text-zinc-500 text-xs">
          <div className="flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-indigo-500/60 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-zinc-400 mb-0.5">Multi-tenant Isolation</p>
              <p className="leading-relaxed">Phân tách dữ liệu nghiêm ngặt giữa các trường (Tenant). Ngăn chặn rò rỉ dữ liệu chéo qua Middleware xác thực Hono.</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Zap className="w-4 h-4 text-amber-500/60 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-zinc-400 mb-0.5">Fast Ingestion Worker</p>
              <p className="leading-relaxed">Go Ingestion Worker chạy ngầm phân tách Slide PDF, nhúng nội dung và lưu trữ vào Qdrant qua hàng đợi Redis.</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-500/60 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-zinc-400 mb-0.5">SSE & Citation Streams</p>
              <p className="leading-relaxed">SSE Streaming cung cấp hiệu ứng phản hồi gõ chữ tức thì kèm theo chỉ số trang slide chính xác làm nguồn tham khảo.</p>
            </div>
          </div>
        </footer>

      </div>
    </div>
  )
}
