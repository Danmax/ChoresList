"use client";

import { useEffect } from "react";

const COOLDOWN_KEY = "chunk-reload-last";
const COOLDOWN_MS = 30_000;

function isChunkError(err: unknown): boolean {
  if (!err) return false;
  const message = err instanceof Error ? err.message : String(err);
  const name = err instanceof Error ? err.name : "";
  return (
    name === "ChunkLoadError" ||
    /Loading (?:CSS )?chunk [\w-]+ failed/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Unable to preload CSS/i.test(message)
  );
}

function shouldReload(reason: string): boolean {
  try {
    const last = Number(sessionStorage.getItem(COOLDOWN_KEY) ?? "0");
    if (Number.isFinite(last) && Date.now() - last < COOLDOWN_MS) {
      return false;
    }
    sessionStorage.setItem(COOLDOWN_KEY, String(Date.now()));
  } catch {
    return false;
  }
  console.warn(`[chunk-reloader] reloading: ${reason}`);
  return true;
}

export function ChunkReloader() {
  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      if (isChunkError(event.reason) && shouldReload("unhandledrejection")) {
        window.location.reload();
      }
    };

    const onError = (event: ErrorEvent) => {
      if (isChunkError(event.error) && shouldReload("error")) {
        window.location.reload();
      }
    };

    const onResourceError = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target || target === (window as unknown as EventTarget)) return;
      const tag = target.tagName;
      if (tag !== "LINK" && tag !== "SCRIPT") return;
      const src = (target as HTMLLinkElement).href || (target as HTMLScriptElement).src || "";
      if (!src.includes("/_next/static/")) return;
      if (shouldReload(`resource:${tag.toLowerCase()}`)) {
        window.location.reload();
      }
    };

    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("error", onError);
    window.addEventListener("error", onResourceError, true);

    return () => {
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onError);
      window.removeEventListener("error", onResourceError, true);
    };
  }, []);

  return null;
}
