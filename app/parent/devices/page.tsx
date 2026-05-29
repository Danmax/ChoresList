"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MonitorSmartphone, Plus, QrCode, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Member = {
  id: number;
  name: string;
  avatar: string;
  role: string;
};

type Device = {
  id: number;
  name: string;
  mode: string;
  memberId: number | null;
  createdAt: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
  member: { id: number; name: string; avatar: string } | null;
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

  async function createPairingCode() {
    if (mode === "member" && !memberId) {
      toast.error("Choose a child for this screen");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/parent/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceName,
          mode,
          memberId: mode === "member" ? Number(memberId) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not create pairing code");
        return;
      }
      setPairing(data);
      toast.success("Pairing code created");
    } finally {
      setLoading(false);
    }
  }

  async function revoke(id: number) {
    if (!confirm("Revoke this device? It will need a new pairing code to connect again.")) return;
    const res = await fetch(`/api/parent/devices?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not revoke device");
      return;
    }
    toast.success("Device revoked");
    load();
  }

  const qrUrl = pairing
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(pairing.pairUrl)}`
    : "";

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

      <div className="grid gap-5 lg:grid-cols-[minmax(0,380px)_1fr]">
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

          <div className="space-y-4">
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
              onClick={createPairingCode}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-500 px-4 py-3 font-black text-white transition-colors hover:bg-violet-600 disabled:opacity-40"
            >
              <Plus size={18} /> {loading ? "Creating..." : "Create Code"}
            </button>
          </div>

          {pairing && (
            <div className="mt-5 rounded-3xl border-2 border-violet-100 bg-violet-50 p-4 text-center">
              <p className="text-xs font-black uppercase tracking-wide text-violet-500">Pairing code</p>
              <div className="my-2 font-mono text-5xl font-black tracking-widest text-slate-800">{pairing.code}</div>
              <img src={qrUrl} alt="Device pairing QR code" className="mx-auto my-4 rounded-2xl bg-white p-3 shadow-sm" />
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

          <div className="overflow-hidden rounded-2xl border border-slate-100">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Device</th>
                  <th className="px-4 py-3">Access</th>
                  <th className="px-4 py-3">Last Seen</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {devices.map((device) => (
                  <tr key={device.id} className="font-bold text-slate-700">
                    <td className="px-4 py-3">{device.name}</td>
                    <td className="px-4 py-3">
                      {device.mode === "member" && device.member
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
                      {!device.revokedAt && (
                        <button
                          type="button"
                          onClick={() => revoke(device.id)}
                          className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-3 py-1.5 text-xs font-black text-red-500 transition-colors hover:bg-red-100"
                        >
                          <Trash2 size={14} /> Revoke
                        </button>
                      )}
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
