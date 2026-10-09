"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { roomItemPosition, treasureRoomObjects, type RoomItemPosition, type RoomPositions, type TreasureObjectId, type TreasureView } from "@/lib/pocket-pals-treasure";
import styles from "./pocket-pals.module.css";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function PocketPalRoomObjects({ owned, room, positions, trail, arranging, busy, onFind, onMove }: { owned: string[]; room: string; positions?: RoomPositions; trail?: TreasureView; arranging: boolean; busy: boolean; onFind: (id: TreasureObjectId) => void; onMove: (id: TreasureObjectId, position: RoomItemPosition) => Promise<boolean> }) {
  const [draft, setDraft] = useState<Partial<Record<TreasureObjectId, RoomItemPosition>>>({});
  const dragging = useRef<{ id: TreasureObjectId; element: HTMLButtonElement; moved: boolean } | null>(null);
  useEffect(() => { setDraft({}); }, [room, positions]);

  function pointerPosition(event: PointerEvent<HTMLButtonElement>) {
    const bounds = event.currentTarget.parentElement!.getBoundingClientRect();
    return { x: Math.round(clamp((event.clientX - bounds.left) / bounds.width * 100, 8, 92) * 10) / 10, y: Math.round(clamp((event.clientY - bounds.top) / bounds.height * 100, 20, 82) * 10) / 10 };
  }
  function beginDrag(event: PointerEvent<HTMLButtonElement>, id: TreasureObjectId) {
    if (!arranging || busy) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragging.current = { id, element: event.currentTarget, moved: false };
  }
  function drag(event: PointerEvent<HTMLButtonElement>) {
    if (!dragging.current || dragging.current.id !== event.currentTarget.dataset.itemId) return;
    dragging.current.moved = true;
    const id = dragging.current.id;
    const position = pointerPosition(event);
    setDraft((current) => ({ ...current, [id]: position }));
  }
  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    const active = dragging.current;
    if (!active || active.id !== event.currentTarget.dataset.itemId) return;
    dragging.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (active.moved) {
      const position = pointerPosition(event);
      void onMove(active.id, position).then((saved) => { if (!saved) setDraft((current) => { const next = { ...current }; delete next[active.id]; return next; }); });
    }
  }
  function nudge(event: KeyboardEvent<HTMLButtonElement>, id: TreasureObjectId, position: RoomItemPosition) {
    if (!arranging || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const step = event.shiftKey ? 5 : 2;
    const next = { x: clamp(position.x + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0), 8, 92), y: clamp(position.y + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0), 20, 82) };
    setDraft((current) => ({ ...current, [id]: next }));
    void onMove(id, next).then((saved) => { if (!saved) setDraft((current) => { const reset = { ...current }; delete reset[id]; return reset; }); });
  }
  return <>{treasureRoomObjects(owned).filter((object) => !trail || trail.objectIds.includes(object.id)).map((object) => {
    const found = trail?.found.includes(object.id);
    const content = <><span className={"sprite" in object ? styles.trailPropSprite : styles.trailDecorEmoji} style={"sprite" in object ? { backgroundPosition: `${object.sprite * 50}% 50%` } : undefined}>{"sprite" in object ? null : object.emoji}</span>{found && <img className={styles.foundKey} src="/games/pocket-pals/treasure-key-v1.png" alt="Key found" draggable={false} />}</>;
    const savedPosition = roomItemPosition(positions, room, object.id);
    const currentPosition = draft[object.id] ?? savedPosition;
    const position = { left: `${currentPosition.x}%`, top: `${currentPosition.y}%` };
    return trail ? <button key={object.id} type="button" className={`${styles.trailObject} ${found ? styles.trailFound : ""}`} style={position} aria-label={`Explore ${object.name}`} aria-pressed={!!found} disabled={busy || found || trail.chestReady} onClick={() => onFind(object.id)}>{content}</button>
      : <button key={object.id} type="button" data-item-id={object.id} className={`${styles.roomObject} ${arranging ? styles.arrangeableItem : ""}`} style={position} aria-label={arranging ? `Move ${object.name}` : object.name} disabled={!arranging || busy} onPointerDown={(event) => beginDrag(event, object.id)} onPointerMove={drag} onPointerUp={endDrag} onPointerCancel={endDrag} onKeyDown={(event) => nudge(event, object.id, currentPosition)}>{content}</button>;
  })}</>;
}

export function TreasureChest({ open, disabled, onOpen }: { open: boolean; disabled: boolean; onOpen: () => void }) {
  return <button type="button" aria-label={open ? "Treasure chest opened" : "Open treasure chest"} className={`${styles.treasureChest} ${open ? styles.chestOpened : ""}`} disabled={disabled || open} onClick={onOpen}><span style={{ backgroundPosition: `${open ? 100 : 0}% 50%` }} />{open && <span className={styles.treasureSparkles} aria-hidden="true">✨</span>}</button>;
}

export function TreasureTrailPanel({ trail }: { trail: TreasureView }) {
  const [showHint, setShowHint] = useState(false);
  useEffect(() => { setShowHint(false); }, [trail.step]);
  return <section className={styles.treasurePanel} aria-label="Treasure Trail clues">
    <div className={styles.panelHeading}><h3>Treasure Trail</h3><span>{trail.step}/{trail.total} keys</span></div>
    <div className={styles.trailProgress} aria-label={`${trail.step} of ${trail.total} keys found`}>{Array.from({ length: trail.total }, (_, i) => <span key={i} className={i < trail.step ? styles.keyCollected : ""}>{i < trail.step ? <img src="/games/pocket-pals/treasure-key-v1.png" alt={`Key ${i + 1} found`} /> : <span aria-hidden="true">?</span>}</span>)}<span aria-hidden="true">→ 🎁</span></div>
    <p className={styles.trailClue} aria-live="polite" aria-label="Current treasure clue">{trail.picture && <span aria-hidden="true">{trail.picture}</span>}{trail.clue}</p>
    <p>{trail.chestReady ? "Your pal is waiting by the chest. Tap it to open your treasure!" : "Tap an object in the room. Your pal will explore it with you."}</p>
    <button type="button" className={styles.trailHint} aria-expanded={showHint} onClick={() => setShowHint((visible) => !visible)}>{showHint ? "Hide hint" : "Show hint"}</button>
    {showHint && <p className={styles.trailHintText}>{trail.hint}</p>}
    <small>No rush and no penalties. Your clues save automatically.</small>
  </section>;
}
