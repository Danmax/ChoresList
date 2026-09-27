"use client";
import { useEffect, useState } from "react";
import { HOLIDAY_DRAFT_KEY, parseHolidayDraft, type HolidayList } from "@/lib/holiday-draft";

export function HolidayDraftImport({ members, onImported }: { members: { id: string; name: string }[]; onImported: () => Promise<void> }) {
  const [lists, setLists] = useState<HolidayList[]>([]);
  const [memberId, setMemberId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    try { setLists(parseHolidayDraft(JSON.parse(localStorage.getItem(HOLIDAY_DRAFT_KEY) ?? "[]"))); } catch { /* No readable draft. */ }
  }, []);
  if (!lists.length) return null;
  return <section className="mb-6 rounded-2xl border border-violet-200 bg-violet-50 p-5">
    <h2 className="font-black">Your holiday drafts are here</h2>
    <p className="my-2 text-sm">Import {lists.map((list) => list.title || "Holiday wishes").join(", ")} and keep building your lists.</p>
    <select aria-label="Who are these lists for?" value={memberId} onChange={(event) => setMemberId(event.target.value)} className="mr-3 rounded-xl border bg-white p-3">
      <option value="">Choose who these lists are for</option>
      {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
    </select>
    <button disabled={busy || !memberId} onClick={async () => {
      setBusy(true); setError("");
      try {
        const res = await fetch("/api/holiday/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId, lists }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not import drafts");
        try { localStorage.removeItem(HOLIDAY_DRAFT_KEY); } catch { /* Import is idempotent if storage cannot be cleared. */ }
        setLists([]); await onImported();
      } catch (err) { setError(err instanceof Error ? err.message : "Please try again"); }
      finally { setBusy(false); }
    }} className="rounded-xl bg-violet-600 p-3 font-bold text-white disabled:opacity-50">{busy ? "Importing…" : "Import my lists"}</button>
    {error && <p role="alert" className="mt-2 text-red-700">{error}</p>}
  </section>;
}
