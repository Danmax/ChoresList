import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ChoresList",
    short_name: "ChoresList",
    description: "Fun family chore management with rewards, points, and skill tracking",
    start_url: "/",
    display: "standalone",
    background_color: "#faf5ff",
    theme_color: "#a78bfa",
    icons: [
      {
        src: "/Icon.png",
        sizes: "420x420",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/Icon.png",
        sizes: "420x420",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
