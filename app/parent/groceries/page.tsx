"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Archive,
  CalendarClock,
  Camera,
  CheckCircle2,
  History,
  Loader2,
  Plus,
  ReceiptText,
  RotateCcw,
  ShoppingCart,
  Trash2,
  Upload,
  WandSparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type Cadence = "weekly" | "biweekly" | "monthly";
type Tab = "active" | "recurring" | "history";

type GroceryItem = {
  id: string;
  name: string;
  category: string;
  quantity: string | null;
  unit: string | null;
  note: string | null;
  checked?: boolean;
  onHand?: boolean;
  sortOrder: number;
  createdAt: string;
};

type GroceryList = {
  id: string;
  title: string;
  status: "active" | "completed" | "archived";
  completedAt: string | null;
  completionNote: string | null;
  receiptPath: string | null;
  createdAt: string;
  items: GroceryItem[];
  sourceTemplate: { id: string; title: string; cadence: Cadence } | null;
};

type GroceryTemplate = {
  id: string;
  title: string;
  cadence: Cadence;
  isActive: boolean;
  lastUsedAt: string | null;
  items: GroceryItem[];
};

const GROCERY_CATEGORIES = [
  { value: "produce", label: "Produce", emoji: "🥬", color: "#22c55e", bg: "#dcfce7" },
  { value: "dairy", label: "Dairy", emoji: "🥛", color: "#0ea5e9", bg: "#e0f2fe" },
  { value: "meat", label: "Meat", emoji: "🥩", color: "#ef4444", bg: "#fee2e2" },
  { value: "pantry", label: "Pantry", emoji: "🥫", color: "#f59e0b", bg: "#fef3c7" },
  { value: "frozen", label: "Frozen", emoji: "🧊", color: "#06b6d4", bg: "#cffafe" },
  { value: "snacks", label: "Snacks", emoji: "🍿", color: "#ec4899", bg: "#fce7f3" },
  { value: "drinks", label: "Drinks", emoji: "🧃", color: "#8b5cf6", bg: "#ede9fe" },
  { value: "household", label: "Household", emoji: "🧻", color: "#64748b", bg: "#f1f5f9" },
  { value: "kids", label: "Baby/Kids", emoji: "🧸", color: "#f97316", bg: "#ffedd5" },
  { value: "other", label: "Other", emoji: "🛒", color: "#475569", bg: "#f8fafc" },
];

const BLANK_ITEM = { name: "", quantity: "", unit: "", category: "produce", note: "" };
const BLANK_TEMPLATE = { title: "", cadence: "weekly" as Cadence };

const CADENCE_META: Record<Cadence, { label: string; icon: string }> = {
  weekly: { label: "Weekly", icon: "📆" },
  biweekly: { label: "Biweekly", icon: "🔁" },
  monthly: { label: "Monthly", icon: "🗓️" },
};

const GROCERY_UNITS = [
  { value: "each", label: "Each" },
  { value: "bag", label: "Bag" },
  { value: "box", label: "Box" },
  { value: "bottle", label: "Bottle" },
  { value: "can", label: "Can" },
  { value: "jar", label: "Jar" },
  { value: "pack", label: "Pack" },
  { value: "dozen", label: "Dozen" },
  { value: "bunch", label: "Bunch" },
  { value: "oz", label: "Ounces (oz)" },
  { value: "lb", label: "Pounds (lb)" },
  { value: "g", label: "Grams (g)" },
  { value: "kg", label: "Kilograms (kg)" },
  { value: "fl-oz", label: "Fluid ounces" },
  { value: "pt", label: "Pint" },
  { value: "qt", label: "Quart" },
  { value: "gal", label: "Gallon" },
];

function categoryMeta(category: string) {
  return GROCERY_CATEGORIES.find((c) => c.value === category) ?? GROCERY_CATEGORIES[GROCERY_CATEGORIES.length - 1];
}

function itemAmount(item: GroceryItem) {
  return [item.quantity, item.unit].filter(Boolean).join(" ");
}

function resolvedCount(items: GroceryItem[]) {
  return items.filter((item) => item.checked || item.onHand).length;
}

export default function ParentGroceriesPage() {
  const [lists, setLists] = useState<GroceryList[]>([]);
  const [templates, setTemplates] = useState<GroceryTemplate[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("active");
  const [newListTitle, setNewListTitle] = useState("");
  const [newTemplate, setNewTemplate] = useState(BLANK_TEMPLATE);
  const [listItemForm, setListItemForm] = useState(BLANK_ITEM);
  const [templateItemForm, setTemplateItemForm] = useState(BLANK_ITEM);
  const [completingList, setCompletingList] = useState<GroceryList | null>(null);
  const [completionNote, setCompletionNote] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [listTitleDraft, setListTitleDraft] = useState("");
  const [titleSaving, setTitleSaving] = useState(false);
  const [receiptUploading, setReceiptUploading] = useState(false);
  const [receiptVersion, setReceiptVersion] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listsRes, templatesRes] = await Promise.all([
        fetch("/api/groceries/lists"),
        fetch("/api/groceries/templates"),
      ]);
      const nextLists: GroceryList[] = listsRes.ok ? await listsRes.json() : [];
      const nextTemplates: GroceryTemplate[] = templatesRes.ok ? await templatesRes.json() : [];
      setLists(nextLists);
      setTemplates(nextTemplates);
      setSelectedListId((current) => {
        if (current && nextLists.some((list) => list.id === current && list.status === "active")) return current;
        return nextLists.find((list) => list.status === "active")?.id ?? null;
      });
      setSelectedTemplateId((current) => {
        if (current && nextTemplates.some((template) => template.id === current)) return current;
        return nextTemplates[0]?.id ?? null;
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeLists = useMemo(() => lists.filter((list) => list.status === "active"), [lists]);
  const completedLists = useMemo(() => lists.filter((list) => list.status === "completed"), [lists]);
  const selectedList = activeLists.find((list) => list.id === selectedListId) ?? activeLists[0] ?? null;
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? templates[0] ?? null;
  const tabs = [
    { value: "active" as Tab, Icon: ShoppingCart, label: `Shop (${activeLists.length})` },
    { value: "recurring" as Tab, Icon: CalendarClock, label: `Recurring (${templates.length})` },
    { value: "history" as Tab, Icon: History, label: `History (${completedLists.length})` },
  ];

  useEffect(() => {
    setListTitleDraft(selectedList?.title ?? "");
  }, [selectedList?.id, selectedList?.title]);

  async function createList(title?: string) {
    const cleanTitle = (title ?? newListTitle).trim() || "Shopping List";
    const res = await fetch("/api/groceries/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: cleanTitle }),
    });
    if (!res.ok) {
      toast.error("Could not create shopping list");
      return;
    }
    const list = await res.json();
    toast.success("Shopping list created");
    setNewListTitle("");
    await load();
    setSelectedListId(list.id);
    setTab("active");
  }

  async function generateListFromPrompt() {
    const prompt = aiPrompt.trim();
    if (prompt.length < 4) {
      toast.error("Describe the meal or event first");
      return;
    }

    setAiGenerating(true);
    try {
      const res = await fetch("/api/groceries/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not generate shopping list");
        return;
      }
      toast.success("Shopping list generated");
      setAiPrompt("");
      await load();
      setSelectedListId(data.list.id);
      setTab("active");
    } finally {
      setAiGenerating(false);
    }
  }

  async function createListFromHistory(list: GroceryList) {
    const res = await fetch("/api/groceries/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: `${list.title} Copy`, sourceListId: list.id }),
    });
    if (!res.ok) {
      toast.error("Could not reuse shopping list");
      return;
    }
    const created = await res.json();
    toast.success("Shopping list created from history");
    await load();
    setSelectedListId(created.id);
    setTab("active");
  }

  async function renameSelectedList() {
    if (!selectedList) return;
    const title = listTitleDraft.trim();
    if (!title) {
      toast.error("List title is required");
      return;
    }
    if (title === selectedList.title) return;

    setTitleSaving(true);
    try {
      const res = await fetch("/api/groceries/lists", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedList.id, title }),
      });
      if (!res.ok) {
        toast.error("Could not rename list");
        return;
      }
      toast.success("Shopping list renamed");
      await load();
    } finally {
      setTitleSaving(false);
    }
  }

  function openCompleteList(list: GroceryList) {
    setCompletingList(list);
    setCompletionNote(list.completionNote ?? "");
  }

  async function uploadReceipt(file: File) {
    if (!completingList) return;
    setReceiptUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`/api/groceries/lists/${completingList.id}/receipt`, { method: "POST", body });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not upload receipt");
        return;
      }
      const updated = { ...completingList, receiptPath: data.receiptPath as string };
      setCompletingList(updated);
      setLists((current) => current.map((list) => list.id === updated.id ? { ...list, receiptPath: updated.receiptPath } : list));
      setReceiptVersion(Date.now());
      toast.success("Receipt added");
    } finally {
      setReceiptUploading(false);
    }
  }

  async function completeList() {
    if (!completingList) return;
    const res = await fetch("/api/groceries/lists", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: completingList.id, status: "completed", completionNote }),
    });
    if (!res.ok) {
      toast.error("Could not complete list");
      return;
    }
    toast.success("Shopping list completed");
    setCompletingList(null);
    setCompletionNote("");
    await load();
  }

  async function deleteList(id: string) {
    if (!confirm("Delete this shopping list?")) return;
    await fetch(`/api/groceries/lists?id=${id}`, { method: "DELETE" });
    toast.success("Shopping list deleted");
    await load();
  }

  async function addItem(scope: "list" | "template") {
    const form = scope === "list" ? listItemForm : templateItemForm;
    if (!form.name.trim()) {
      toast.error("Item name is required");
      return;
    }
    const targetId = scope === "list" ? selectedList?.id : selectedTemplate?.id;
    if (!targetId) return;

    const res = await fetch("/api/groceries/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scope,
        ...(scope === "list" ? { listId: targetId } : { templateId: targetId }),
        ...form,
      }),
    });
    if (!res.ok) {
      toast.error("Could not add item");
      return;
    }
    if (scope === "list") setListItemForm(BLANK_ITEM);
    else setTemplateItemForm(BLANK_ITEM);
    await load();
  }

  async function toggleItem(item: GroceryItem) {
    await fetch("/api/groceries/items", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: "list", id: item.id, checked: !item.checked }),
    });
    await load();
  }

  async function toggleOnHand(item: GroceryItem) {
    await fetch("/api/groceries/items", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: "list", id: item.id, onHand: !item.onHand }),
    });
    await load();
  }

  async function removeItem(scope: "list" | "template", id: string) {
    await fetch(`/api/groceries/items?scope=${scope}&id=${id}`, { method: "DELETE" });
    await load();
  }

  async function createTemplate() {
    if (!newTemplate.title.trim()) {
      toast.error("Recurring list title is required");
      return;
    }
    const res = await fetch("/api/groceries/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTemplate),
    });
    if (!res.ok) {
      toast.error("Could not create recurring list");
      return;
    }
    const template = await res.json();
    toast.success("Recurring list created");
    setNewTemplate(BLANK_TEMPLATE);
    await load();
    setSelectedTemplateId(template.id);
  }

  async function generateTemplate(template: GroceryTemplate) {
    const res = await fetch(`/api/groceries/templates/${template.id}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      toast.error("Could not generate shopping list");
      return;
    }
    const list = await res.json();
    toast.success("Shopping list generated");
    await load();
    setSelectedListId(list.id);
    setTab("active");
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Delete this recurring list?")) return;
    await fetch(`/api/groceries/templates?id=${id}`, { method: "DELETE" });
    toast.success("Recurring list deleted");
    await load();
  }

  const selectedListGroups = GROCERY_CATEGORIES.map((category) => ({
    ...category,
    items: selectedList?.items.filter((item) => item.category === category.value) ?? [],
  })).filter((group) => group.items.length > 0);

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Link href="/parent" className="bg-white rounded-2xl p-2 shadow-sm hover:shadow-md transition-shadow self-start">
          <ArrowLeft size={20} className="text-slate-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800">🛒 Grocery Shopping</h1>
          <p className="text-sm font-semibold text-slate-500">Build shopping lists and reuse weekly, biweekly, or monthly staples.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Input
            value={newListTitle}
            onChange={(event) => setNewListTitle(event.target.value)}
            placeholder="New list title"
            className="rounded-2xl bg-white min-w-0"
          />
          <button
            type="button"
            onClick={() => createList()}
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-emerald-500 px-4 py-2.5 font-bold text-white transition-colors hover:bg-emerald-600"
          >
            <Plus size={18} /> New List
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-3xl bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <Label className="flex items-center gap-2 text-sm font-black text-slate-700">
              <WandSparkles size={16} className="text-emerald-500" /> Generate from a meal plan
            </Label>
            <Textarea
              value={aiPrompt}
              onChange={(event) => setAiPrompt(event.target.value)}
              placeholder="I am planning Taco Tuesday for 6, or Sunday Mediterranean dinner for 10..."
              maxLength={1600}
              className="mt-2 min-h-20 rounded-2xl bg-slate-50"
            />
          </div>
          <button
            type="button"
            onClick={generateListFromPrompt}
            disabled={aiGenerating}
            className="flex items-center justify-center gap-2 rounded-2xl bg-slate-800 px-4 py-3 font-black text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {aiGenerating ? <Loader2 size={18} className="animate-spin" /> : <WandSparkles size={18} />}
            Generate List
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-2 rounded-3xl bg-white p-2 shadow-sm">
        {tabs.map(({ value, Icon, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-black transition-colors ${
              tab === value ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <Icon size={16} /> <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {tab === "active" && (
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <div className="space-y-3">
            {activeLists.map((list) => {
              const total = list.items.length;
              const done = resolvedCount(list.items);
              return (
                <button
                  key={list.id}
                  type="button"
                  onClick={() => setSelectedListId(list.id)}
                  className={`w-full rounded-3xl p-4 text-left shadow-sm transition-all ${
                    selectedList?.id === list.id ? "bg-emerald-50 ring-2 ring-emerald-300" : "bg-white hover:shadow-md"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">🛒</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-black text-slate-800">{list.title}</p>
                      <p className="text-xs font-bold text-slate-400">{done}/{total} items resolved</p>
                      {list.sourceTemplate && (
                        <p className="mt-1 truncate text-xs font-bold text-emerald-600">
                          From {list.sourceTemplate.title}
                        </p>
                      )}
                      {list.completionNote && (
                        <p className="mt-1 truncate text-xs font-bold text-slate-500">{list.completionNote}</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
            {activeLists.length === 0 && !loading && (
              <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
                <div className="text-5xl mb-3">🛒</div>
                <p className="font-black text-slate-700">No active shopping lists</p>
                <button
                  type="button"
                  onClick={() => createList("Shopping List")}
                  className="mt-4 rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-black text-white hover:bg-emerald-600"
                >
                  Start one
                </button>
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-white p-4 shadow-sm sm:p-5">
            {selectedList ? (
              <>
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start">
                  <div className="flex-1">
                    <Label className="sr-only" htmlFor="shopping-list-title">Shopping list title</Label>
                    <div className="flex max-w-xl flex-col gap-2 sm:flex-row">
                      <Input
                        id="shopping-list-title"
                        value={listTitleDraft}
                        onChange={(event) => setListTitleDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") renameSelectedList();
                        }}
                        className="rounded-2xl bg-slate-50 text-lg font-black text-slate-800"
                      />
                      <button
                        type="button"
                        onClick={renameSelectedList}
                        disabled={titleSaving || listTitleDraft.trim() === selectedList.title}
                        className="flex shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-slate-800 px-3 py-2 text-sm font-black text-white hover:bg-slate-700 disabled:opacity-50"
                      >
                        {titleSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                        Save
                      </button>
                    </div>
                    <p className="text-sm font-bold text-slate-400">
                      {resolvedCount(selectedList.items)} of {selectedList.items.length} items purchased or on hand
                    </p>
                    {selectedList.completionNote && (
                      <p className="mt-2 whitespace-pre-wrap text-sm font-semibold text-slate-600">{selectedList.completionNote}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openCompleteList(selectedList)}
                      className="flex items-center gap-1.5 rounded-2xl bg-emerald-500 px-3 py-2 text-sm font-black text-white hover:bg-emerald-600"
                    >
                      <CheckCircle2 size={16} /> Complete
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteList(selectedList.id)}
                      className="rounded-2xl bg-red-50 p-2 text-red-400 hover:text-red-600"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>

                <div className="mb-5 grid gap-2 rounded-3xl bg-slate-50 p-3 md:grid-cols-[1fr_90px_100px_150px_auto]">
                  <Input
                    value={listItemForm.name}
                    onChange={(event) => setListItemForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Add item"
                    className="rounded-2xl bg-white"
                  />
                  <Input
                    value={listItemForm.quantity}
                    onChange={(event) => setListItemForm((current) => ({ ...current, quantity: event.target.value }))}
                    placeholder="Qty"
                    className="rounded-2xl bg-white"
                  />
                  <Select value={listItemForm.unit || "none"} onValueChange={(value) => setListItemForm((current) => ({ ...current, unit: value === "none" ? "" : (value ?? "") }))}>
                    <SelectTrigger className="rounded-2xl bg-white"><SelectValue placeholder="Unit" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No unit</SelectItem>
                      {GROCERY_UNITS.map((unit) => <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select
                    value={listItemForm.category}
                    onValueChange={(value) => setListItemForm((current) => ({ ...current, category: value ?? "other" }))}
                  >
                    <SelectTrigger className="rounded-2xl bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GROCERY_CATEGORIES.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.emoji} {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    type="button"
                    onClick={() => addItem("list")}
                    className="rounded-2xl bg-slate-800 px-4 py-2 font-black text-white hover:bg-slate-700"
                  >
                    Add
                  </button>
                  <Input
                    value={listItemForm.note}
                    onChange={(event) => setListItemForm((current) => ({ ...current, note: event.target.value }))}
                    placeholder="Description or note — brand, size, substitution, etc."
                    maxLength={500}
                    autoComplete="off"
                    className="rounded-2xl bg-white md:col-span-5"
                  />
                </div>

                <div className="space-y-5">
                  {selectedListGroups.map((group) => (
                    <div key={group.value}>
                      <h3 className="mb-2 flex items-center gap-2 text-sm font-black" style={{ color: group.color }}>
                        <span>{group.emoji}</span> {group.label}
                      </h3>
                      <div className="space-y-2">
                        {group.items.map((item) => (
                          <div
                            key={item.id}
                            className={`flex items-center gap-3 rounded-2xl border p-3 ${
                              item.checked
                                ? "border-emerald-100 bg-emerald-50"
                                : item.onHand
                                  ? "border-amber-100 bg-amber-50"
                                  : "border-slate-100 bg-white"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => toggleItem(item)}
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                                item.checked ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-200 text-transparent"
                              }`}
                            >
                              <CheckCircle2 size={17} />
                            </button>
                            <div className="min-w-0 flex-1">
                              <p className={`font-black ${item.checked || item.onHand ? "text-slate-400 line-through" : "text-slate-800"}`}>
                                {item.name}
                              </p>
                              {(itemAmount(item) || item.note || item.onHand) && (
                                <p className="text-xs font-bold text-slate-400">
                                  {[itemAmount(item), item.note, item.onHand ? "Already on hand" : ""].filter(Boolean).join(" · ")}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleOnHand(item)}
                              className={`inline-flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-black ${
                                item.onHand ? "bg-amber-500 text-white" : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                              }`}
                            >
                              <Archive size={14} /> <span className="hidden sm:inline">{item.onHand ? "On hand" : "Have it"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => removeItem("list", item.id)}
                              className="text-red-300 hover:text-red-500"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {selectedList.items.length === 0 && (
                    <div className="py-12 text-center">
                      <div className="text-5xl mb-3">🥕</div>
                      <p className="font-bold text-slate-500">Add the first item to this list.</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="py-16 text-center">
                <div className="text-6xl mb-4">🛒</div>
                <p className="font-bold text-slate-500">Create a shopping list to get started.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "recurring" && (
        <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <div className="space-y-4">
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <h2 className="mb-3 font-black text-slate-800">New recurring list</h2>
              <div className="mb-4 rounded-2xl bg-violet-50 p-3 text-xs font-bold leading-5 text-violet-700">
                1. Name the reusable list and choose its cadence.<br />
                2. Add its staple items after creating it.<br />
                3. Press Generate whenever you need a fresh shopping list.
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="font-bold text-sm">Title</Label>
                  <Input
                    value={newTemplate.title}
                    onChange={(event) => setNewTemplate((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Weekly staples"
                    className="mt-1 rounded-2xl"
                  />
                </div>
                <div>
                  <Label className="font-bold text-sm">Repeats</Label>
                  <Select
                    value={newTemplate.cadence}
                    onValueChange={(value) => setNewTemplate((current) => ({ ...current, cadence: (value ?? "weekly") as Cadence }))}
                  >
                    <SelectTrigger className="mt-1 rounded-2xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Biweekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <button
                  type="button"
                  onClick={createTemplate}
                  className="w-full rounded-2xl bg-violet-500 py-2.5 font-black text-white hover:bg-violet-600"
                >
                  Create Recurring List
                </button>
              </div>
            </div>

            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelectedTemplateId(template.id)}
                className={`w-full rounded-3xl p-4 text-left shadow-sm transition-all ${
                  selectedTemplate?.id === template.id ? "bg-violet-50 ring-2 ring-violet-300" : "bg-white hover:shadow-md"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{CADENCE_META[template.cadence]?.icon ?? "📆"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black text-slate-800">{template.title}</p>
                    <p className="text-xs font-bold text-slate-400">
                      {CADENCE_META[template.cadence]?.label ?? template.cadence} · {template.items.length} items
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="rounded-3xl bg-white p-4 shadow-sm sm:p-5">
            {selectedTemplate ? (
              <>
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start">
                  <div className="flex-1">
                    <h2 className="text-xl font-black text-slate-800">{selectedTemplate.title}</h2>
                    <p className="text-sm font-bold text-slate-400">
                      {CADENCE_META[selectedTemplate.cadence]?.label ?? selectedTemplate.cadence} recurring list · {selectedTemplate.items.length} items
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => generateTemplate(selectedTemplate)}
                      className="flex items-center gap-1.5 rounded-2xl bg-emerald-500 px-3 py-2 text-sm font-black text-white hover:bg-emerald-600"
                    >
                      <RotateCcw size={16} /> Generate
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTemplate(selectedTemplate.id)}
                      className="rounded-2xl bg-red-50 p-2 text-red-400 hover:text-red-600"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>

                <div className="mb-5 grid gap-2 rounded-3xl bg-slate-50 p-3 md:grid-cols-[1fr_90px_100px_150px_auto]">
                  <Input
                    value={templateItemForm.name}
                    onChange={(event) => setTemplateItemForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Add recurring item"
                    className="rounded-2xl bg-white"
                  />
                  <Input
                    value={templateItemForm.quantity}
                    onChange={(event) => setTemplateItemForm((current) => ({ ...current, quantity: event.target.value }))}
                    placeholder="Qty"
                    className="rounded-2xl bg-white"
                  />
                  <Select value={templateItemForm.unit || "none"} onValueChange={(value) => setTemplateItemForm((current) => ({ ...current, unit: value === "none" ? "" : (value ?? "") }))}>
                    <SelectTrigger className="rounded-2xl bg-white"><SelectValue placeholder="Unit" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No unit</SelectItem>
                      {GROCERY_UNITS.map((unit) => <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select
                    value={templateItemForm.category}
                    onValueChange={(value) => setTemplateItemForm((current) => ({ ...current, category: value ?? "other" }))}
                  >
                    <SelectTrigger className="rounded-2xl bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GROCERY_CATEGORIES.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.emoji} {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    type="button"
                    onClick={() => addItem("template")}
                    className="rounded-2xl bg-slate-800 px-4 py-2 font-black text-white hover:bg-slate-700"
                  >
                    Add
                  </button>
                  <Input
                    value={templateItemForm.note}
                    onChange={(event) => setTemplateItemForm((current) => ({ ...current, note: event.target.value }))}
                    placeholder="Description or note — brand, size, substitution, etc."
                    maxLength={500}
                    autoComplete="off"
                    className="rounded-2xl bg-white md:col-span-5"
                  />
                </div>

                <div className="space-y-2">
                  {selectedTemplate.items.map((item) => {
                    const meta = categoryMeta(item.category);
                    return (
                      <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3">
                        <span className="rounded-xl px-2 py-1 text-lg" style={{ backgroundColor: meta.bg }}>
                          {meta.emoji}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-black text-slate-800">{item.name}</p>
                          <p className="text-xs font-bold text-slate-400">
                            {[itemAmount(item), meta.label, item.note].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem("template", item.id)}
                          className="text-red-300 hover:text-red-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                  {selectedTemplate.items.length === 0 && (
                    <div className="py-12 text-center">
                      <div className="text-5xl mb-3">📋</div>
                      <p className="font-bold text-slate-500">Add staple items, then generate this list when it is shopping time.</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="py-16 text-center">
                <div className="text-6xl mb-4">📆</div>
                <p className="font-bold text-slate-500">Create a weekly, biweekly, or monthly recurring list.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-3">
          {completedLists.map((list) => {
            const groups = GROCERY_CATEGORIES.map((category) => ({
              ...category,
              items: list.items.filter((item) => item.category === category.value),
            })).filter((group) => group.items.length > 0);

            return (
              <div key={list.id} className="rounded-3xl bg-white p-4 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">✅</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start">
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-slate-800">{list.title}</p>
                        <p className="text-xs font-bold text-slate-400">
                          Completed {list.completedAt ? new Date(list.completedAt).toLocaleDateString() : "recently"} · {list.items.length} items
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => createListFromHistory(list)}
                          className="flex items-center gap-1.5 rounded-2xl bg-emerald-500 px-3 py-2 text-sm font-black text-white hover:bg-emerald-600"
                        >
                          <RotateCcw size={16} /> Reuse
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteList(list.id)}
                          className="rounded-2xl bg-red-50 p-2 text-red-400 hover:text-red-600"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </div>
                    {list.completionNote && (
                      <p className="mt-2 whitespace-pre-wrap text-sm font-semibold text-slate-600">{list.completionNote}</p>
                    )}
                    {list.receiptPath && (
                      <a href={`/api/groceries/lists/${list.id}/receipt`} target="_blank" rel="noopener noreferrer" className="mt-3 block w-fit overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                        <img src={`/api/groceries/lists/${list.id}/receipt`} alt={`Receipt for ${list.title}`} className="h-28 w-24 object-cover" />
                      </a>
                    )}
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {groups.map((group) => (
                        <div key={group.value} className="rounded-2xl border border-slate-100 p-3">
                          <h3 className="mb-2 flex items-center gap-2 text-xs font-black" style={{ color: group.color }}>
                            <span>{group.emoji}</span> {group.label}
                          </h3>
                          <div className="space-y-2">
                            {group.items.map((item) => (
                              <div key={item.id} className="min-w-0">
                                <p className="truncate text-sm font-black text-slate-800">{item.name}</p>
                                {(itemAmount(item) || item.note || item.onHand || item.checked) && (
                                  <p className="text-xs font-bold text-slate-400">
                                    {[itemAmount(item), item.note, item.onHand ? "Was on hand" : "", item.checked ? "Purchased" : ""].filter(Boolean).join(" · ")}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {completedLists.length === 0 && (
            <div className="py-20 text-center">
              <div className="text-6xl mb-4">🧾</div>
              <p className="font-bold text-slate-500">Completed shopping lists will show up here.</p>
            </div>
          )}
        </div>
      )}

      <Dialog open={Boolean(completingList)} onOpenChange={(open) => {
        if (!open && !receiptUploading) {
          setCompletingList(null);
          setCompletionNote("");
        }
      }}>
        <DialogContent className="max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-black"><ReceiptText size={20} className="text-emerald-500" /> Complete Shopping List</DialogTitle>
          </DialogHeader>
          {completingList && (
            <div className="space-y-4">
              <div>
                <Label className="font-bold">Completion note optional</Label>
                <Textarea
                  value={completionNote}
                  onChange={(event) => setCompletionNote(event.target.value)}
                  maxLength={2000}
                  placeholder="Store visited, substitutions, amount spent, or anything to remember..."
                  className="mt-1 min-h-24 rounded-2xl"
                />
              </div>

              <div>
                <Label className="font-bold">Receipt optional</Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-blue-50 px-3 py-3 text-sm font-black text-blue-700 hover:bg-blue-100">
                    <Camera size={17} /> Take Photo
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      disabled={receiptUploading}
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) uploadReceipt(file);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-violet-50 px-3 py-3 text-sm font-black text-violet-700 hover:bg-violet-100">
                    <Upload size={17} /> Upload Receipt
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                      disabled={receiptUploading}
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) uploadReceipt(file);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
                {receiptUploading && <p className="mt-2 flex items-center gap-2 text-sm font-bold text-slate-400"><Loader2 size={15} className="animate-spin" /> Optimizing receipt...</p>}
                {completingList.receiptPath && (
                  <div className="mt-3 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-2">
                    <img src={`/api/groceries/lists/${completingList.id}/receipt?v=${receiptVersion}`} alt="Receipt preview" className="mx-auto max-h-64 rounded-xl object-contain" />
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={completeList}
                disabled={receiptUploading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 font-black text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                <CheckCircle2 size={18} /> Mark List Complete
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
