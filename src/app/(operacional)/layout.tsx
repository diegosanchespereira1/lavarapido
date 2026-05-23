"use client";

import { AppShell } from "@/components/ops/AppShell";

export default function OperacionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
