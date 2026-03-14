import type { Metadata } from "next";
import "./globals.css";
import RouteClassManager from "@/components/RouteClassManager";
import RouteTransitionShell from "@/components/RouteTransitionShell";

export const metadata: Metadata = {
  title: "Lingo Pulse",
  description: "Real-time translation coverage, quality scores, and localization health for your codebase.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <RouteClassManager />
        <RouteTransitionShell>{children}</RouteTransitionShell>
      </body>
    </html>
  );
}
