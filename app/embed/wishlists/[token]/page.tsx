import { notFound } from "next/navigation";
import { PublicWishList } from "@/components/public-wish-list";
import { getPublicWishList } from "@/lib/public-wishlists";

export default async function EmbeddedWishListPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const list = await getPublicWishList(token);
  if (!list) notFound();
  return <PublicWishList list={list} embedded />;
}
