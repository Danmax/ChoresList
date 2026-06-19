import { PluginPageGate } from "@/lib/plugins/page-gate";

export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  return <PluginPageGate pluginKey="family-calendar">{children}</PluginPageGate>;
}
