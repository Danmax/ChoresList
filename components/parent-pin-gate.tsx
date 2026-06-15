"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { LockKeyhole, LogOut, ShieldCheck } from "lucide-react";

type Status = "loading" | "elevated" | "needs-pin" | "needs-setup" | "signed-out";

const POLL_MS = 60_000;

export function ParentPinGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const sessionRes = await fetch("/api/parent/auth", { cache: "no-store" });
      if (sessionRes.ok) {
        const data = await sessionRes.json();
        if (!data?.ok) {
          setStatus("signed-out");
          return;
        }
      } else {
        setStatus("signed-out");
        return;
      }

      const res = await fetch("/api/parent/elevate", { cache: "no-store" });
      if (!res.ok) {
        setStatus("signed-out");
        return;
      }
      const data = await res.json();
      if (!data?.hasPin) {
        setStatus("needs-setup");
        return;
      }
      setStatus(data.elevated ? "elevated" : "needs-pin");
    } catch {
      setStatus("signed-out");
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    const interval = window.setInterval(refresh, POLL_MS);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
    };
  }, [refresh]);

  async function submitUnlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/parent/elevate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (res.ok && data.elevated) {
        setPin("");
        setStatus("elevated");
      } else {
        setError(data.error ?? "Incorrect PIN.");
        setPin("");
      }
    } catch {
      setError("Could not verify PIN. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submitSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    if (pin.length < 4) {
      setError("PIN must be at least 4 digits.");
      setBusy(false);
      return;
    }
    if (pin !== confirmPin) {
      setError("PINs do not match.");
      setBusy(false);
      return;
    }
    try {
      const res = await fetch("/api/parent/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPin: pin }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setPin("");
        setConfirmPin("");
        setStatus("elevated");
      } else {
        setError(data.error ?? "Could not save PIN.");
      }
    } catch {
      setError("Could not save PIN. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function lock() {
    setBusy(true);
    try {
      await fetch("/api/parent/elevate", { method: "DELETE" });
    } finally {
      setBusy(false);
      setStatus("needs-pin");
    }
  }

  async function requestPinReset() {
    setBusy(true);
    setError("");
    setNotice("");
    setResetUrl("");
    try {
      const res = await fetch("/api/parent/pin-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Could not send PIN reset email.");
        return;
      }
      setNotice("PIN reset link sent to your parent email.");
      if (typeof data?.resetUrl === "string") setResetUrl(data.resetUrl);
    } catch {
      setError("Could not send PIN reset email.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    try {
      await Promise.allSettled([
        fetch("/api/parent/elevate", { method: "DELETE" }),
        fetch("/api/parent/auth", { method: "DELETE" }),
      ]);
    } finally {
      window.location.href = "/parent";
    }
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Loading parent panel…
      </div>
    );
  }

  if (status === "signed-out") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl">
          <h1 className="mb-2 text-2xl font-black text-slate-800">Sign in required</h1>
          <p className="mb-4 text-sm text-slate-500">Sign in to the parent panel to continue.</p>
          <a
            href="/parent"
            className="inline-block rounded-2xl bg-violet-500 px-4 py-2 text-sm font-black text-white"
          >
            Go to sign in
          </a>
        </div>
      </div>
    );
  }

  if (status === "needs-setup") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-100 text-violet-600">
            <ShieldCheck size={32} />
          </div>
          <h1 className="mb-2 text-center text-2xl font-black text-slate-800">Set a parent PIN</h1>
          <p className="mb-5 text-center text-sm text-slate-500">
            The PIN protects sensitive actions like adjusting points, allowance, and adding chores.
            Anyone using this device will need it.
          </p>
          <form onSubmit={submitSetup} className="space-y-3">
            <input
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="New PIN (4–8 digits)"
              className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-center font-mono text-2xl font-black tracking-widest text-slate-800 outline-none focus:border-violet-300"
            />
            <input
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="Confirm PIN"
              className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-center font-mono text-2xl font-black tracking-widest text-slate-800 outline-none focus:border-violet-300"
            />
            <button
              type="submit"
              disabled={busy || pin.length < 4}
              className="w-full rounded-2xl bg-violet-500 px-4 py-3 text-lg font-black text-white disabled:opacity-40"
            >
              Save PIN
            </button>
          </form>
          {error && <p className="mt-3 text-center text-sm font-bold text-red-500">{error}</p>}
        </div>
      </div>
    );
  }

  if (status === "needs-pin") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-100 text-amber-600">
            <LockKeyhole size={32} />
          </div>
          <h1 className="mb-2 text-center text-2xl font-black text-slate-800">Enter parent PIN</h1>
          <p className="mb-5 text-center text-sm text-slate-500">
            The parent panel is locked. Enter your PIN to continue.
          </p>
          <form onSubmit={submitUnlock} className="space-y-3">
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              autoComplete="one-time-code"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="••••"
              className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-center font-mono text-3xl font-black tracking-widest text-slate-800 outline-none focus:border-violet-300"
            />
            <button
              type="submit"
              disabled={busy || pin.length < 4}
              className="w-full rounded-2xl bg-violet-500 px-4 py-3 text-lg font-black text-white disabled:opacity-40"
            >
              Unlock
            </button>
          </form>
          <button
            type="button"
            onClick={requestPinReset}
            disabled={busy}
            className="mt-3 block w-full text-sm font-bold text-violet-500 hover:text-violet-700 disabled:opacity-40"
          >
            Forgot PIN? Email reset link
          </button>
          {notice && <p className="mt-3 text-center text-sm font-bold text-emerald-600">{notice}</p>}
          {resetUrl && (
            <a href={resetUrl} className="mt-2 block break-all text-center text-xs font-bold text-violet-500 hover:text-violet-700">
              Development PIN reset link
            </a>
          )}
          {error && <p className="mt-3 text-center text-sm font-bold text-red-500">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="fixed bottom-4 right-4 z-40 flex gap-2">
        <button
          type="button"
          onClick={lock}
          title="Re-prompt for parent PIN (does not sign out)"
          disabled={busy}
          className="flex items-center gap-1 rounded-full bg-white/90 px-3 py-2 text-xs font-bold text-slate-600 shadow-lg backdrop-blur hover:text-slate-800 disabled:opacity-60"
        >
          <LockKeyhole size={14} /> Lock PIN
        </button>
        <button
          type="button"
          onClick={signOut}
          title="Sign out of the parent account on this device"
          disabled={busy}
          className="flex items-center gap-1 rounded-full bg-white/90 px-3 py-2 text-xs font-bold text-red-500 shadow-lg backdrop-blur hover:text-red-600 disabled:opacity-60"
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>
      {children}
    </div>
  );
}
