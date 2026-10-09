"use client";

import { useEffect, useState } from "react";
import { treasureRoomObjects, type TreasureObjectId, type TreasureView } from "@/lib/pocket-pals-treasure";
import styles from "./pocket-pals.module.css";

export function PocketPalRoomObjects({ owned, trail, busy, onFind }: { owned: string[]; trail?: TreasureView; busy: boolean; onFind: (id: TreasureObjectId) => void }) {
  return <>{treasureRoomObjects(owned).filter((object) => !trail || trail.objectIds.includes(object.id)).map((object) => {
    const found = trail?.found.includes(object.id);
    const content = <><span className={"sprite" in object ? styles.trailPropSprite : styles.trailDecorEmoji} style={"sprite" in object ? { backgroundPosition: `${object.sprite * 50}% 50%` } : undefined}>{"sprite" in object ? null : object.emoji}</span>{found && <img className={styles.foundKey} src="/games/pocket-pals/treasure-key-v1.png" alt="Key found" draggable={false} />}</>;
    const position = { left: `${object.x}%`, top: `${object.y}%` };
    return trail ? <button key={object.id} type="button" className={`${styles.trailObject} ${found ? styles.trailFound : ""}`} style={position} aria-label={`Explore ${object.name}`} aria-pressed={!!found} disabled={busy || found || trail.chestReady} onClick={() => onFind(object.id)}>{content}</button>
      : <span key={object.id} className={styles.roomObject} style={position} aria-label={object.name}>{content}</span>;
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
