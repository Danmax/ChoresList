import { PluginPageGate } from "@/lib/plugins/page-gate";

export default function GroceryLayout({ children }: { children: React.ReactNode }) {
  return <PluginPageGate pluginKey="grocery-pantry">{children}</PluginPageGate>;
}
