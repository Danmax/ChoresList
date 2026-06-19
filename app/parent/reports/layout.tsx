import { PluginPageGate } from "@/lib/plugins/page-gate";

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return <PluginPageGate pluginKey="reports-coaching">{children}</PluginPageGate>;
}
