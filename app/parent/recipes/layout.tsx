import { PluginPageGate } from "@/lib/plugins/page-gate";

export default function RecipesLayout({ children }: { children: React.ReactNode }) {
  return <PluginPageGate pluginKey="recipes">{children}</PluginPageGate>;
}
