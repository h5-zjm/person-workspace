import type { Metadata } from "next";
import "@person-workspace/ui/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Codex App Console",
  description: "Conversation workspace for streaming Codex output"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
