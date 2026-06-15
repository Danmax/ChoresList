"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  History,
  Plus,
  RotateCcw,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Cadence = "weekly" | "biweekly" | "monthly";
type Tab = "active" | "recurring" | "history";

type GroceryItem = {
  id: number;
  name: string;
  category: string;
  quantity: string | null;
  unit: string | null;
  note: string | null;
  checked?: boolean;
  sortOrder: number;
  createdAt: string;
};

type GroceryList = {
  id: number;
  title: string;
  status: "active" | "completed" | "archived";
  completedAt: string | null;
  createdAt: string;
  items: GroceryItem[];
  sourceTemplate: { id: number; title: string; cadence: Cadence } | null;
};

type GroceryTemplate = {
  id: number;
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

function categoryMeta(category: string) {
  return GROCERY_CATEGORIES.find((c) => c.value === category) ?? GROCERY_CATEGORIES[GROCERY_CATEGORIES.length - 1];
}

function itemAmount(item: GroceryItem) {
  return [item.quantity, item.unit].filter(Boolean).join(" ");
}

function checkedCount(items: GroceryItem[]) {
  return items.filter((item) => item.checked).length;
}

export default function ParentGroceriesPage() {
  const [lists, setLists] = useState<GroceryList[]>([]);
  const [templates, setTemplates] = useState<GroceryTemplate[]>([]);
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("active");
  const [newListTitle, setNewListTitle] = useState("");
  const [newTemplate, setNewTemplate] = useState(BLANK_TEMPLATE);
  const [listItemForm, setListItemForm] = useState(BLANK_ITEM);
  const [templateItemForm, setTemplateItemForm] = useState(BLANK_ITEM);
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

  async function completeList(list: GroceryList) {
    const res = await fetch("/api/groceries/lists", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: list.id, status: "completed" }),
    });
    if (!res.ok) {
      toast.error("Could not complete list");
      return;
    }
    toast.success("Shopping list completed");
    await load();
  }

  async function deleteList(id: number) {
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

  async function removeItem(scope: "list" | "template", id: number) {
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

  async function deleteTemplate(id: number) {
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
        <div className="flex gap-2">
          <Input
            value={newListTitle}
            onChange={(event) => setNewListTitle(event.target.value)}
            placeholder="New list title"
            className="rounded-2xl bg-white min-w-0"
          />
          <button
            type="button"
            onClick={() => createList()}
            className="shrink-0 flex items-center gap-1.5 bg-emerald-500 text-white rounded-2xl px-4 py-2.5 font-bold hover:bg-emerald-600 transition-colors"
          >
            <Plus size={18} /> New List
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
              const done = checkedCount(list.items);
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
                      <p className="text-xs font-bold text-slate-400">{done}/{total} items checked</p>
                      {list.sourceTemplate && (
                        <p className="mt-1 truncate text-xs font-bold text-emerald-600">
                          From {list.sourceTemplate.title}
                        </p>
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
                    <h2 className="text-xl font-black text-slate-800">{selectedList.title}</h2>
                    <p className="text-sm font-bold text-slate-400">
                      {checkedCount(selectedList.items)} of {selectedList.items.length} items checked
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => completeList(selectedList)}
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
                  <Input
                    value={listItemForm.unit}
                    onChange={(event) => setListItemForm((current) => ({ ...current, unit: event.target.value }))}
                    placeholder="Unit"
                    className="rounded-2xl bg-white"
                  />
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
                              item.checked ? "border-emerald-100 bg-emerald-50" : "border-slate-100 bg-white"
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
                              <p className={`font-black ${item.checked ? "text-slate-400 line-through" : "text-slate-800"}`}>
                                {item.name}
                              </p>
                              {(itemAmount(item) || item.note) && (
                                <p className="text-xs font-bold text-slate-400">
                                  {[itemAmount(item), item.note].filter(Boolean).join(" · ")}
                                </p>
                              )}
                            </div>
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
                  <div className="flex gap-2">
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
                  <Input
                    value={templateItemForm.unit}
                    onChange={(event) => setTemplateItemForm((current) => ({ ...current, unit: event.target.value }))}
                    placeholder="Unit"
                    className="rounded-2xl bg-white"
                  />
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
          {completedLists.map((list) => (
            <div key={list.id} className="rounded-3xl bg-white p-4 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">✅</div>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-slate-800">{list.title}</p>
                  <p className="text-xs font-bold text-slate-400">
                    Completed {list.completedAt ? new Date(list.completedAt).toLocaleDateString() : "recently"} · {list.items.length} items
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {list.items.slice(0, 8).map((item) => {
                      const meta = categoryMeta(item.category);
                      return (
                        <span key={item.id} className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ color: meta.color, backgroundColor: meta.bg }}>
                          {item.name}
                        </span>
                      );
                    })}
                    {list.items.length > 8 && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-400">
                        +{list.items.length - 8} more
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => deleteList(list.id)}
                  className="text-red-300 hover:text-red-500"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          ))}
          {completedLists.length === 0 && (
            <div className="py-20 text-center">
              <div className="text-6xl mb-4">🧾</div>
              <p className="font-bold text-slate-500">Completed shopping lists will show up here.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
