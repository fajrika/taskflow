import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Taskflow — Kelola Pekerjaan",
  description:
    "Kelola pekerjaan utama & side project, deadline, Gantt chart, dan pengingat harian via push/Telegram/Discord.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Taskflow",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="dark">
      <body>{children}</body>
    </html>
  );
}
