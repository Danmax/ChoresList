"use client";

import { usePathname } from "next/navigation";
import { ParentPinGate } from "@/components/parent-pin-gate";

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const isRoot = pathname === "/parent" || pathname === "/parent/";

  if (isRoot) return <>{children}</>;
  return <ParentPinGate>{children}</ParentPinGate>;
}
