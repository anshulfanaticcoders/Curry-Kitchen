"use client";

import { MotionConfig } from "framer-motion";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { PackageCartProvider } from "@/components/providers/package-cart-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {/* Honour prefers-reduced-motion for every framer-motion animation. */}
      <MotionConfig reducedMotion="user">
      <PackageCartProvider>
        {children}
        <Toaster
          closeButton
          richColors
          position="bottom-right"
          toastOptions={{
            style: {
              borderRadius: "12px",
              borderColor: "rgba(247, 124, 32, 0.22)",
            },
          }}
        />
      </PackageCartProvider>
      </MotionConfig>
    </SessionProvider>
  );
}
