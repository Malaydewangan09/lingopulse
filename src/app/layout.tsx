import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lingo Pulse",
  description: "Real-time translation coverage, quality scores, and localization health for your codebase.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
