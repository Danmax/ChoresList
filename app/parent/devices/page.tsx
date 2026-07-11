"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Edit3, MonitorSmartphone, Plus, QrCode, RefreshCw, RotateCw, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { LocalQrCode } from "@/components/local-qr-code";

type Member = {
  id: string;
  name: string;
  avatar: string;
  role: string;
};

type Device = {
  id: string;
  name: string;
  mode: string;
  memberId: string | null;
  createdAt: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
  member: { id: string; name: string; avatar: string } | null;
};

type Pairing = {
  code: string;
  pairUrl: string;
  expiresAt: string;
};

export default function DevicesPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceName, setDeviceName] = useState("Kitchen task screen");
  const [mode, setMode] = useState<"household" | "member">("household");
  const [memberId, setMemberId] = useState("");
  const [pairing, setPairing] = useState<Pairing | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyDeviceId, setBusyDeviceId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editName, setEditName] = useState("");
  const [editMode, setEditMode] = useState<"household" | "member">("household");
  const [editMemberId, setEditMemberId] = useState("");

  const childMembers = useMemo(() => members.filter((member) => member.role === "child"), [members]);

  const load = useCallback(async () => {
    const [membersRes, devicesRes] = await Promise.all([
      fetch("/api/members"),
      fetch("/api/parent/devices"),
    ]);
    if (membersRes.ok) {
      const data = await membersRes.json();
      setMembers(Array.isArray(data) ? data : Array.isArray(data?.members) ? data.members : []);
    }
    if (devicesRes.ok) setDevices(await devicesRes.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createPairingCode(device?: Device) {
    const nextMode = device ? device.mode === "member" ? "member" : "household" : mode;
    const nextMemberId = device ? device.memberId ?? "" : memberId;
    if (nextMode === "member" && !nextMemberId) {
      toast.error("Choose a child for this screen");
      return;
    }

    if (device) setBusyDeviceId(device.id);
    setLoading(true);
    try {
      const res = await fetch("/api/parent/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: device?.id,
          deviceName: device?.name ?? deviceName,
          mode: nextMode,
          memberId: nextMode === "member" ? nextMemberId : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not create pairing code");
        return;
      }
      setPairing(data);
      toast.success(device ? "Re-pairing code created" : "Pairing code created");
    } finally {
      setLoading(false);
      setBusyDeviceId("");
    }
  }

  function startEdit(device: Device) {
    setEditingId(device.id);
    setEditName(device.name);
    setEditMode(device.mode === "member" ? "member" : "household");
    setEditMemberId(device.memberId ?? "");
  }

  function cancelEdit() {
    setEditingId("");
    setEditName("");
    setEditMode("household");
    setEditMemberId("");
  }

  async function saveDevice(id: string) {
    if (editMode === "member" && !editMemberId) {
      toast.error("Choose a child for this screen");
      return;
    }

    setBusyDeviceId(id);
    try {
      const res = await fetch("/api/parent/devices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          deviceName: editName,
          mode: editMode,
          memberId: editMode === "member" ? editMemberId : null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not update device");
        return;
      }
      toast.success("Device updated");
      cancelEdit();
      await load();
    } finally {
      setBusyDeviceId("");
    }
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this device? It will need a new pairing code to connect again.")) return;
    setBusyDeviceId(id);
    const res = await fetch(`/api/parent/devices?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not revoke device");
      setBusyDeviceId("");
      return;
    }
    toast.success("Device revoked");
    await load();
    setBusyDeviceId("");
  }

  async function deleteDevice(id: string) {
    if (!confirm("Delete this device record? This cannot be undone.")) return;
    setBusyDeviceId(id);
    const res = await fetch(`/api/parent/devices?id=${id}&action=delete`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete device");
      setBusyDeviceId("");
      return;
    }
    toast.success("Device deleted");
    await load();
    setBusyDeviceId("");
  }

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/parent" className="rounded-2xl bg-white p-2 shadow-sm transition-shadow hover:shadow-md">
            <ArrowLeft size={20} className="text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-800 sm:text-3xl">Device Screens</h1>
            <p className="text-sm font-semibold text-slate-500">Pair a tablet, TV, or shared kid device without parent sign-in.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          className="flex w-fit items-center gap-2 rounded-2xl bg-white px-4 py-2.5 font-bold text-slate-600 shadow-sm transition-shadow hover:shadow-md"
        >
          <RefreshCw size={17} /> Refresh
        </button>
      </div>

      <div className="space-y-5">
        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-violet-100 p-3 text-violet-600">
              <QrCode size={24} />
            </div>
            <div>
              <h2 className="font-black text-slate-800">Create Pairing Code</h2>
              <p className="text-xs font-bold text-slate-400">Codes expire after 10 minutes.</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_minmax(260px,1fr)_220px] lg:items-end">
            <label className="block">
              <span className="text-sm font-bold text-slate-600">Device name</span>
              <input
                value={deviceName}
                onChange={(event) => setDeviceName(event.target.value)}
                className="mt-1 w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-semibold text-slate-800 outline-none focus:border-violet-300"
              />
            </label>

            <div>
              <span className="text-sm font-bold text-slate-600">Screen type</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {[
                  { value: "household", label: "All kids" },
                  { value: "member", label: "One child" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMode(option.value as "household" | "member")}
                    className={`rounded-2xl border-2 px-3 py-2 text-sm font-black transition-colors ${
                      mode === option.value
                        ? "border-violet-400 bg-violet-50 text-violet-700"
                        : "border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {mode === "member" && (
              <label className="block">
                <span className="text-sm font-bold text-slate-600">Child</span>
                <select
                  value={memberId}
                  onChange={(event) => setMemberId(event.target.value)}
                  className="mt-1 w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-semibold text-slate-800 outline-none focus:border-violet-300"
                >
                  <option value="">Choose child</option>
                  {childMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.avatar} {member.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <button
              type="button"
              disabled={loading}
              onClick={() => createPairingCode()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-500 px-4 py-3 font-black text-white transition-colors hover:bg-violet-600 disabled:opacity-40"
            >
              <Plus size={18} /> {loading ? "Creating..." : "Create Code"}
            </button>
          </div>

          {pairing && (
            <div className="mt-5 rounded-3xl border-2 border-violet-100 bg-violet-50 p-4 text-center">
              <p className="text-xs font-black uppercase tracking-wide text-violet-500">Pairing code</p>
              <div className="my-2 font-mono text-5xl font-black tracking-widest text-slate-800">{pairing.code}</div>
              <LocalQrCode value={pairing.pairUrl} alt="Device pairing QR code" className="mx-auto my-4 rounded-2xl bg-white p-3 shadow-sm" />
              <p className="break-all text-xs font-bold text-slate-500">{pairing.pairUrl}</p>
              <p className="mt-2 text-xs font-bold text-slate-400">
                Expires {new Date(pairing.expiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </p>
            </div>
          )}
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-600">
              <MonitorSmartphone size={24} />
            </div>
            <div>
              <h2 className="font-black text-slate-800">Paired Devices</h2>
              <p className="text-xs font-bold text-slate-400">Revoke old or missing screens anytime.</p>
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {devices.map((device) => (
              <div key={device.id} className="rounded-2xl border border-slate-100 p-3">
                {editingId === device.id ? (
                  <DeviceEditFields
                    childMembers={childMembers}
                    editName={editName}
                    editMode={editMode}
                    editMemberId={editMemberId}
                    setEditName={setEditName}
                    setEditMode={setEditMode}
                    setEditMemberId={setEditMemberId}
                  />
                ) : (
                  <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-black text-slate-800">{device.name}</p>
                    <p className="text-xs font-bold text-slate-400">
                      {device.mode === "member" && device.member
                        ? `${device.member.avatar} ${device.member.name}`
                        : "All kids"}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${device.revokedAt ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-600"}`}>
                    {device.revokedAt ? "Revoked" : "Active"}
                  </span>
                </div>
                <p className="mt-2 text-xs font-bold text-slate-500">
                  Last seen: {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : "Never"}
                </p>
                  </>
                )}
                <DeviceActions
                  device={device}
                  isEditing={editingId === device.id}
                  busy={busyDeviceId === device.id}
                  onEdit={() => startEdit(device)}
                  onCancel={cancelEdit}
                  onSave={() => saveDevice(device.id)}
                  onPair={() => createPairingCode(device)}
                  onRevoke={() => revoke(device.id)}
                  onDelete={() => deleteDevice(device.id)}
                />
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-2xl border border-slate-100 md:block">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Device</th>
                  <th className="px-4 py-3">Access</th>
                  <th className="px-4 py-3">Last Seen</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {devices.map((device) => (
                  <tr key={device.id} className="font-bold text-slate-700">
                    <td className="px-4 py-3">
                      {editingId === device.id ? (
                        <input
                          value={editName}
                          onChange={(event) => setEditName(event.target.value)}
                          className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-violet-300"
                        />
                      ) : device.name}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === device.id ? (
                        <div className="grid gap-2">
                          <select
                            value={editMode}
                            onChange={(event) => setEditMode(event.target.value as "household" | "member")}
                            className="rounded-xl border-2 border-slate-100 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-violet-300"
                          >
                            <option value="household">All kids</option>
                            <option value="member">One child</option>
                          </select>
                          {editMode === "member" && (
                            <select
                              value={editMemberId}
                              onChange={(event) => setEditMemberId(event.target.value)}
                              className="rounded-xl border-2 border-slate-100 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-violet-300"
                            >
                              <option value="">Choose child</option>
                              {childMembers.map((member) => (
                                <option key={member.id} value={member.id}>
                                  {member.avatar} {member.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      ) : device.mode === "member" && device.member
                        ? `${device.member.avatar} ${device.member.name}`
                        : "All kids"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs ${device.revokedAt ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-600"}`}>
                        {device.revokedAt ? "Revoked" : "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DeviceActions
                        device={device}
                        isEditing={editingId === device.id}
                        busy={busyDeviceId === device.id}
                        onEdit={() => startEdit(device)}
                        onCancel={cancelEdit}
                        onSave={() => saveDevice(device.id)}
                        onPair={() => createPairingCode(device)}
                        onRevoke={() => revoke(device.id)}
                        onDelete={() => deleteDevice(device.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {devices.length === 0 && (
            <div className="py-12 text-center">
              <div className="mb-3 text-5xl">📺</div>
              <p className="font-black text-slate-600">No paired screens yet</p>
              <p className="text-sm font-semibold text-slate-400">Create a code, then open `/pair` on the kid device.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function DeviceEditFields({
  childMembers,
  editName,
  editMode,
  editMemberId,
  setEditName,
  setEditMode,
  setEditMemberId,
}: {
  childMembers: Member[];
  editName: string;
  editMode: "household" | "member";
  editMemberId: string;
  setEditName: (value: string) => void;
  setEditMode: (value: "household" | "member") => void;
  setEditMemberId: (value: string) => void;
}) {
  return (
    <div className="grid gap-3">
      <label className="block">
        <span className="text-xs font-black uppercase text-slate-400">Device name</span>
        <input
          value={editName}
          onChange={(event) => setEditName(event.target.value)}
          className="mt-1 w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-violet-300"
        />
      </label>
      <label className="block">
        <span className="text-xs font-black uppercase text-slate-400">Access</span>
        <select
          value={editMode}
          onChange={(event) => setEditMode(event.target.value as "household" | "member")}
          className="mt-1 w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-violet-300"
        >
          <option value="household">All kids</option>
          <option value="member">One child</option>
        </select>
      </label>
      {editMode === "member" && (
        <label className="block">
          <span className="text-xs font-black uppercase text-slate-400">Child</span>
          <select
            value={editMemberId}
            onChange={(event) => setEditMemberId(event.target.value)}
            className="mt-1 w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-violet-300"
          >
            <option value="">Choose child</option>
            {childMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.avatar} {member.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

function DeviceActions({
  device,
  isEditing,
  busy,
  onEdit,
  onCancel,
  onSave,
  onPair,
  onRevoke,
  onDelete,
}: {
  device: Device;
  isEditing: boolean;
  busy: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onPair: () => void;
  onRevoke: () => void;
  onDelete: () => void;
}) {
  if (isEditing) {
    return (
      <div className="mt-3 flex flex-wrap justify-end gap-2 md:mt-0">
        <button type="button" disabled={busy} onClick={onCancel} className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-40">
          <X size={14} /> Cancel
        </button>
        <button type="button" disabled={busy} onClick={onSave} className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-600 transition-colors hover:bg-emerald-100 disabled:opacity-40">
          <Save size={14} /> Save
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap justify-end gap-2 md:mt-0">
      <button type="button" disabled={busy} onClick={onEdit} className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-40">
        <Edit3 size={14} /> Edit
      </button>
      <button type="button" disabled={busy} onClick={onPair} className="inline-flex items-center gap-1 rounded-xl bg-violet-50 px-3 py-2 text-xs font-black text-violet-600 transition-colors hover:bg-violet-100 disabled:opacity-40">
        <RotateCw size={14} /> {device.revokedAt ? "Re-pair" : "Pair Again"}
      </button>
      {!device.revokedAt && (
        <button type="button" disabled={busy} onClick={onRevoke} className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-500 transition-colors hover:bg-red-100 disabled:opacity-40">
          <X size={14} /> Revoke
        </button>
      )}
      {device.revokedAt && (
        <button type="button" disabled={busy} onClick={onDelete} className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-500 transition-colors hover:bg-red-100 disabled:opacity-40">
          <Trash2 size={14} /> Delete
        </button>
      )}
    </div>
  );
}
