'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Layers, GraduationCap, Presentation, ShieldCheck, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const queryClient = useQueryClient();
  const router = useRouter();

  // Mutation xử lý đăng nhập phân quyền
  const loginMutation = useMutation({
    mutationFn: (role: 'student' | 'lecturer' | 'admin') => api.devLogin(role),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['session'] });

      // Chuyển hướng màn hình dựa trên Role đúng theo SRS
      if (data.user.role === 'student') {
        router.push('/student/chat');
      } else if (data.user.role === 'lecturer') {
        router.push('/lecturer/courses');
      } else if (data.user.role === 'admin') {
        router.push('/admin/dashboard');
      }
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 relative overflow-hidden">
      {/* Background mờ ảo */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />

      {/* Form Đăng nhập giữa trang */}
      <div className="w-full max-w-md bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-8 z-10 shadow-2xl shadow-black/50">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4">
            <Layers className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-50 mb-2">FPTU Chatbot RAG</h1>
          <p className="text-sm text-zinc-400">
            Hệ thống hỏi đáp và quản lý tài liệu thông minh. Vui lòng đăng nhập để tiếp tục.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => loginMutation.mutate('student')}
            disabled={loginMutation.isPending}
            className="w-full h-12 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 text-zinc-200 rounded-xl flex items-center justify-center gap-3 transition-all cursor-pointer disabled:opacity-50"
          >
            {loginMutation.isPending && loginMutation.variables === 'student' ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <GraduationCap className="w-5 h-5 text-indigo-400" />
            )}
            <span className="font-medium">Đăng nhập quyền Sinh viên</span>
          </button>

          <button
            onClick={() => loginMutation.mutate('lecturer')}
            disabled={loginMutation.isPending}
            className="w-full h-12 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 text-zinc-200 rounded-xl flex items-center justify-center gap-3 transition-all cursor-pointer disabled:opacity-50"
          >
            {loginMutation.isPending && loginMutation.variables === 'lecturer' ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Presentation className="w-5 h-5 text-amber-400" />
            )}
            <span className="font-medium">Đăng nhập quyền Giảng viên</span>
          </button>

          <button
            onClick={() => loginMutation.mutate('admin')}
            disabled={loginMutation.isPending}
            className="w-full h-12 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 text-zinc-200 rounded-xl flex items-center justify-center gap-3 transition-all cursor-pointer disabled:opacity-50"
          >
            {loginMutation.isPending && loginMutation.variables === 'admin' ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            )}
            <span className="font-medium">Đăng nhập quyền Admin</span>
          </button>
        </div>

        <p className="text-center text-[10px] text-zinc-500 mt-8">
          Portal kiểm thử hệ thống. Dữ liệu đăng nhập được giả lập.
        </p>
      </div>
    </div>
  );
}