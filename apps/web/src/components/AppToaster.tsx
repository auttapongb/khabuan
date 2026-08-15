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
          background: "#1a1d21",
          border: "1px solid rgba(228, 207, 160, 0.22)",
          color: "#e6e9ee",
          fontFamily: "var(--font-body), Nunito, system-ui, sans-serif",
        },
      }}
    />
  );
}
