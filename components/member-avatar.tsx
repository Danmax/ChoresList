import { cleanAvatarConfig, type AvatarConfig } from "@/lib/avatar";
import { useId } from "react";

type Props = { avatar?: string | null; avatarConfig?: AvatarConfig | unknown; name?: string; className?: string };

function Hair({ style, color }: { style: AvatarConfig["hairStyle"]; color: string }) {
  if (style === "bald") return null;
  const common = { fill: color, stroke: "#2A1712", strokeWidth: 3, strokeLinejoin: "round" as const };
  if (style === "long") return <g><path {...common} d="M65 75C63 39 88 24 116 26c29 2 47 18 47 48-17-2-27-12-35-30-13 18-36 29-63 31z"/><path d="M70 61q-15 49-5 94M155 61q15 49 4 94" stroke={color} strokeWidth="18" strokeLinecap="round" fill="none"/></g>;
  if (style === "bob") return <g><path {...common} d="M65 75C63 39 88 24 116 26c29 2 47 18 47 48-17-2-27-12-35-30-13 18-36 29-63 31z"/><path d="M69 62q-12 38-4 69M156 62q12 38 3 69" stroke={color} strokeWidth="20" strokeLinecap="round" fill="none"/></g>;
  if (style === "ponytail") return <><circle {...common} cx="169" cy="69" r="27" /><path {...common} d="M65 73C65 35 91 23 116 25c34 3 49 23 47 54-18-4-30-14-39-30-13 17-32 27-59 24z" /></>;
  if (style === "bun") return <><circle {...common} cx="123" cy="24" r="25" /><path {...common} d="M65 73C68 37 91 27 116 28c33 1 48 20 47 51-16-4-29-13-39-30-14 17-33 27-59 24z" /></>;
  if (style === "braids") return <><path {...common} d="M64 76C65 38 91 23 117 26c31 3 47 21 45 52-19-4-30-14-39-29-14 17-32 25-59 27z" />{[0,1,2].map((i)=><path key={i} {...common} d={`M${70+i*38} 58c-8 31-5 64 ${-10+i*10} 91`} fill="none" strokeWidth="10" />)}</>;
  if (style === "locs") return <><path {...common} d="M64 76C65 39 88 23 116 26c32 3 48 21 46 52-19-5-30-14-39-29-14 17-33 26-59 27z" />{[67,82,98,137,152].map((x,i)=><path key={x} d={`M${x} 57q${i%2?8:-6} 48 ${i%2?2:-5} 83`} stroke={color} strokeWidth="9" strokeLinecap="round" fill="none" />)}</>;
  if (style === "fade") return <path {...common} d="M69 70C70 36 92 25 116 27c28 2 44 18 44 47-15-8-27-17-36-29-15 16-31 23-55 25z" />;
  if (style === "curly" || style === "coily") return <g>{[[70,61],[77,43],[94,32],[115,30],[136,34],[153,48],[158,68],[91,50],[116,48],[139,57]].map(([x,y],i)=><circle key={i} {...common} cx={x} cy={y} r={style === "coily" ? 14 : 17} />)}</g>;
  if (style === "short") return <path {...common} d="M67 70c3-32 24-46 50-44 27 2 43 18 44 45-18-3-31-12-39-26-14 15-31 23-55 25z" />;
  return <path {...common} d="M65 75C63 39 88 24 116 26c29 2 47 18 47 48-17-2-27-12-35-30-13 18-36 29-63 31z" />;
}

export function MemberAvatar({ avatar = "🧒", avatarConfig, name = "Family member", className = "h-12 w-12" }: Props) {
  const config = cleanAvatarConfig(avatarConfig);
  const instanceId = useId().replaceAll(":", "");
  const glowId = `avatar-glow-${instanceId}`;
  const shirtId = `avatar-shirt-${instanceId}`;
  if (!config) return <span role="img" aria-label={`${name}'s avatar`} className={`grid place-items-center leading-none ${className}`}>{avatar}</span>;
  const eyeY = config.eyeStyle === "gentle" ? 91 : 88;
  return (
    <svg viewBox="0 0 224 224" role="img" aria-label={`${name}'s custom avatar`} className={`overflow-hidden rounded-[28%] ${className}`}>
      <defs><radialGradient id={glowId}><stop offset="0" stopColor="#fff" stopOpacity=".72"/><stop offset="1" stopColor={config.backgroundColor} stopOpacity="0"/></radialGradient><linearGradient id={shirtId} x2="0" y2="1"><stop stopColor="#fff" stopOpacity=".28"/><stop offset="1" stopColor="#000" stopOpacity=".15"/></linearGradient></defs>
      <rect width="224" height="224" rx="48" fill={config.backgroundColor}/><path d="M0 0l112 112L28 0zm224 0L112 112l84-112z" fill="#fff" opacity=".18"/><circle cx="112" cy="95" r="105" fill={`url(#${glowId})`}/>
      <path d="M35 224c5-51 31-72 77-72s72 21 77 72" fill={config.shirtColor} stroke="#26324A" strokeWidth="4"/><path d="M35 224c5-51 31-72 77-72s72 21 77 72" fill={`url(#${shirtId})`}/>
      <ellipse cx="62" cy="102" rx="17" ry="22" fill={config.skinTone} stroke="#8D4D2B" strokeWidth="3"/><ellipse cx="162" cy="102" rx="17" ry="22" fill={config.skinTone} stroke="#8D4D2B" strokeWidth="3"/>
      <path d="M67 75c0-35 20-52 45-52s45 17 45 52v42c0 32-21 54-45 54s-45-22-45-54z" fill={config.skinTone} stroke="#8D4D2B" strokeWidth="3"/>
      <ellipse cx="84" cy="123" rx="12" ry="7" fill="#F47272" opacity=".24"/><ellipse cx="140" cy="123" rx="12" ry="7" fill="#F47272" opacity=".24"/>
      <Hair style={config.hairStyle} color={config.hairColor}/>
      <path d="M77 77q13-9 25 0M122 77q13-9 25 0" stroke={config.hairColor} strokeWidth="5" strokeLinecap="round" fill="none"/>
      {config.eyeStyle === "happy" ? <><path d="M79 91q10-12 20 0" stroke="#332018" strokeWidth="5" strokeLinecap="round" fill="none"/><path d="M125 91q10-12 20 0" stroke="#332018" strokeWidth="5" strokeLinecap="round" fill="none"/></> : <>{[90,134].map((x)=><g key={x}><ellipse cx={x} cy={eyeY} rx={config.eyeStyle === "round" ? 13 : 11} ry={config.eyeStyle === "round" ? 15 : 13} fill="white" stroke="#332018" strokeWidth="3"/><circle cx={x} cy={eyeY+1} r="7" fill={config.eyeColor}/><circle cx={x} cy={eyeY+1} r="3.5" fill="#17120F"/><circle cx={x-2} cy={eyeY-3} r="2" fill="white"/></g>)}</>}
      {config.noseStyle === "round" ? <ellipse cx="112" cy="112" rx="7" ry="5" fill="#C9774E" opacity=".65"/> : <path d={config.noseStyle === "small" ? "M110 109q2 4 5 0" : config.noseStyle === "soft" ? "M109 105q-2 10 7 8" : "M108 111q4 6 9 0"} stroke="#B96845" strokeWidth="3" strokeLinecap="round" fill="none"/>}
      {config.mouthStyle === "big-smile" ? <g><path d="M85 128q27 34 54 0z" fill="#6D201C" stroke="#58201D" strokeWidth="3"/><path d="M91 130h42q-4 9-21 9t-21-9" fill="white"/><path d="M101 151q11-7 22 0" stroke="#EF6A72" strokeWidth="5" strokeLinecap="round"/></g> : config.mouthStyle === "grin" ? <path d="M88 130q24 19 48 0-4 24-24 24t-24-24" fill="white" stroke="#5B2921" strokeWidth="3"/> : <path d={config.mouthStyle === "calm" ? "M98 137q14 7 28 0" : "M92 132q20 23 40 0"} stroke="#6D201C" strokeWidth="4" strokeLinecap="round" fill="none"/>}
      {config.accessory === "freckles" && <g fill="#9A593A">{[82,88,94,130,136,142].map((x,i)=><circle key={x} cx={x} cy={112+(i%2)*3} r="1.6"/>)}</g>}
      {(config.accessory === "glasses" || config.accessory === "round-glasses") && <g fill="none" stroke="#334155" strokeWidth="4"><rect x="72" y="78" width="37" height="27" rx={config.accessory === "round-glasses" ? 14 : 8}/><rect x="115" y="78" width="37" height="27" rx={config.accessory === "round-glasses" ? 14 : 8}/><path d="M109 89h6M67 84h6m79 0h6"/></g>}
      {config.accessory === "sunglasses" && <g fill="#26324A" stroke="#111827" strokeWidth="3"><path d="M71 80h39v24H80q-9-4-9-24z"/><path d="M114 80h39q0 20-9 24h-30z"/><path d="M108 88h8" fill="none"/></g>}
      {config.accessory === "headband" && <path d="M68 61q43-37 88 0" stroke="#EC4899" strokeWidth="9" fill="none"/>}
      {config.accessory === "bow" && <g fill="#EC4899" stroke="#9D174D" strokeWidth="3"><path d="M145 45q22-18 21 10-2 22-21 5z"/><path d="M145 45q-17-18-18 9 2 19 18 6z"/><circle cx="145" cy="53" r="7"/></g>}
      {config.accessory === "cap" && <g fill="#3B82F6" stroke="#1E3A8A" strokeWidth="3"><path d="M67 57q12-42 49-38 36 2 44 40z"/><path d="M112 54q37-5 57 9-35 5-57 0z"/></g>}
      {config.accessory === "earrings" && <g fill="#FACC15" stroke="#A16207" strokeWidth="2"><circle cx="61" cy="119" r="6"/><circle cx="163" cy="119" r="6"/></g>}
      {config.accessory === "hearing-aid" && <path d="M164 93q15 3 10 20l-5 13" stroke="#7C3AED" strokeWidth="6" strokeLinecap="round" fill="none"/>}
      <path d="M78 181q34 16 68 0" stroke="#fff" strokeOpacity=".35" strokeWidth="5" strokeLinecap="round" fill="none"/>
    </svg>
  );
}
