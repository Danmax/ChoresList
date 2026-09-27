"use client";

import { useEffect, useState } from "react";
import { Camera, Check, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";

const STYLES = [
  { value: "family-animation", label: "3D Family Animation", icon: "✨" },
  { value: "anime", label: "Anime", icon: "🌸" },
  { value: "cartoon", label: "Soft Cartoon", icon: "😊" },
  { value: "storybook", label: "Storybook", icon: "📖" },
  { value: "comic", label: "Comic Hero", icon: "⚡" },
];

async function croppedFile(file: File, zoom: number) {
  const image = new Image();
  const url = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Could not read photo")); image.src = url; });
    const side = Math.min(image.naturalWidth, image.naturalHeight) / zoom;
    const canvas = document.createElement("canvas");
    canvas.width = 1024; canvas.height = 1024;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Photo cropping is unavailable");
    context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, 1024, 1024);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) throw new Error("Could not crop photo");
    return new File([blob], "avatar-photo.jpg", { type: "image/jpeg" });
  } finally { URL.revokeObjectURL(url); }
}

export function PhotoAvatarGenerator({ value, name, onChange }: { value?: string | null; name?: string; onChange: (url: string | null) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [style, setStyle] = useState("family-animation");
  const [zoom, setZoom] = useState(1);
  const [consent, setConsent] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [choices, setChoices] = useState<string[]>([]);

  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function generate() {
    if (!file) return toast.error("Choose a clear photo first");
    if (!consent) return toast.error("Confirm parent consent first");
    setGenerating(true);
    try {
      const prepared = await croppedFile(file, zoom);
      const body = new FormData(); body.set("file", prepared); body.set("style", style); body.set("consent", "true");
      const response = await fetch("/api/members/avatar", { method: "POST", body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Could not generate avatars");
      setChoices(Array.isArray(data.avatars) ? data.avatars : []);
      toast.success("Your avatar choices are ready!");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not generate avatars"); }
    finally { setGenerating(false); }
  }

  return <div className="space-y-4 rounded-3xl border-2 border-violet-100 bg-violet-50/50 p-4">
    <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
      <div>
        <label className="group relative block aspect-square cursor-pointer overflow-hidden rounded-3xl border-4 border-dashed border-violet-200 bg-white">
          {preview ? <img src={preview} alt="Photo crop preview" className="h-full w-full object-cover" style={{ transform: `scale(${zoom})` }} /> : <span className="flex h-full flex-col items-center justify-center gap-2 text-center text-violet-500"><Camera size={38}/><span className="text-sm font-black">Choose a clear photo</span></span>}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif" capture="user" className="sr-only" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setChoices([]); }} />
        </label>
        {preview && <label className="mt-2 block text-xs font-black text-slate-500">Crop zoom<input type="range" min="1" max="2" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="mt-1 w-full accent-violet-500" /></label>}
      </div>
      <div>
        <p className="text-sm font-black text-slate-700">Choose an art style</p>
        <div className="mt-2 grid grid-cols-2 gap-2">{STYLES.map((item) => <button key={item.value} type="button" onClick={() => setStyle(item.value)} className={`rounded-xl border-2 px-3 py-2 text-left text-xs font-black ${style === item.value ? "border-violet-500 bg-white text-violet-700" : "border-transparent bg-white/70 text-slate-600"}`}><span className="mr-1 text-lg">{item.icon}</span>{item.label}</button>)}</div>
        <label className="mt-3 flex items-start gap-2 rounded-xl bg-white p-3 text-xs font-bold text-slate-600"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5 accent-violet-600"/><span>I am the parent or guardian and consent to using this photo to create an avatar. The source photo is processed temporarily and is not saved by this app.</span></label>
        <button type="button" disabled={!file || !consent || generating} onClick={generate} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white disabled:opacity-40"><Sparkles size={18}/>{generating ? "Creating three avatars…" : "Create AI avatars"}</button>
      </div>
    </div>
    {choices.length > 0 && <div><p className="mb-2 text-sm font-black text-slate-700">Choose {name ? `${name}'s` : "the"} avatar</p><div className="grid grid-cols-3 gap-3">{choices.map((url) => <button key={url} type="button" onClick={() => onChange(url)} className={`relative overflow-hidden rounded-2xl border-4 bg-white ${value === url ? "border-emerald-500" : "border-white hover:border-violet-300"}`}><img src={url} alt="Generated avatar choice" className="aspect-square w-full object-cover"/>{value === url && <span className="absolute right-2 top-2 rounded-full bg-emerald-500 p-1 text-white"><Check size={16}/></span>}</button>)}</div></div>}
    {value && <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700"><span className="flex items-center gap-1"><Upload size={14}/> AI avatar selected</span><button type="button" onClick={() => onChange(null)} className="text-slate-500 underline">Remove</button></div>}
  </div>;
}
