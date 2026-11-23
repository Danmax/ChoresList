"use client";

import { DISCOVERY_TOPICS, type DiscoveryFilter, type DiscoveryObject } from "@/lib/melody-content";
import styles from "./melody-phone.module.css";

export function MelodyDiscoveryPicker({ topic, onChange, disabled }: { topic: DiscoveryFilter; onChange: (topic: DiscoveryFilter) => void; disabled: boolean }) {
  return <label className={styles.discoveryPicker}>Play with
    <select aria-label="Discovery collection" value={topic} disabled={disabled} onChange={event => onChange(event.target.value as DiscoveryFilter)}>
      <option value="all">✨ Surprise me — everything!</option>
      {DISCOVERY_TOPICS.map(topic => <option value={topic.id} key={topic.id}>{topic.emoji} {topic.label}</option>)}
    </select>
  </label>;
}

export function MelodyObjectIcon({ object }: { object?: DiscoveryObject }) {
  if (!object?.shape) return <span aria-hidden="true">{object?.emoji}</span>;
  return <svg aria-hidden="true" viewBox="0 0 48 48" className={styles.discoveryShape} fill={object.color}>
    {object.shape === "circle" ? <circle cx="24" cy="24" r="19" />
      : object.shape === "square" ? <rect x="5" y="5" width="38" height="38" rx="3" />
        : object.shape === "triangle" ? <path d="M24 4 46 43H2Z" />
          : object.shape === "diamond" ? <path d="m24 2 22 22-22 22L2 24Z" />
            : <path d="M24 2C19 12 7 22 7 30a17 17 0 0 0 34 0C41 22 29 12 24 2Z" />}
    <path d="M14 18c1-3 3-5 6-6" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" opacity=".65" />
  </svg>;
}
