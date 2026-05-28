import type { Metadata } from "next";
import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import { Roboto } from "next/font/google";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./globals.css";
import Providers from "./providers";

const roboto = Roboto({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-roboto",
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
      className={`h-full antialiased ${roboto.variable}`}
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
