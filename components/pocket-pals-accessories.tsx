"use client";

import { useRef, useState, type PointerEvent } from "react";
import { accessoryPosition, PET_SHOP, wornAccessories, type PetState } from "@/lib/pocket-pals";
import styles from "./pocket-pals.module.css";

type Position = { x: number; y: number };
const clamp = (value: number) => Math.max(5, Math.min(95, value));

export function PalAccessories({ pet, editing, busy, onMove }: { pet: PetState; editing: boolean; busy: boolean; onMove: (id: string, position: Position) => Promise<boolean> }) {
  return <>{wornAccessories(pet).map((id) => <PalAccessory key={id} pet={pet} id={id} editing={editing} busy={busy} onMove={onMove} />)}</>;
}

function PalAccessory({ pet, id, editing, busy, onMove }: { pet: PetState; id: string; editing: boolean; busy: boolean; onMove: (id: string, position: Position) => Promise<boolean> }) {
  const [draft, setDraft] = useState<Position | null>(null);
  const drag = useRef<{ startX: number; startY: number; position: Position; bounds: DOMRect } | null>(null);
  const item = PET_SHOP.find((item) => item.id === id)!;
  const position = draft ?? accessoryPosition(pet, id);
  const style = { left: `${position.x}%`, top: `${position.y}%` };

  async function save(next: Position) {
    setDraft(next);
    try { await onMove(id, next); } finally { setDraft(null); }
  }
  function pointerPosition(event: PointerEvent<HTMLButtonElement>) {
    const active = drag.current!;
    return {
      x: clamp(active.position.x + (event.clientX - active.startX) / active.bounds.width * 100),
      y: clamp(active.position.y + (event.clientY - active.startY) / active.bounds.height * 100),
    };
  }
  if (!editing) return <span className={styles.wornAccessory} style={style} role="img" aria-label={item.name}>{item.emoji}</span>;
  return <button type="button" className={`${styles.wornAccessory} ${styles.editAccessory}`} style={style} aria-label={`Place ${item.name}`} disabled={busy}
    onPointerDown={(event) => {
      if (event.button !== 0 || busy) return;
      event.preventDefault();
      event.currentTarget.focus();
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { startX: event.clientX, startY: event.clientY, position, bounds: event.currentTarget.parentElement!.getBoundingClientRect() };
    }}
    onPointerMove={(event) => { if (drag.current) setDraft(pointerPosition(event)); }}
    onPointerUp={(event) => {
      if (!drag.current) return;
      const next = pointerPosition(event);
      drag.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
      void save(next);
    }}
    onPointerCancel={() => { drag.current = null; setDraft(null); }}
    onLostPointerCapture={() => { if (drag.current) { drag.current = null; setDraft(null); } }}
    onKeyDown={(event) => {
      if (busy || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
      event.preventDefault();
      const step = event.shiftKey ? 5 : 2;
      void save({ x: clamp(position.x + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0)), y: clamp(position.y + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0)) });
    }}>{item.emoji}</button>;
}
