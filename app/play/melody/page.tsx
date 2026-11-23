import type { Metadata } from "next";
import { MelodyPhone } from "@/components/melody-phone";

export const metadata: Metadata = {
  title: "Melody’s Play Phone | ChoresList",
  description: "Tap musical numbers, count with Melody, and answer playful pretend calls. A gentle number adventure for little learners.",
};

export default function MelodyPage() {
  return <MelodyPhone />;
}
