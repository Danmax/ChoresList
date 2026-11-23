import type { Metadata } from "next";
import { MelodyPhone } from "@/components/melody-phone";

export const metadata: Metadata = {
  title: "Melody’s Play Phone | ChoresList",
  description: "Learn numbers, call a make-believe family, and play telephone with Melody. Natural character voices, classic ringtones, and happy little adventures.",
};

export default function MelodyPage() {
  return <MelodyPhone />;
}
