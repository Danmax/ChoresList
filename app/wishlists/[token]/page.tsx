import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicWishList } from "@/components/public-wish-list";
import { getPublicWishList } from "@/lib/public-wishlists";

type PageProps = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const list = await getPublicWishList(token);
  return {
    title: list ? `${list.title} | ChoresList` : "Shared wish list | ChoresList",
    description: list ? `See ${list.member.name}'s shared gift ideas.` : "A shared ChoresList gift list.",
    robots: { index: false, follow: false },
  };
}

export default async function SharedWishListPage({ params }: PageProps) {
  const { token } = await params;
  const list = await getPublicWishList(token);
  if (!list) notFound();
  return <main className="min-h-screen bg-slate-50 px-4 py-10"><PublicWishList list={list} /></main>;
}
