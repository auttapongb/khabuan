"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      theme="dark"
      position="top-center"
      offset={72}
      toastOptions={{
        style: {
          background: "#ffffff",
          border: "1px solid rgba(6, 199, 85, 0.22)",
          color: "#e6e9ee",
          fontFamily: "var(--font-body), Nunito, system-ui, sans-serif",
        },
      }}
    />
  );
}
