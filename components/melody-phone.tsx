"use client";

import { useCallback, useEffect, useReducer, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { Check, Headphones, Heart, Home, Moon, Music2, Phone, PhoneIncoming, PhoneOff, Play, RotateCcw, Settings2, Sparkles, Star, Users, Volume2, VolumeX } from "lucide-react";
import { createMelodyState, melodyReducer, NUMBER_NAMES, readMelodyProgress, type MelodyAction, type MelodyMode } from "@/lib/melody-phone";
import { useMelodyAudio } from "./melody-phone-audio";
import { MelodyFamilyActivity, MelodySoundDialog, MelodyTelephoneActivity } from "./melody-phone-activities";
import { DEFAULT_PRETEND_CONTACTS, MELODY_LINES, readPretendContacts, type PretendContact } from "@/lib/melody-pretend";
import { DEFAULT_MELODY_SOUND, readMelodySound, type MelodySoundSettings } from "@/lib/melody-sound";
import { MelodyDiscoveryPicker, MelodyObjectIcon } from "./melody-discovery";
import { TELEPHONE_LEVELS, telephoneDifficultyForAge } from "@/lib/melody-telephone";
import styles from "./melody-phone.module.css";

const MODES = [
  { key: "explore", title: "Just play", subtitle: "Tap & discover", icon: Music2 },
  { key: "find", title: "Find a number", subtitle: "Look & listen", icon: Sparkles },
  { key: "count", title: "Let's count", subtitle: "Count together", icon: Star },
  { key: "family", title: "My family", subtitle: "Make-believe calls", icon: Users },
  { key: "telephone", title: "Phone game", subtitle: "Listen & dial back", icon: Headphones },
] as const;

// Viewports into the supplied sprite sheet preserve the original expressions.
const FACES = {
  happy: "131 84 148 88", delighted: "531 85 148 88", excited: "928 85 148 88",
  thinking: "131 946 148 85", ringing: "531 947 148 85", sleepy: "928 947 148 85",
};
const KEY_COLORS = ["purple", "orange", "gold", "purple", "gold", "purple", "orange", "purple", "orange", "gold"] as const;

type MelodyPhoneProps = {
  playerId?: string;
  age?: number;
  onExit?: () => void;
  onFinish?: (score: number, duration: number, metadata: Record<string, unknown>) => Promise<void>;
};

export function MelodyPhone({ playerId, age, onExit, onFinish }: MelodyPhoneProps) {
  const [state, dispatch] = useReducer(melodyReducer, { telephoneDifficulty: telephoneDifficultyForAge(age) }, createMelodyState);
  const [muted, setMuted] = useState(false);
  const [visible, setVisible] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [pressed, setPressed] = useState<number | null>(null);
  const [settings, setSettings] = useState(DEFAULT_MELODY_SOUND);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [progressReady, setProgressReady] = useState(false);
  const [contacts, setContacts] = useState(DEFAULT_PRETEND_CONTACTS);
  const audio = useMelodyAudio(muted, settings);
  const startedAt = useRef<number | null>(null);
  const lastSpoken = useRef(0);
  const savingRef = useRef(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressLoaded = useRef(false);
  const progressKey = `melody-play:v2:${playerId ?? "guest"}`;
  const onCall = state.returnMode !== null || state.familyConnected || state.phase === "dialing";
  const welcome = state.phase === "welcome";
  const sleeping = state.phase === "sleeping";
  const ringing = state.phase === "ringing";
  const dialing = state.phase === "dialing";
  const listening = state.phase === "listening";
  const activeContact = contacts.find(contact => contact.id === state.familyContactId);
  const celebrating = state.phase === "celebrating";
  const question = state.question;
  const face = sleeping ? "sleepy" : ringing || onCall ? "ringing" : celebrating ? "excited" : state.hint ? "thinking" : state.selected !== null ? "delighted" : "happy";
  const quantity = state.mode === "explore" ? state.selected : question?.target ?? null;
  const object = state.mode === "explore" ? state.exploreObject ?? undefined : question?.object;

  const act = useCallback((action: MelodyAction) => {
    audio.activate();
    if (action.type === "hang-up") audio.effect("hangup");
    if (action.type === "call" || action.type === "connect-family") audio.effect("connect");
    if (action.type === "count-object") audio.effect("pop");
    if (action.type === "family-choice") audio.effect("sparkle");
    startedAt.current ??= Date.now();
    dispatch(action);
  }, [audio.activate, audio.effect]);

  useEffect(() => {
    try { setSettings(readMelodySound(JSON.parse(localStorage.getItem("melody-sound:v1") ?? "null"))); } catch { /* Keep defaults. */ }
    try { setContacts(readPretendContacts(JSON.parse(localStorage.getItem("melody-family:v1") ?? "null"))); } catch { /* Keep defaults. */ }
  }, []);

  useEffect(() => {
    if (progressLoaded.current) return;
    progressLoaded.current = true;
    try {
      const saved = readMelodyProgress(JSON.parse(localStorage.getItem(progressKey) ?? "null"), telephoneDifficultyForAge(age));
      dispatch({ type: "restore", progress: saved });
    } catch { /* A fresh discovery library remains available. */ }
    setProgressReady(true);
  }, [progressKey, age]);

  useEffect(() => {
    if (!progressReady) return;
    try {
      localStorage.setItem(progressKey, JSON.stringify({
        contentTurn: state.contentTurn, lastObjectId: state.lastObjectId, topic: state.topic,
        lineCursors: state.lineCursors, familyVisits: state.familyVisits, sessionSeed: state.sessionSeed + 1,
        telephoneDifficulty: state.telephoneDifficulty, telephoneRound: state.telephoneRound,
      }));
    } catch { /* In-memory rotation also works without device storage. */ }
  }, [progressKey, progressReady, state.contentTurn, state.lastObjectId, state.topic, state.lineCursors, state.familyVisits, state.sessionSeed, state.telephoneDifficulty, state.telephoneRound]);

  function updateSettings(next: MelodySoundSettings) {
    setSettings(next);
    try { localStorage.setItem("melody-sound:v1", JSON.stringify(next)); } catch { /* Private browsing. */ }
  }

  function updateContacts(next: PretendContact[]) {
    setContacts(next);
    try { localStorage.setItem("melody-family:v1", JSON.stringify(next)); } catch { /* Private browsing. */ }
  }

  function phoneCall() {
    if (onCall) act({ type: "hang-up" });
    else if (state.mode === "telephone") act({ type: "listen" });
    else if (state.mode === "family" && !ringing) act({ type: "dial-family", contact: contacts.find(contact => contact.number.join("") === state.familyDigits.join("")) });
    else act({ type: "call" });
  }

  const pressNumber = useCallback((number: number) => {
    if (["sleeping", "ringing", "dialing", "listening", "celebrating"].includes(state.phase) || state.familyConnected || settingsOpen) return;
    audio.tone(number);
    setPressed(number);
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => setPressed(null), 180);
    act({ type: "number", number });
  }, [act, audio.tone, state.phase, state.familyConnected, settingsOpen]);

  useEffect(() => {
    if (state.revision === lastSpoken.current || !visible || settingsOpen) return;
    lastSpoken.current = state.revision;
    if (state.phase === "celebrating") audio.tone(0, true);
    audio.speak(state.message);
  }, [state.revision, state.message, state.phase, visible, settingsOpen, audio.speak, audio.tone]);

  useEffect(() => {
    const visibility = () => {
      setVisible(!document.hidden);
      if (document.hidden) audio.stop();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, [audio.stop]);

  useEffect(() => {
    // A surprise call happens only during quiet free play, never mid-question.
    if (!visible || settingsOpen || state.phase !== "playing" || state.mode !== "explore" || onCall) return;
    const timer = setTimeout(() => dispatch({ type: "incoming" }), 45_000);
    return () => clearTimeout(timer);
  }, [visible, settingsOpen, state.phase, state.mode, state.revision, onCall]);

  useEffect(() => {
    if (!ringing || !visible || muted || settingsOpen) return;
    let rings = 0;
    let stopRing = () => {};
    const ring = () => { stopRing(); stopRing = audio.effect(`ring-${settings.ringtone}`); rings++; };
    ring();
    const timer = setInterval(() => { if (rings < 3) ring(); else clearInterval(timer); }, 3000);
    return () => { clearInterval(timer); stopRing(); };
  }, [ringing, visible, muted, settingsOpen, settings.ringtone, audio.effect]);

  useEffect(() => {
    if (!dialing || !visible || settingsOpen) return;
    const stopRing = audio.effect("outgoing");
    const timer = setTimeout(() => act({ type: "connect-family" }), 1500);
    return () => { clearTimeout(timer); stopRing(); };
  }, [dialing, visible, settingsOpen, audio.effect, act]);

  useEffect(() => {
    if (!listening || !visible || settingsOpen) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const introduction = Math.ceil(Math.max(2000, state.message.split(/\s+/).length * 550) / settings.speed);
    const interval = Math.ceil(TELEPHONE_LEVELS[state.telephoneDifficulty].interval / settings.speed);
    state.sequence.forEach((number, index) => {
      timers.push(setTimeout(() => {
        setPressed(number); audio.tone(number); audio.speak(`${NUMBER_NAMES[number]}!`);
      }, introduction + index * interval));
      timers.push(setTimeout(() => setPressed(null), introduction + 1000 + index * interval));
    });
    timers.push(setTimeout(() => dispatch({ type: "sequence-ready" }), introduction + state.sequence.length * interval));
    return () => { timers.forEach(clearTimeout); setPressed(null); audio.stopSpeech(); };
  }, [listening, visible, settingsOpen, state.message, state.sequence, state.telephoneDifficulty, settings.speed, audio.speak, audio.tone, audio.stopSpeech]);

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (!visible || event.repeat || event.ctrlKey || event.metaKey || event.altKey || !/^\d$/.test(event.key)) return;
      if (event.target instanceof HTMLElement && (event.target.matches("input, textarea, select") || event.target.isContentEditable)) return;
      event.preventDefault();
      pressNumber(Number(event.key));
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [pressNumber, visible]);

  useEffect(() => () => { if (pressTimer.current) clearTimeout(pressTimer.current); }, []);

  async function exit() {
    if (savingRef.current) return;
    audio.stop();
    if (!onFinish || startedAt.current === null) { onExit?.(); return; }
    savingRef.current = true;
    setSaving(true);
    setSaveError("");
    try {
      await onFinish(state.completed, Math.round((Date.now() - startedAt.current) / 1000), {
        numbersDiscovered: state.discoveries, activitiesCompleted: state.completed,
        pretendCalls: state.calls, mode: state.mode, telephoneDifficulty: state.telephoneDifficulty,
      });
    } catch {
      setSaveError("We couldn't save this playtime. You can try again or leave.");
    } finally { savingRef.current = false; setSaving(false); }
  }

  function replay() {
    audio.activate();
    audio.speak(state.message);
  }

  function changeMode(mode: MelodyMode) { act({ type: "mode", mode }); }

  return (
    <section className={styles.game} aria-label="Melody's Play Phone" data-melody-phase={state.phase} data-melody-mode={state.mode}>
      <div className={styles.scenery} aria-hidden="true"><span className={styles.cloudOne} /><span className={styles.cloudTwo} /><span className={styles.hillOne} /><span className={styles.hillTwo} /><span className={styles.hillThree} /></div>
      <header className={styles.header}>
        <div className={styles.brand}><span className={styles.brandIcon}><Phone size={23} fill="currentColor" /></span><div><span className={styles.brandName}>Melody’s <span>play phone</span></span><span className={styles.brandCaption}>Little numbers. Big discoveries.</span></div></div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.iconButton} aria-label={muted ? "Turn sound on" : "Mute sound"} aria-pressed={muted} onClick={() => setMuted(value => !value)}>{muted ? <VolumeX size={21} /> : <Volume2 size={21} />}</button>
          <button type="button" className={styles.iconButton} aria-label="Voice and sound settings" onClick={() => { audio.stop(); setSettingsOpen(true); }}><Settings2 size={21} /></button>
          {onExit ? <button type="button" className={styles.iconButton} aria-label="Exit" disabled={saving} onClick={() => void exit()}><Home size={21} /></button> : <Link href="/" className={styles.iconButton} aria-label="Back to home"><Home size={21} /></Link>}
        </div>
      </header>

      <div className={styles.introduction}><span className={styles.eyebrow}><span /> A LITTLE PLAYTIME WITH MELODY</span><h1>{sleeping ? "Sweet dreams, little explorer." : "A happy hello starts here."}</h1><p>{sleeping ? "Every little discovery is something to smile about." : "Tap a number, make a little music, and learn together."}</p></div>

      <div className={styles.playArea}>
        <div className={styles.phoneStage}>
          <span className={styles.floatingStar} aria-hidden="true">✦</span><span className={styles.floatingNote} aria-hidden="true">♪</span>
          <div className={`${styles.phone} ${ringing ? styles.phoneRinging : ""} ${celebrating ? styles.phoneHappy : ""}`}>
            <div className={styles.antennae} aria-hidden="true"><i /><i /></div>
            <div className={styles.phoneBody}>
              <div className={styles.faceFrame}>
                <svg className={styles.face} viewBox={FACES[face]} preserveAspectRatio="none" role="img" aria-label={`Melody is ${face}`}><image href="/games/melody/expressions.webp" width="1217" height="1293" /></svg>
                {celebrating && <div className={styles.faceSparkles} aria-hidden="true">✦<span>✧</span>✦</div>}
              </div>
              <div className={styles.phoneName} aria-hidden="true">m e l o d y <Heart size={10} fill="currentColor" /></div>
              <div className={styles.callRow}><span aria-hidden="true">✧</span><button type="button" className={`${styles.callButton} ${onCall ? styles.hangUp : ""}`} disabled={sleeping || celebrating || listening} aria-label={onCall ? "Hang up" : state.mode === "family" ? ringing ? "Answer family call" : "Call pretend family" : state.mode === "telephone" ? "Play telephone number" : ringing ? "Answer Melody" : "Call Melody"} onClick={phoneCall}>{onCall ? <PhoneOff size={31} fill="currentColor" /> : <Phone size={31} fill="currentColor" />}</button><span aria-hidden="true">✧</span></div>
              <div className={styles.keypad} role="group" aria-label="Phone number buttons">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(number => <button key={number} type="button" aria-label={`Number ${number}`} disabled={sleeping || ringing || celebrating || dialing || listening || state.familyConnected} onClick={() => pressNumber(number)} className={`${styles.numberKey} ${styles[KEY_COLORS[number]]} ${number === 0 ? styles.zeroKey : ""} ${pressed === number ? styles.keyPressed : ""} ${state.hint && question?.target === number ? styles.keyHint : ""}`}><span>{number}</span></button>)}
              </div>
              <div className={styles.speaker} aria-hidden="true"><i /><i /><i /></div>
            </div>
          </div>
          <div className={styles.phoneShadow} aria-hidden="true" />
          <p className={styles.phoneHint}><Heart size={14} fill="currentColor" /> Made for little hands & curious minds</p>
          <div className={styles.funSounds} role="group" aria-label="Silly sounds">{[{ sound: "pop", label: "Bubble pop", emoji: "🫧" }, { sound: "boing", label: "Silly boing", emoji: "🌀" }, { sound: "sparkle", label: "Magic sparkle", emoji: "✨" }].map(sound => <button type="button" key={sound.sound} aria-label={sound.label} disabled={muted || sleeping || listening} onClick={() => { audio.activate(); audio.effect(sound.sound); }}><span aria-hidden="true">{sound.emoji}</span>{sound.label}</button>)}</div>
        </div>

        <div className={styles.activitySide}>
          <nav className={styles.modes} aria-label="Choose how to play">{MODES.map(({ key, title, subtitle, icon: Icon }) => <button key={key} type="button" aria-pressed={state.mode === key && (!onCall || key === "family")} disabled={sleeping || saving} onClick={() => changeMode(key)}><Icon size={23} /><strong>{title}</strong><span>{subtitle}</span></button>)}</nav>

          <div className={`${styles.activityCard} ${celebrating ? styles.celebrationCard : ""}`}>
            <div className={styles.cardTop}><span className={styles.cardTag}>{sleeping ? <Moon size={15} /> : onCall || ringing ? <PhoneIncoming size={15} /> : <Sparkles size={15} />}{sleeping ? "REST & RECHARGE" : ringing ? "A LITTLE SURPRISE" : onCall ? "ON A PRETEND CALL" : welcome ? "MEET YOUR NEW FRIEND" : state.mode === "explore" ? "A LITTLE DISCOVERY" : "LET'S PLAY TOGETHER"}</span><button type="button" className={styles.replay} aria-label="Hear Melody again" disabled={muted} onClick={replay}><Volume2 size={19} /></button></div>

            <div className={styles.activityContent}>
              <h2>{sleeping ? "That was lovely!" : dialing ? `Calling ${activeContact?.name ?? "family"}…` : ringing ? "Ring, ring!" : welcome ? "Hello, I’m Melody!" : state.mode === "family" ? state.familyConnected ? `Hello, ${activeContact?.name ?? "family"}!` : "My pretend family" : state.mode === "telephone" ? celebrating ? "You passed it!" : "The telephone game" : celebrating ? "You found it!" : state.mode === "find" ? "Can you find…" : state.mode === "count" ? `How many ${question?.object.plural}?` : state.selected === null ? "Let’s make some music." : `${NUMBER_NAMES[state.selected][0].toUpperCase()}${NUMBER_NAMES[state.selected].slice(1)}!`}</h2>
              <p className={styles.message} role="status" aria-live="polite" aria-atomic="true">{state.message}</p>

              {welcome ? <><div className={styles.welcomeArt} aria-hidden="true"><span>1</span><Star fill="currentColor" size={42} /><span>2</span><Heart fill="currentColor" size={32} /><span>3</span></div><button type="button" className={styles.primaryButton} onClick={() => act({ type: "start" })}><Play size={19} fill="currentColor" /> Let’s play</button><p className={styles.smallNote}>Or tap any number to say hello.</p></>
                : sleeping ? <><div className={styles.sleepArt} aria-hidden="true">☾<span>✦</span></div><button type="button" className={styles.primaryButton} onClick={() => act({ type: "wake" })}><RotateCcw size={18} /> Play again</button>{onExit ? <button type="button" className={styles.textButton} disabled={saving} onClick={() => void exit()}>{saving ? "Saving playtime…" : "Back to games"}</button> : <Link href="/" className={styles.textButton}>Back to home</Link>}</>
                  : ringing || dialing ? <><div className={styles.ringingArt} aria-hidden="true">{state.mode === "family" ? <span className={styles.callerFace}>{activeContact?.emoji ?? "🧸"}</span> : <PhoneIncoming size={56} />}<span>{dialing ? "Waiting for a pretend hello…" : `${state.mode === "family" ? activeContact?.name ?? "Family" : "Melody"} is calling…`}</span></div><button type="button" className={styles.primaryButton} onClick={() => act({ type: dialing ? "hang-up" : "call" })}><Phone size={19} />{dialing ? "Cancel call" : state.mode === "family" ? "Answer family call" : "Answer Melody"}</button>{!dialing && <button type="button" className={styles.textButton} onClick={() => act({ type: "dismiss" })}>Not now</button>}</>
                    : <>
                      {(state.mode === "explore" || state.mode === "count") && !onCall && <MelodyDiscoveryPicker topic={state.topic} disabled={state.phase !== "playing"} onChange={topic => act({ type: "topic", topic })} />}
                      {state.mode === "family" ? <MelodyFamilyActivity state={state} contacts={contacts} onChange={updateContacts} act={act} />
                        : state.mode === "telephone" ? <MelodyTelephoneActivity state={state} act={act} />
                        : state.mode === "find" && question ? <div className={`${styles.targetNumber} ${celebrating ? styles.targetFound : ""}`} aria-label={`Find number ${question.target}`}>{question.target}{celebrating && <span><Check size={23} strokeWidth={4} /></span>}</div>
                        : quantity === null ? <div className={styles.idleArt} aria-hidden="true"><Music2 size={34} /><span>1 2 3</span><Music2 size={25} /></div>
                          : <div className={styles.objects} role="group" aria-label={`${quantity} ${quantity === 1 ? object?.singular : object?.plural}${state.mode === "count" ? " to count" : ""}`}>
                            {quantity === 0 ? <div className={styles.emptyBasket}><span aria-hidden="true">◯</span><strong>None. That’s zero!</strong></div> : Array.from({ length: quantity }, (_, index) => state.mode === "count" ? <button key={index} type="button" className={`${styles.countObject} ${state.counted.includes(index) ? styles.counted : ""}`} aria-label={`Count ${object?.singular} ${index + 1}`} aria-pressed={state.counted.includes(index)} disabled={celebrating} onClick={() => act({ type: "count-object", index })} style={{ "--object-index": index } as CSSProperties}><MelodyObjectIcon object={object} />{state.counted.includes(index) && <b>{state.counted.indexOf(index) + 1}</b>}</button> : <span className={styles.exploreObject} aria-hidden="true" key={index} style={{ "--object-index": index } as CSSProperties}><MelodyObjectIcon object={object} /></span>)}
                          </div>}
                      {celebrating ? <button type="button" className={styles.primaryButton} onClick={() => act({ type: "next" })}>{onCall ? <PhoneOff size={18} /> : <Sparkles size={18} />}{onCall ? "Say goodbye" : "Another number"}</button> : !["family", "telephone"].includes(state.mode) && <p className={styles.activityHint}>{state.mode === "count" ? "Count the pictures, then tap a number on the phone." : state.mode === "find" ? "Tap the matching button on Melody’s phone." : "Every button has a little something to discover."}</p>}
                    </>}
              {saveError && <p role="alert" className={styles.saveError}>{saveError} <button type="button" onClick={onExit}>Leave game</button></p>}
            </div>
          </div>

          <div className={styles.belowCard}>
            <span><span className={styles.littleHeart}><Heart size={18} fill="currentColor" /></span>{state.discoveries.length === 0 ? "A little wonder in every number." : `${state.discoveries.length} ${state.discoveries.length === 1 ? "number" : "numbers"} discovered together`}</span>
            {!sleeping && <button type="button" onClick={() => act({ type: "sleep" })}><Moon size={16} /> All done</button>}
          </div>
          {!sleeping && !ringing && state.mode !== "telephone" && <button type="button" className={styles.callInvite} onClick={() => act(onCall ? { type: "hang-up" } : state.mode === "family" ? { type: "incoming-family", contact: activeContact ?? contacts[0] } : { type: "incoming", requested: true })} disabled={celebrating}><span className={styles.callInviteIcon}>{onCall ? <PhoneOff size={21} /> : <PhoneIncoming size={21} />}</span><span><strong>{onCall ? "Say goodbye" : state.mode === "family" ? `Have ${activeContact?.name ?? contacts[0].name} call me` : "A little ring, a little adventure"}</strong><span>{onCall ? "You can finish your call whenever you like." : state.mode === "family" ? "A happy hello from your pretend family." : "Have Melody call you for a counting game."}</span></span><span className={styles.inviteSparkle} aria-hidden="true">✦</span></button>}
        </div>
      </div>
      <footer className={styles.footer}><span>Made of music, numbers & a little make-believe. Character voices are AI-generated.</span><span><Heart size={12} fill="currentColor" /> Play at your own pace</span></footer>
      <MelodySoundDialog open={settingsOpen} onClose={() => { audio.stop(); setSettingsOpen(false); }} settings={settings} onChange={updateSettings} voices={audio.voices} muted={muted} fallback={audio.voiceFallback} onPreview={() => { audio.activate(); audio.speak(MELODY_LINES.preview); }} onRing={() => { audio.stop(); audio.effect(`ring-${settings.ringtone}`); }} />
    </section>
  );
}
