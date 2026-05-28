import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./globals.css";
import Providers from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FPTU Chatbot RAG Testing",
  description: "Trang kiểm thử hệ thống Hỏi đáp tài liệu môn học tích hợp RAG",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      {...mantineHtmlProps}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
      </head>
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
