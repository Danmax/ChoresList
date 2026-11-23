"use client";

import { useEffect, useRef, useState } from "react";
import { Delete, Headphones, Phone, Plus, Settings2, Trash2, Volume2, X } from "lucide-react";
import { CONTACT_FACES, CONTACT_NUMBERS, FAMILY_STORIES, type FamilyStoryId, type PretendContact } from "@/lib/melody-pretend";
import type { MelodyAction, MelodyState } from "@/lib/melody-phone";
import type { MelodySoundSettings } from "@/lib/melody-sound";
import { familyAdventure } from "@/lib/melody-family-library";
import { TELEPHONE_LEVELS, type TelephoneDifficulty } from "@/lib/melody-telephone";
import styles from "./melody-phone.module.css";

export function MelodyFamilyActivity({ state, contacts, onChange, act }: {
  state: MelodyState; contacts: PretendContact[]; onChange: (contacts: PretendContact[]) => void;
  act: (action: MelodyAction) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [showAll, setShowAll] = useState(true);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🧸");
  const [story, setStory] = useState<FamilyStoryId>("camp");
  const contact = contacts.find(contact => contact.id === state.familyContactId);
  const compact = Boolean(contact && !showAll && !editing);
  const adventure = familyAdventure(state.familyStory, state.familyAdventure);

  function update(contacts: PretendContact[]) {
    onChange(contacts.map((contact, index) => ({ ...contact, number: CONTACT_NUMBERS[index] })));
  }

  if (state.familyConnected) return <div className={styles.familyStory}>
    <div className={styles.familyPortrait} aria-hidden="true">{contact?.emoji ?? "🧸"}<span>{adventure.emoji}</span></div>
    <span className={styles.storyTitle}>{adventure.title}</span>
    <div className={styles.storyChoices}>{adventure.nodes[state.familyStep].choices.map(choice => <button type="button" key={choice.next} onClick={() => act({ type: "family-choice", next: choice.next })}>{choice.label}</button>)}</div>
    {state.phase !== "celebrating" && <p className={styles.activityHint}>Talk out loud, then choose what happens next.</p>}
  </div>;

  return <div className={styles.phoneBook}>
    <div className={`${styles.contactGrid} ${compact ? styles.compactContact : ""}`}>{contacts.filter(item => !compact || item.id === contact?.id).map(contact => <button type="button" key={contact.id} className={styles.contactCard} aria-label={`Choose ${contact.name}, number ${contact.number.join(" ")}`} aria-pressed={state.familyContactId === contact.id} onClick={() => { setShowAll(false); act({ type: "select-contact", contact }); }}>
      <span aria-hidden="true">{contact.emoji}</span><strong>{contact.name}</strong><small>{FAMILY_STORIES[contact.story].title}</small><b>{contact.number.join(" · ")}</b>
    </button>)}</div>
    {compact && <button type="button" className={styles.someoneElse} onClick={() => setShowAll(true)}>Choose someone else</button>}
    <div className={styles.dialStrip} role="group" aria-label="Your pretend number">
      <span aria-live="polite">{[0, 1, 2].map(index => <b key={index}>{state.familyDigits[index] ?? "·"}</b>)}</span>
      <button type="button" aria-label="Erase last number" disabled={!state.familyDigits.length} onClick={() => act({ type: "erase" })}><Delete size={22} /></button>
      <button type="button" aria-label="Call pretend family" onClick={() => act({ type: "dial-family", contact: contacts.find(contact => contact.number.join("") === state.familyDigits.join("")) })}><Phone size={21} /></button>
    </div>
    <button type="button" className={styles.editFamily} aria-expanded={editing} onClick={() => setEditing(value => !value)}><Settings2 size={15} /> Make your pretend family</button>
    {editing && <div className={styles.familyEditor}>
      <p>Give your make-believe family names, faces, and adventures. Saved on this device.</p>
      {contacts.map(contact => <div className={styles.editContact} key={contact.id}>
        <select aria-label={`Face for ${contact.id}`} value={contact.emoji} onChange={event => update(contacts.map(item => item.id === contact.id ? { ...item, emoji: event.target.value } : item))}>{CONTACT_FACES.map(face => <option key={face}>{face}</option>)}</select>
        <input aria-label={`Name for ${contact.id}`} maxLength={24} value={contact.name} onChange={event => update(contacts.map(item => item.id === contact.id ? { ...item, name: event.target.value } : item))} />
        <select aria-label={`Adventure for ${contact.id}`} value={contact.story} onChange={event => update(contacts.map(item => item.id === contact.id ? { ...item, story: event.target.value as FamilyStoryId } : item))}>{Object.entries(FAMILY_STORIES).map(([key, story]) => <option key={key} value={key}>{story.emoji} {story.title}</option>)}</select>
        <button type="button" aria-label={`Remove ${contact.name}`} disabled={contacts.length === 1} onClick={() => update(contacts.filter(item => item.id !== contact.id))}><Trash2 size={17} /></button>
      </div>)}
      {contacts.length < 6 && <form className={styles.addContact} onSubmit={event => {
        event.preventDefault();
        if (!name.trim()) return;
        update([...contacts, { id: crypto.randomUUID(), name: name.trim(), emoji, story, number: CONTACT_NUMBERS[contacts.length] }]);
        setName("");
      }}><label>New pretend person<input placeholder="Auntie, cousin, teddy…" aria-label="New pretend person's name" maxLength={24} value={name} onChange={event => setName(event.target.value)} required /></label><div>
        <select aria-label="New person's face" value={emoji} onChange={event => setEmoji(event.target.value)}>{CONTACT_FACES.map(face => <option key={face}>{face}</option>)}</select>
        <select aria-label="New person's adventure" value={story} onChange={event => setStory(event.target.value as FamilyStoryId)}>{Object.entries(FAMILY_STORIES).map(([key, story]) => <option key={key} value={key}>{story.emoji} {story.title}</option>)}</select>
        <button type="submit"><Plus size={17} /> Add</button></div></form>}
    </div>}
  </div>;
}

export function MelodyTelephoneActivity({ state, act }: { state: MelodyState; act: (action: MelodyAction) => void }) {
  const level = TELEPHONE_LEVELS[state.telephoneDifficulty];
  return <div className={styles.telephoneActivity}>
    <label className={styles.levelPicker}>Play level<select aria-label="Telephone difficulty" value={state.telephoneDifficulty} disabled={state.phase === "listening"} onChange={event => act({ type: "difficulty", difficulty: event.target.value as TelephoneDifficulty })}>
      {Object.entries(TELEPHONE_LEVELS).map(([id, level]) => <option value={id} key={id}>{level.label} · {level.ages}</option>)}
    </select></label>
    <p className={styles.levelDescription}>{level.description}</p>
    {level.reverse && <span className={styles.reverseBadge}>Backwards mission · start with the last digit</span>}
    <div className={styles.secretDigits} role="group" aria-label={`${state.sequence.length} secret numbers`}>
      {state.sequence.map((_, index) => <span key={index} className={state.echoed.length > index ? styles.secretFilled : ""}>{state.echoed[index] ?? (state.phase === "listening" ? "♪" : "?")}</span>)}
    </div>
    {state.phase !== "celebrating" && <button type="button" className={styles.primaryButton} disabled={state.phase === "listening"} onClick={() => act({ type: "listen" })}><Headphones size={19} />{state.phase === "listening" ? "Melody is playing…" : state.sequenceHeard || state.hint ? "Hear the number again" : "Hear the secret number"}</button>}
    <p className={styles.telephoneTip}>{state.phase === "celebrating" ? "A lovely little number, passed from Melody to you." : state.phase === "listening" ? "Watch the buttons light up and listen closely." : state.sequenceHeard ? level.reverse ? "Start with the last number you heard, then work backwards." : "Your turn! Use the phone buttons below." : `Start with ${level.min} digits. Longer codes as you play!`}</p>
  </div>;
}

export function MelodySoundDialog({ open, onClose, settings, onChange, voices, onPreview, onRing, muted, fallback }: {
  open: boolean; onClose: () => void; settings: MelodySoundSettings;
  onChange: (settings: MelodySoundSettings) => void; voices: SpeechSynthesisVoice[];
  onPreview: () => void; onRing: () => void; muted: boolean; fallback: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current?.close();
  }, [open]);
  const change = (patch: Partial<MelodySoundSettings>) => onChange({ ...settings, ...patch });
  return <dialog ref={dialog} onClose={onClose} className={styles.soundDialog} aria-labelledby="melody-sound-title">
    <div className={styles.settingsHeading}><h2 id="melody-sound-title">Voices & happy sounds</h2><button type="button" aria-label="Close sound settings" onClick={onClose}><X size={22} /></button></div>
    <p>Choose the hello that makes you smile.</p>
    <label>Story voice<select value={settings.voice} onChange={event => change({ voice: event.target.value as MelodySoundSettings["voice"] })}>
      <option value="warm">Melody — bright & warm</option><option value="story">Storytime — soft & calm</option><option value="device">A voice from this device</option>
    </select></label>
    {settings.voice === "device" && <label>Device voice<select value={settings.deviceVoice} onChange={event => change({ deviceVoice: event.target.value })}><option value="">Best available English voice</option>{voices.map(voice => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} ({voice.lang})</option>)}</select></label>}
    <div className={styles.settingsPair}><label>Speaking pace<select value={settings.speed} onChange={event => change({ speed: Number(event.target.value) })}><option value="0.85">A little slower</option><option value="1">Just right</option><option value="1.1">A little quicker</option></select></label><button type="button" disabled={muted} onClick={onPreview}><Volume2 size={17} /> Try this voice</button></div>
    <div className={styles.settingsPair}><label>Ringtone<select value={settings.ringtone} onChange={event => change({ ringtone: event.target.value as MelodySoundSettings["ringtone"] })}><option value="classic">Classic ring-ring</option><option value="bouncy">Bouncy hello</option><option value="sparkle">Twinkly stars</option></select></label><button type="button" disabled={muted} onClick={onRing}><Phone size={17} /> Hear the ring</button></div>
    <label>Number buttons<select value={settings.keypad} onChange={event => change({ keypad: event.target.value as MelodySoundSettings["keypad"] })}><option value="telephone">Telephone dial tones</option><option value="musical">Musical notes</option></select></label>
    <label>Volume<input type="range" min="0" max="1" step="0.05" value={settings.volume} onChange={event => change({ volume: Number(event.target.value) })} /></label>
    {muted && <p>Turn sound on to hear the previews.</p>}
    {fallback && <p role="status">Using your device voice while a story clip is unavailable.</p>}
    <p className={styles.voiceDisclosure}>Melody and Storytime are AI-generated character voices. Settings are saved on this device.</p>
    <button type="button" className={styles.primaryButton} onClick={onClose}>Done</button>
  </dialog>;
}
