"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, ExternalLink, RefreshCw, ShieldCheck, UserCog, Users } from "lucide-react";
import { toast } from "sonner";

type ParentUser = {
  id: number;
  email: string;
  accountRole: string;
  emailVerified: boolean;
  createdAt: string;
  _count: {
    communityMemberships: number;
    createdCommunityEvents: number;
  };
};

type FamilyMember = {
  id: number;
  name: string;
  age: number;
  role: string;
  avatar: string;
  totalPoints: number;
  _count: {
    assignments: number;
    devices: number;
  };
};

type CommunityMember = {
  id: number;
  parentId: number;
  role: string;
  status: string;
  parent: {
    id: number;
    email: string;
    householdId: number;
  };
};

type CommunityGroup = {
  id: number;
  name: string;
  groupType: string;
  visibility: string;
  ownedByHousehold: boolean;
  manageableByHousehold: boolean;
  currentHouseholdMembers: CommunityMember[];
  creator: {
    id: number;
    email: string;
    householdId: number;
  };
  _count: {
    members: number;
    events: number;
  };
};

type AdminData = {
  currentParentId: number;
  household: {
    id: number;
    name: string;
    createdAt: string;
    _count: {
      parents: number;
      members: number;
      devices: number;
      groceryLists: number;
    };
  };
  parents: ParentUser[];
  familyMembers: FamilyMember[];
  communities: CommunityGroup[];
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  parent: "Parent",
  manager: "Manager",
  member: "Member",
};

export default function SuperAdminConfigPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");

  const ownerCount = useMemo(
    () => data?.parents.filter((parent) => parent.accountRole === "owner").length ?? 0,
    [data]
  );

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/parent/admin");
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(payload?.error ?? "Could not load super admin configuration");
      setLoading(false);
      return;
    }
    setData(payload);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function updateAdmin(action: string, body: Record<string, unknown>, success: string) {
    const key = `${action}:${Object.values(body).join(":")}`;
    setSavingKey(key);
    try {
      const res = await fetch("/api/parent/admin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(payload?.error ?? "Could not save admin change");
        return;
      }
      toast.success(success);
      await load();
    } finally {
      setSavingKey("");
    }
  }

  if (loading && !data) {
    return <div className="flex min-h-screen items-center justify-center text-xl font-black text-slate-500">Loading super admin...</div>;
  }

  if (!data) {
    return (
      <div className="min-h-screen p-4 sm:p-6">
        <Link href="/parent" className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 font-bold text-slate-600 shadow-sm">
          <ArrowLeft size={18} /> Parent Panel
        </Link>
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
              <ShieldCheck size={28} className="text-slate-700" /> Super Admin Configuration
            </h1>
            <p className="text-sm font-semibold text-slate-500">Manage users and communities for {data.household.name}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex w-fit items-center gap-2 rounded-2xl bg-white px-4 py-2.5 font-black text-slate-600 shadow-sm transition-shadow hover:shadow-md disabled:opacity-50"
        >
          <RefreshCw size={18} /> Refresh
        </button>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Parent users" value={data.household._count.parents} icon={<UserCog size={22} />} />
        <SummaryCard label="Family profiles" value={data.household._count.members} icon={<Users size={22} />} />
        <SummaryCard label="Paired devices" value={data.household._count.devices} icon={<ShieldCheck size={22} />} />
        <SummaryCard label="Communities" value={data.communities.length} icon={<Building2 size={22} />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-800">Parent Users</h2>
              <p className="text-sm font-semibold text-slate-500">Owners can change parent access levels.</p>
            </div>
            <Link href="/parent/members" className="text-sm font-black text-violet-600 hover:text-violet-700">Family profiles</Link>
          </div>

          <div className="space-y-3">
            {data.parents.map((parent) => {
              const cannotDemoteLastOwner = parent.accountRole === "owner" && ownerCount <= 1;
              return (
                <div key={parent.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-black text-slate-800">{parent.email}</p>
                      <p className="text-xs font-bold text-slate-500">
                        {parent.emailVerified ? "Verified" : "Unverified"} · {parent._count.communityMemberships} community memberships
                      </p>
                    </div>
                    <select
                      value={parent.accountRole}
                      disabled={cannotDemoteLastOwner || savingKey.startsWith("parentRole")}
                      onChange={(event) => updateAdmin("parentRole", { parentId: parent.id, accountRole: event.target.value }, "Parent role updated")}
                      className="rounded-2xl border-2 border-slate-100 bg-white px-3 py-2 text-sm font-black text-slate-700 outline-none focus:border-violet-300 disabled:opacity-50"
                      title={cannotDemoteLastOwner ? "At least one owner is required" : "Change parent role"}
                    >
                      <option value="owner">Owner</option>
                      <option value="parent">Parent</option>
                      <option value="grandparent">Grandparent</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-black text-slate-800">Communities</h2>
            <p className="text-sm font-semibold text-slate-500">Review connected communities and update household member roles.</p>
          </div>

          <div className="space-y-4">
            {data.communities.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-6 text-center">
                <p className="font-black text-slate-700">No connected communities yet</p>
                <Link href="/community" className="mt-3 inline-flex rounded-2xl bg-violet-500 px-4 py-2 font-black text-white hover:bg-violet-600">
                  Create Community
                </Link>
              </div>
            ) : data.communities.map((group) => (
              <div key={group.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-slate-800">{group.name}</h3>
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs font-black text-slate-500">{group.groupType}</span>
                      {group.ownedByHousehold && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-black text-emerald-700">household owned</span>}
                      {!group.manageableByHousehold && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-700">view only</span>}
                    </div>
                    <p className="text-xs font-bold text-slate-500">
                      {group._count.members} members · {group._count.events} events · created by {group.creator.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={group.visibility}
                      disabled={!group.manageableByHousehold || savingKey.startsWith("communityVisibility")}
                      onChange={(event) => updateAdmin("communityVisibility", { groupId: group.id, visibility: event.target.value }, "Community visibility updated")}
                      className="rounded-2xl border-2 border-slate-100 bg-white px-3 py-2 text-sm font-black text-slate-700 outline-none focus:border-violet-300 disabled:opacity-50"
                    >
                      <option value="private">Private</option>
                      <option value="public">Public</option>
                    </select>
                    <Link href={`/community/${group.id}`} className="rounded-2xl bg-white p-2 text-slate-600 shadow-sm hover:shadow-md" title="Open community">
                      <ExternalLink size={18} />
                    </Link>
                  </div>
                </div>

                <div className="space-y-2">
                  {group.currentHouseholdMembers.map((member) => (
                    <div key={member.id} className="flex flex-col gap-2 rounded-xl bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-700">{member.parent.email}</p>
                        <p className="text-xs font-bold text-slate-400">{ROLE_LABELS[member.role] ?? member.role}</p>
                      </div>
                      <select
                        value={member.role}
                        disabled={!group.manageableByHousehold || savingKey.startsWith("communityMemberRole")}
                        onChange={(event) => updateAdmin("communityMemberRole", { groupId: group.id, parentId: member.parentId, role: event.target.value }, "Community member role updated")}
                        className="rounded-2xl border-2 border-slate-100 bg-slate-50 px-3 py-2 text-sm font-black text-slate-700 outline-none focus:border-violet-300 disabled:opacity-50"
                      >
                        <option value="owner">Owner</option>
                        <option value="manager">Manager</option>
                        <option value="member">Member</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-800">Family Profiles</h2>
            <p className="text-sm font-semibold text-slate-500">Quick user profile overview for this household.</p>
          </div>
          <Link href="/parent/members" className="rounded-2xl bg-violet-500 px-4 py-2 text-sm font-black text-white hover:bg-violet-600">
            Manage Profiles
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.familyMembers.map((member) => (
            <div key={member.id} className="rounded-2xl bg-slate-50 p-4">
              <div className="mb-2 flex items-center gap-3">
                <span className="text-3xl">{member.avatar}</span>
                <div>
                  <p className="font-black text-slate-800">{member.name}</p>
                  <p className="text-xs font-bold text-slate-500">{ROLE_LABELS[member.role] ?? member.role} · age {member.age}</p>
                </div>
              </div>
              <p className="text-xs font-bold text-slate-500">
                {member.totalPoints} points · {member._count.assignments} assignments · {member._count.devices} devices
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
        {icon}
      </div>
      <p className="text-2xl font-black text-slate-800">{value}</p>
      <p className="text-sm font-bold text-slate-500">{label}</p>
    </div>
  );
}
