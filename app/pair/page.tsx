"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, MonitorSmartphone } from "lucide-react";

export default function PairDevicePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pairing, setPairing] = useState(false);

  const PAIRING_CODE_LENGTH = 8;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get("code") ?? "";
    if (codeParam) setCode(codeParam.replace(/\D/g, "").slice(0, PAIRING_CODE_LENGTH));
  }, []);

  async function pair(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPairing(true);

    try {
      const res = await fetch("/api/device/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not pair this device");
        return;
      }
      router.replace(data.redirectTo ?? "/screen/tasks");
    } catch {
      setError("Could not pair this device");
    } finally {
      setPairing(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-100 text-violet-600">
          <MonitorSmartphone size={34} />
        </div>
        <h1 className="mb-2 text-2xl font-black text-slate-800">Pair Device</h1>
        <p className="mb-6 text-sm font-semibold text-slate-500">Enter the code from the parent device screen.</p>

        <form onSubmit={pair} className="space-y-4">
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, PAIRING_CODE_LENGTH))}
            className="w-full rounded-3xl border-2 border-slate-100 bg-slate-50 px-4 py-4 text-center font-mono text-4xl font-black tracking-widest text-slate-800 outline-none focus:border-violet-300"
            placeholder={"0".repeat(PAIRING_CODE_LENGTH)}
            maxLength={PAIRING_CODE_LENGTH}
          />

          <button
            type="submit"
            disabled={pairing || code.length !== PAIRING_CODE_LENGTH}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-500 px-4 py-3 text-lg font-black text-white transition-colors hover:bg-violet-600 disabled:opacity-40"
          >
            {pairing ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
            Pair Screen
          </button>
        </form>

        {error && <p className="mt-4 text-sm font-bold text-red-500">{error}</p>}
      </div>
    </div>
  );
}
