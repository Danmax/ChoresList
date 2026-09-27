"use client";

import { useState } from "react";
import { MemberAvatar } from "@/components/member-avatar";
import {
  ACCESSORIES, BACKGROUND_COLORS, DEFAULT_AVATAR_CONFIG, EYE_COLORS, EYE_STYLES,
  HAIR_COLORS, HAIR_STYLES, MOUTH_STYLES, NOSE_STYLES, SHIRT_COLORS, SKIN_TONES,
  randomAvatarConfig, type AvatarConfig,
} from "@/lib/avatar";

type Category = "skin" | "hair" | "eyes" | "face" | "extras" | "colors";
const CATEGORIES: { key: Category; label: string; icon: string }[] = [
  { key: "skin", label: "Skin", icon: "😊" }, { key: "hair", label: "Hair", icon: "💇" },
  { key: "eyes", label: "Eyes", icon: "👀" }, { key: "face", label: "Face", icon: "🙂" },
  { key: "extras", label: "Extras", icon: "👓" }, { key: "colors", label: "Colors", icon: "🎨" },
];

function ChoiceGrid<T extends string>({ items, selected, onSelect }: { items: readonly { value: T; label: string }[]; selected: T; onSelect: (value: T) => void }) {
  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{items.map((item) => <button key={item.value} type="button" onClick={() => onSelect(item.value)} className={`rounded-xl border-2 px-3 py-2 text-xs font-black transition-all ${selected === item.value ? "border-violet-500 bg-violet-100 text-violet-800" : "border-slate-100 bg-white text-slate-600 hover:border-violet-200"}`}>{item.label}</button>)}</div>;
}

function Swatches({ colors, selected, label, onSelect }: { colors: readonly string[]; selected: string; label: string; onSelect: (value: string) => void }) {
  return <div><p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">{label}</p><div className="flex flex-wrap gap-2">{colors.map((color) => <button key={color} type="button" aria-label={`${label} ${color}`} onClick={() => onSelect(color)} className={`h-10 w-10 rounded-full border-4 border-white shadow transition-transform ${selected === color ? "scale-110 ring-2 ring-violet-500 ring-offset-2" : "hover:scale-105"}`} style={{ backgroundColor: color }} />)}</div></div>;
}

export function AvatarBuilder({ value, name, onChange }: { value: AvatarConfig | null | undefined; name?: string; onChange: (value: AvatarConfig | null) => void }) {
  const [category, setCategory] = useState<Category>("skin");
  const config = value ?? DEFAULT_AVATAR_CONFIG;
  const update = <K extends keyof AvatarConfig>(key: K, next: AvatarConfig[K]) => onChange({ ...config, [key]: next });

  return (
    <div className="overflow-hidden rounded-3xl border-2 border-violet-100 bg-gradient-to-br from-white to-violet-50">
      <div className="grid gap-4 p-4 sm:grid-cols-[150px_1fr]">
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-3 shadow-sm">
          <MemberAvatar avatarConfig={config} name={name} className="h-32 w-32" />
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => onChange(randomAvatarConfig())} className="rounded-xl bg-violet-100 px-3 py-2 text-xs font-black text-violet-700">🎲 Surprise me</button>
            <button type="button" onClick={() => onChange(DEFAULT_AVATAR_CONFIG)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">Reset</button>
          </div>
        </div>
        <div className="min-w-0">
          <div className="mb-4 grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1 sm:grid-cols-6">
            {CATEGORIES.map((item) => <button key={item.key} type="button" onClick={() => setCategory(item.key)} className={`rounded-xl px-1 py-2 text-[11px] font-black ${category === item.key ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"}`}><span className="block text-lg">{item.icon}</span>{item.label}</button>)}
          </div>
          <div className="min-h-36 rounded-2xl bg-white p-3">
            {category === "skin" && <Swatches colors={SKIN_TONES} selected={config.skinTone} label="Skin tone" onSelect={(color) => update("skinTone", color)} />}
            {category === "hair" && <div className="space-y-4"><ChoiceGrid items={HAIR_STYLES} selected={config.hairStyle} onSelect={(next) => update("hairStyle", next)} /><Swatches colors={HAIR_COLORS} selected={config.hairColor} label="Hair color" onSelect={(color) => update("hairColor", color)} /></div>}
            {category === "eyes" && <div className="space-y-4"><ChoiceGrid items={EYE_STYLES} selected={config.eyeStyle} onSelect={(next) => update("eyeStyle", next)} /><Swatches colors={EYE_COLORS} selected={config.eyeColor} label="Eye color" onSelect={(color) => update("eyeColor", color)} /></div>}
            {category === "face" && <div className="space-y-4"><div><p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">Mouth</p><ChoiceGrid items={MOUTH_STYLES} selected={config.mouthStyle} onSelect={(next) => update("mouthStyle", next)} /></div><div><p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">Nose</p><ChoiceGrid items={NOSE_STYLES} selected={config.noseStyle} onSelect={(next) => update("noseStyle", next)} /></div></div>}
            {category === "extras" && <ChoiceGrid items={ACCESSORIES} selected={config.accessory} onSelect={(next) => update("accessory", next)} />}
            {category === "colors" && <div className="space-y-5"><Swatches colors={SHIRT_COLORS} selected={config.shirtColor} label="Shirt color" onSelect={(color) => update("shirtColor", color)} /><Swatches colors={BACKGROUND_COLORS} selected={config.backgroundColor} label="Background color" onSelect={(color) => update("backgroundColor", color)} /></div>}
          </div>
        </div>
      </div>
      <button type="button" onClick={() => onChange(null)} className="w-full border-t border-violet-100 bg-white px-4 py-2 text-xs font-bold text-slate-400 hover:text-violet-600">Use classic emoji instead</button>
    </div>
  );
}
