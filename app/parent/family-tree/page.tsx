"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, GitBranch, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

type TreeNode = {
  id: number;
  kind: "member" | "parent_account" | "external";
  familyMemberId?: number | null;
  parentAccountId?: number | null;
  name: string;
  avatar: string;
  color: string;
  birthYear?: number | null;
  birthdayMonth?: number | null;
  birthdayDay?: number | null;
  notes?: string | null;
  x?: number | null;
  y?: number | null;
};

type TreeRelationship = {
  id: number;
  fromNodeId: number;
  toNodeId: number;
  relationshipType: string;
  label?: string | null;
  notes?: string | null;
};

type TreePayload = {
  nodes: TreeNode[];
  relationships: TreeRelationship[];
  relationshipTypes: string[];
};

const RELATIONSHIP_LABELS: Record<string, string> = {
  parent_child: "Parent / Child",
  spouse_partner: "Spouse / Partner",
  guardian: "Guardian",
  step_parent: "Step Parent",
  adoptive_parent: "Adoptive Parent",
  sibling: "Sibling",
  other: "Other",
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DEFAULT_PERSON = {
  name: "",
  avatar: "👤",
  color: "#14b8a6",
  birthYear: "",
  birthdayMonth: "",
  birthdayDay: "",
  notes: "",
};

const DEFAULT_RELATIONSHIP = {
  fromNodeId: "",
  toNodeId: "",
  relationshipType: "parent_child",
  label: "",
  notes: "",
};

function birthdayLabel(node: TreeNode) {
  if (!node.birthdayMonth || !node.birthdayDay) return null;
  return `${MONTHS[node.birthdayMonth - 1]} ${node.birthdayDay}`;
}

function relationLabel(relationship: TreeRelationship) {
  return relationship.label || RELATIONSHIP_LABELS[relationship.relationshipType] || "Relationship";
}

function nodeSubtitle(node: TreeNode) {
  if (node.kind === "parent_account") return "Parent account";
  if (node.kind === "member") return "Family member";
  return "Relative";
}

function buildPositions(nodes: TreeNode[], relationships: TreeRelationship[]) {
  const parentLike = new Set(["parent_child", "guardian", "step_parent", "adoptive_parent"]);
  const parentIds = new Set<number>();
  const childIds = new Set<number>();

  relationships.forEach((relationship) => {
    if (parentLike.has(relationship.relationshipType)) {
      parentIds.add(relationship.fromNodeId);
      childIds.add(relationship.toNodeId);
    }
  });

  const parents = nodes.filter((node) => parentIds.has(node.id) || node.kind === "parent_account");
  const children = nodes.filter((node) => !parents.some((parent) => parent.id === node.id) && (childIds.has(node.id) || node.kind === "member"));
  const others = nodes.filter((node) => !parents.some((parent) => parent.id === node.id) && !children.some((child) => child.id === node.id));
  const rows = [parents, children, others].filter((row) => row.length > 0);
  const maxColumns = Math.max(1, ...rows.map((row) => row.length));
  const width = Math.max(760, maxColumns * 230 + 80);
  const height = Math.max(360, rows.length * 180 + 80);
  const positions = new Map<number, { x: number; y: number }>();

  rows.forEach((row, rowIndex) => {
    const rowWidth = row.length * 230;
    const start = Math.max(40, (width - rowWidth) / 2);
    row.forEach((node, columnIndex) => {
      positions.set(node.id, {
        x: node.x ?? Math.round(start + columnIndex * 230),
        y: node.y ?? 40 + rowIndex * 180,
      });
    });
  });

  return { positions, width, height };
}

export default function FamilyTreePage() {
  const [tree, setTree] = useState<TreePayload>({ nodes: [], relationships: [], relationshipTypes: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [personDraft, setPersonDraft] = useState(DEFAULT_PERSON);
  const [relationshipDraft, setRelationshipDraft] = useState(DEFAULT_RELATIONSHIP);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/family-tree");
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setLoadError(data?.error ?? "Could not load family tree");
      setLoading(false);
      return;
    }
    setTree(data);
    setLoadError("");
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const nodeById = useMemo(() => new Map(tree.nodes.map((node) => [node.id, node])), [tree.nodes]);
  const diagram = useMemo(() => buildPositions(tree.nodes, tree.relationships), [tree.nodes, tree.relationships]);
  const relationshipOptions = tree.relationshipTypes.length ? tree.relationshipTypes : Object.keys(RELATIONSHIP_LABELS);

  async function mutate(body: Record<string, unknown>, success: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/family-tree", {
        method: body.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not save family tree");
        return false;
      }
      setTree(data);
      toast.success(success);
      return true;
    } finally {
      setSaving(false);
    }
  }

  async function addPerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await mutate(
      {
        kind: "external",
        name: personDraft.name,
        avatar: personDraft.avatar,
        color: personDraft.color,
        birthYear: personDraft.birthYear,
        birthdayMonth: personDraft.birthdayMonth,
        birthdayDay: personDraft.birthdayDay,
        notes: personDraft.notes,
      },
      "Person added"
    );
    if (ok) setPersonDraft(DEFAULT_PERSON);
  }

  async function addRelationship(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await mutate(
      {
        type: "relationship",
        fromNodeId: relationshipDraft.fromNodeId,
        toNodeId: relationshipDraft.toNodeId,
        relationshipType: relationshipDraft.relationshipType,
        label: relationshipDraft.label,
        notes: relationshipDraft.notes,
      },
      "Relationship added"
    );
    if (ok) setRelationshipDraft(DEFAULT_RELATIONSHIP);
  }

  async function remove(type: "node" | "relationship", id: number) {
    setSaving(true);
    try {
      const res = await fetch("/api/family-tree", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not delete item");
        return;
      }
      setTree(data);
      toast.success(type === "node" ? "Person removed" : "Relationship removed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-xl font-black text-slate-500">Loading family tree...</div>;
  }

  if (loadError) {
    return (
      <div className="min-h-screen p-4 sm:p-6">
        <Link href="/parent" className="mb-6 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 font-bold text-slate-600 shadow-sm">
          <ArrowLeft size={18} /> Parent Panel
        </Link>
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-black text-slate-800">Family Tree</h1>
          <p className="mt-2 font-semibold text-slate-500">{loadError}</p>
          <Link href="/parent/settings" className="mt-5 inline-flex rounded-2xl bg-teal-500 px-5 py-3 font-black text-white hover:bg-teal-600">
            Open Feature Plugins
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/parent" className="rounded-2xl bg-white p-2 shadow-sm transition-shadow hover:shadow-md">
            <ArrowLeft size={20} className="text-slate-600" />
          </Link>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black text-slate-800 sm:text-3xl">
              <GitBranch className="text-teal-500" /> Family Tree
            </h1>
            <p className="text-sm font-semibold text-slate-500">Map household members, relatives, partners, guardians, and branches.</p>
          </div>
        </div>
        <div className="rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-600 shadow-sm">
          {tree.nodes.length} people · {tree.relationships.length} relationships
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-black text-slate-800">Diagram</h2>
              <p className="text-sm font-semibold text-slate-500">Parent and guardian relationships flow from top to bottom.</p>
            </div>
            <Users size={22} className="text-teal-500" />
          </div>
          <div className="overflow-auto bg-slate-50 p-4">
            <div className="relative" style={{ width: diagram.width, height: diagram.height }}>
              <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
                {tree.relationships.map((relationship) => {
                  const from = diagram.positions.get(relationship.fromNodeId);
                  const to = diagram.positions.get(relationship.toNodeId);
                  if (!from || !to) return null;
                  const x1 = from.x + 88;
                  const y1 = from.y + 46;
                  const x2 = to.x + 88;
                  const y2 = to.y + 46;
                  const midY = (y1 + y2) / 2;
                  const isPartner = relationship.relationshipType === "spouse_partner" || relationship.relationshipType === "sibling";
                  return (
                    <g key={relationship.id}>
                      <path
                        d={isPartner ? `M ${x1} ${y1} L ${x2} ${y2}` : `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                        fill="none"
                        stroke={isPartner ? "#94a3b8" : "#14b8a6"}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={relationship.relationshipType === "other" ? "7 7" : undefined}
                      />
                      <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 8} textAnchor="middle" className="fill-slate-500 text-[11px] font-bold">
                        {relationLabel(relationship)}
                      </text>
                    </g>
                  );
                })}
              </svg>
              {tree.nodes.map((node) => {
                const position = diagram.positions.get(node.id) ?? { x: 40, y: 40 };
                const birthday = birthdayLabel(node);
                return (
                  <div
                    key={node.id}
                    className="absolute w-44 rounded-2xl border-2 border-white bg-white p-3 shadow-sm"
                    style={{ left: position.x, top: position.y }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-2xl text-2xl" style={{ backgroundColor: node.color }}>
                        {node.avatar}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-black text-slate-800">{node.name}</p>
                        <p className="text-xs font-black uppercase tracking-wide text-slate-400">{nodeSubtitle(node)}</p>
                      </div>
                    </div>
                    {(birthday || node.birthYear) && (
                      <p className="mt-2 text-xs font-bold text-slate-500">
                        {[birthday, node.birthYear].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                );
              })}
              {tree.nodes.length === 0 && (
                <div className="absolute left-8 top-8 rounded-2xl border-2 border-dashed border-slate-200 bg-white p-6 text-center font-bold text-slate-400">
                  No people in this tree yet.
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Plus size={18} className="text-teal-500" />
              <h2 className="font-black text-slate-800">Add Relative</h2>
            </div>
            <form onSubmit={addPerson} className="space-y-3">
              <input
                value={personDraft.name}
                onChange={(event) => setPersonDraft((draft) => ({ ...draft, name: event.target.value }))}
                placeholder="Name"
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-semibold text-slate-800 outline-none focus:border-teal-300"
              />
              <div className="grid grid-cols-[80px_1fr] gap-2">
                <input
                  value={personDraft.avatar}
                  onChange={(event) => setPersonDraft((draft) => ({ ...draft, avatar: event.target.value.slice(0, 8) }))}
                  className="rounded-2xl border-2 border-slate-100 bg-slate-50 px-3 py-2 text-center text-xl outline-none focus:border-teal-300"
                />
                <input
                  type="color"
                  value={personDraft.color}
                  onChange={(event) => setPersonDraft((draft) => ({ ...draft, color: event.target.value }))}
                  className="h-11 w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-2"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  value={personDraft.birthYear}
                  onChange={(event) => setPersonDraft((draft) => ({ ...draft, birthYear: event.target.value.replace(/\D/g, "").slice(0, 4) }))}
                  placeholder="Year"
                  className="rounded-2xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-semibold outline-none focus:border-teal-300"
                />
                <input
                  value={personDraft.birthdayMonth}
                  onChange={(event) => setPersonDraft((draft) => ({ ...draft, birthdayMonth: event.target.value.replace(/\D/g, "").slice(0, 2) }))}
                  placeholder="Month"
                  className="rounded-2xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-semibold outline-none focus:border-teal-300"
                />
                <input
                  value={personDraft.birthdayDay}
                  onChange={(event) => setPersonDraft((draft) => ({ ...draft, birthdayDay: event.target.value.replace(/\D/g, "").slice(0, 2) }))}
                  placeholder="Day"
                  className="rounded-2xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-semibold outline-none focus:border-teal-300"
                />
              </div>
              <textarea
                value={personDraft.notes}
                onChange={(event) => setPersonDraft((draft) => ({ ...draft, notes: event.target.value }))}
                placeholder="Notes"
                rows={3}
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-semibold outline-none focus:border-teal-300"
              />
              <button disabled={saving} className="w-full rounded-2xl bg-teal-500 px-4 py-2.5 font-black text-white hover:bg-teal-600 disabled:opacity-40">
                Add Person
              </button>
            </form>
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <GitBranch size={18} className="text-teal-500" />
              <h2 className="font-black text-slate-800">Add Relationship</h2>
            </div>
            <form onSubmit={addRelationship} className="space-y-3">
              <select
                value={relationshipDraft.fromNodeId}
                onChange={(event) => setRelationshipDraft((draft) => ({ ...draft, fromNodeId: event.target.value }))}
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-semibold outline-none focus:border-teal-300"
              >
                <option value="">From person</option>
                {tree.nodes.map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}
              </select>
              <select
                value={relationshipDraft.toNodeId}
                onChange={(event) => setRelationshipDraft((draft) => ({ ...draft, toNodeId: event.target.value }))}
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-semibold outline-none focus:border-teal-300"
              >
                <option value="">To person</option>
                {tree.nodes.map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}
              </select>
              <select
                value={relationshipDraft.relationshipType}
                onChange={(event) => setRelationshipDraft((draft) => ({ ...draft, relationshipType: event.target.value }))}
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-semibold outline-none focus:border-teal-300"
              >
                {relationshipOptions.map((type) => <option key={type} value={type}>{RELATIONSHIP_LABELS[type] ?? type}</option>)}
              </select>
              <input
                value={relationshipDraft.label}
                onChange={(event) => setRelationshipDraft((draft) => ({ ...draft, label: event.target.value }))}
                placeholder="Custom label"
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-semibold outline-none focus:border-teal-300"
              />
              <button disabled={saving || !relationshipDraft.fromNodeId || !relationshipDraft.toNodeId} className="w-full rounded-2xl bg-teal-500 px-4 py-2.5 font-black text-white hover:bg-teal-600 disabled:opacity-40">
                Connect People
              </button>
            </form>
          </section>
        </aside>
      </div>

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-black text-slate-800">People</h2>
          <div className="space-y-2">
            {tree.nodes.map((node) => (
              <div key={node.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-xl" style={{ backgroundColor: node.color }}>{node.avatar}</span>
                  <div className="min-w-0">
                    <p className="truncate font-black text-slate-800">{node.name}</p>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">{nodeSubtitle(node)}</p>
                  </div>
                </div>
                {node.kind === "external" && (
                  <button disabled={saving} onClick={() => remove("node", node.id)} className="rounded-xl p-2 text-red-500 hover:bg-red-50 disabled:opacity-40" title="Remove person">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-black text-slate-800">Relationships</h2>
          <div className="space-y-2">
            {tree.relationships.map((relationship) => {
              const fromNode = nodeById.get(relationship.fromNodeId);
              const toNode = nodeById.get(relationship.toNodeId);
              return (
                <div key={relationship.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3">
                  <div className="min-w-0">
                    <p className="truncate font-black text-slate-800">
                      {fromNode?.name ?? "Unknown"} {"->"} {toNode?.name ?? "Unknown"}
                    </p>
                    <p className="text-sm font-semibold text-slate-500">{relationLabel(relationship)}</p>
                  </div>
                  <button disabled={saving} onClick={() => remove("relationship", relationship.id)} className="rounded-xl p-2 text-red-500 hover:bg-red-50 disabled:opacity-40" title="Remove relationship">
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
            {tree.relationships.length === 0 && (
              <p className="rounded-2xl border-2 border-dashed border-slate-100 p-4 text-center font-bold text-slate-400">No relationships connected yet.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
