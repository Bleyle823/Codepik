"use client";

import type { ReactNode } from "react";
import { ConvexClientProvider } from "./convex-client-provider";

export function Providers({ children }: { children: ReactNode }) {
  return <ConvexClientProvider>{children}</ConvexClientProvider>;
}

