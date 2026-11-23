import type { Metadata } from "next";
import { LetterGarden } from "@/components/letter-garden";

export const metadata: Metadata = {
  title: "Little Letter Garden | ChoresList",
  description: "A is for Apple! Watch letters grow, then trace uppercase and lowercase letters with your finger, mouse, or pen.",
};

export default function LettersPage() { return <LetterGarden />; }
