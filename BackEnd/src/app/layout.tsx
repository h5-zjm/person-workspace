import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BackEnd Service",
  description: "Next.js streaming API service"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
