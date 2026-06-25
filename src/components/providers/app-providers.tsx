"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster
        closeButton
        richColors
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: "12px",
            borderColor: "rgba(247, 124, 32, 0.22)",
          },
        }}
      />
    </SessionProvider>
  );
}
