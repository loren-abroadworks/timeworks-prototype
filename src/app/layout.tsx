import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
// Imported AFTER globals.css on purpose: the live app's compiled CSS wins where classes overlap.
import "@/styles/timeworks-compiled.css";
import "@/styles/timeworks-loader.css";
import "@/styles/fonts.css";
import { Providers } from "./providers";
import { APPEARANCE_INIT_SCRIPT } from "@/components/layout/appearance";

export const metadata: Metadata = {
  title: "Dashboard | TimeWorks",
  description: "Track time, manage projects, and boost productivity with our modern time tracking solution.",
  applicationName: "TimeWorks",
};

export const viewport: Viewport = { themeColor: "#222222", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Same attributes as the live app: dark mode, blue accent, no background scene.
    <html lang="en" className="zA4O2W_variable _19wr9q_variable dark" data-mode="dark" data-accent="blue" data-scene="none" suppressHydrationWarning>
      <head>
        {/* Applies saved Appearance preferences (theme / accent / scene / blur / wallpaper) before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_INIT_SCRIPT }} />
      </head>
      <body className="zA4O2W_variable _19wr9q_variable antialiased">
        <Providers>
          <Suspense>{children}</Suspense>
        </Providers>
      </body>
    </html>
  );
}
