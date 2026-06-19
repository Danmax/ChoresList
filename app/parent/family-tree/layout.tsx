import { PluginPageGate } from "@/lib/plugins/page-gate";

export default function FamilyTreeLayout({ children }: { children: React.ReactNode }) {
  return <PluginPageGate pluginKey="family-tree">{children}</PluginPageGate>;
}
