"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { SessionProvider } from "@/lib/session";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1, staleTime: 30_000 } } }),
  );
  return (
    <QueryClientProvider client={client}>
      <SessionProvider>{children}</SessionProvider>
      {/* react-hot-toast, top-center like the live app (styling is a best guess for the dark theme). */}
      <Toaster
        position="top-center"
        containerStyle={{ zIndex: 9999 }}
        toastOptions={{
          className: "font-karla text-sm",
          style: { background: "var(--popover)", color: "var(--popover-foreground)", border: "1px solid var(--ui-border-color)" },
        }}
      />
    </QueryClientProvider>
  );
}
