"use client";

import { AuthProvider } from "@/contexts/auth-context";
import { BranchProvider } from "@/contexts/branch-context";
import { BoardQueueProvider } from "@/contexts/board-queue-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <BranchProvider>
        <BoardQueueProvider>{children}</BoardQueueProvider>
      </BranchProvider>
    </AuthProvider>
  );
}
