import { PluginPageGate } from "@/lib/plugins/page-gate";

export default function AcademyLayout({ children }: { children: React.ReactNode }) {
  return <PluginPageGate pluginKey="education-academy">{children}</PluginPageGate>;
}
