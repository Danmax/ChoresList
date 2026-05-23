import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  weight: ["400", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "ChoresList — Family Chore Tracker",
  description: "Fun family chore management with rewards, points, and skill tracking",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${nunito.variable} h-full`}>
      <body className="min-h-full bg-gradient-to-br from-violet-50 via-blue-50 to-emerald-50 font-[family-name:var(--font-nunito)]">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
