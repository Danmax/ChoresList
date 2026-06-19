import { PluginPageGate } from "@/lib/plugins/page-gate";

export default function WellbeingLayout({ children }: { children: React.ReactNode }) {
  return <PluginPageGate pluginKey="emotional-wellbeing">{children}</PluginPageGate>;
}
