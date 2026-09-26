import { ExternalLink, Gift, Search } from "lucide-react";
import { amazonSearchUrl, retailerForUrl } from "@/lib/amazon";
import { WISH_LIST_TYPE_META, type WishListType } from "@/lib/wishlists";

type PublicList = NonNullable<Awaited<ReturnType<typeof import("@/lib/public-wishlists").getPublicWishList>>>;

export function PublicWishList({ list, embedded = false }: { list: PublicList; embedded?: boolean }) {
  const meta = WISH_LIST_TYPE_META[list.type as WishListType] ?? WISH_LIST_TYPE_META.general;
  return (
    <div className={embedded ? "min-h-screen bg-white p-4" : "mx-auto max-w-4xl overflow-hidden rounded-[2rem] bg-white shadow-xl ring-1 ring-violet-100"}>
      <header className="bg-gradient-to-br from-emerald-600 to-violet-600 px-6 py-8 text-center text-white">
        <div className="text-5xl">{meta.emoji}</div>
        <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-emerald-100">Shared gift list</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">{list.title}</h1>
        <p className="mt-2 font-bold text-white/80">{list.member.avatar} Created by {list.member.name}</p>
      </header>
      <main className="p-5 sm:p-8">
        {list.items.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {list.items.map((item) => (
              <article key={item.id} className="rounded-3xl border-2 border-slate-100 bg-slate-50 p-4">
                <div className="flex gap-3">
                  {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-xl bg-white object-contain p-1" /> : <span className="text-4xl">{item.emoji}</span>}
                  <div className="min-w-0 flex-1">
                    <h2 className="font-black text-slate-800">{item.title}</h2>
                    {item.note && <p className="mt-1 text-sm font-semibold text-slate-500">{item.note}</p>}
                    <a href={item.amazonUrl ?? amazonSearchUrl(item.title)} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-xs font-black text-white hover:bg-amber-600">
                      {item.amazonUrl ? <ExternalLink size={14} /> : <Search size={14} />}
                      {item.amazonUrl ? `View on ${retailerForUrl(item.amazonUrl)}` : "Find on Amazon"}
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <Gift className="mx-auto text-violet-400" size={48} />
            <p className="mt-3 text-lg font-black text-slate-600">No gift ideas have been added yet.</p>
          </div>
        )}
        {!embedded && <p className="mt-8 text-center text-xs font-bold text-slate-400">Shared from ChoresList</p>}
      </main>
    </div>
  );
}
