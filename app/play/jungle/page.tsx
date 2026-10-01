import type { Metadata } from "next";
import { GuestJungleDemo } from "@/components/guest-jungle-demo";

const socialImage = new URL("/games/johnny-hero-journey.png", process.env.PUBLIC_BASE_URL ?? "http://localhost:3000").toString();

export const metadata: Metadata = {
  title: "Play Johnny: The People's Champ | ChoresList",
  description: "Try the Jungle Runner adventure free. Run, flip, fight, and collect supplies across seven jungle stages.",
  openGraph: {
    title: "Johnny: The People's Champ",
    description: "Play the Jungle Runner guest demo—no account needed for your first three runs.",
    type: "website",
    images: [{ url: socialImage, alt: "Johnny beginning his jungle adventure" }],
  },
};

export default function JungleDemoPage() {
  return <GuestJungleDemo />;
}
