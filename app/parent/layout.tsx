"use client";

import { usePathname } from "next/navigation";
import { ParentManagementShell } from "@/components/parent-management-shell";
import { ParentPinGate } from "@/components/parent-pin-gate";

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const isRoot = pathname === "/parent" || pathname === "/parent/";

  if (isRoot) return <>{children}</>;
  return (
    <ParentPinGate>
      <ParentManagementShell>{children}</ParentManagementShell>
    </ParentPinGate>
  );
}
