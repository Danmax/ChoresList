"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Maximize, Minimize } from "lucide-react";
import styles from "./game-player.module.css";

/** Keeps the same game mounted when switching between page and fullscreen play. */
export function GamePlayer({ gameKey, title, children }: { gameKey: string | null; title: string; children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const native = useRef(false);
  // These games already provide a dedicated fullscreen workspace.
  const enabled = !!gameKey && gameKey !== "jungle-vine-swing" && gameKey !== "coloring-adventures";

  useEffect(() => {
    if (enabled) {
      setExpanded(window.matchMedia("(max-width: 1024px), (pointer: coarse)").matches);
      root.current?.scrollIntoView({ block: "start" });
    } else setExpanded(false);
  }, [gameKey, enabled]);

  useEffect(() => {
    if (!enabled || !expanded) return;
    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    const close = () => { setExpanded(false); toggle.current?.focus({ preventScroll: true }); };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.fullscreenElement) close();
    };
    const changed = () => {
      if (native.current && !document.fullscreenElement) { native.current = false; close(); }
    };
    const element = root.current;
    document.addEventListener("keydown", key);
    document.addEventListener("fullscreenchange", changed);
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
      document.removeEventListener("keydown", key);
      document.removeEventListener("fullscreenchange", changed);
      if (document.fullscreenElement === element) void document.exitFullscreen().catch(() => {});
      native.current = false;
    };
  }, [enabled, expanded]);

  async function toggleFullscreen() {
    if (expanded) {
      if (document.fullscreenElement === root.current) await document.exitFullscreen().catch(() => {});
      setExpanded(false);
      toggle.current?.focus({ preventScroll: true });
    } else {
      setExpanded(true);
      try {
        await root.current?.requestFullscreen?.();
        native.current = document.fullscreenElement === root.current;
      } catch { /* Viewport fullscreen also works on tablets without the browser API. */ }
    }
  }

  if (!enabled) return children;
  return <div ref={root} className={`${styles.player} ${expanded ? styles.expanded : ""}`} data-game-player={gameKey} data-game-expanded={expanded}>
    <div className={styles.toolbar}>
      <span>{title}</span>
      <button ref={toggle} type="button" onClick={() => void toggleFullscreen()} aria-label={expanded ? "Exit full screen" : "Enter full screen"} aria-pressed={expanded}>
        {expanded ? <Minimize size={18} /> : <Maximize size={18} />}
        {expanded ? "Exit full screen" : "Full screen"}
      </button>
    </div>
    <div className={styles.content}>{children}</div>
  </div>;
}
