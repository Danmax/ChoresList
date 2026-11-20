import { Fragment } from "react";
import { cropTime, gardenPlot, type FarmCropId, type FarmState } from "@/lib/sunny-farm";
import { FarmWorkTarget } from "./sunny-farm-tools";
import styles from "./sunny-farm.module.css";

/** Small vector plants stay sharp and legible as the nine plots resize. */
function CropArt({ crop, growth, ripe }: { crop: FarmCropId; growth: number; ripe: boolean }) {
  const tall = growth > .35 || ripe;
  const fruit = ripe || growth > .7;
  return <svg viewBox="0 0 160 95" aria-hidden="true" focusable="false">
    {[30, 80, 130].map((x, n) => <g key={x} transform={`translate(${x} ${n === 1 ? 0 : 6})`}>
      <ellipse cx="0" cy="82" rx="21" ry="5" fill="#382710" opacity=".2" />
      {!tall ? <><path d="M0 81V62" stroke="#397734" strokeWidth="4" /><path d="M0 72Q-26 70-16 58Q0 56 0 72M0 68Q23 62 15 52Q0 53 0 68" fill="#78b73d" stroke="#397734" strokeWidth="2" /></> : crop === "wheat" ? <>{[-13, 0, 13].map((dx, i) => <g key={dx} transform={`translate(${dx} ${i === 1 ? 0 : 9})`}>
        <path d="M0 78V23m0 38-12-9m12 0 10-10" fill="none" stroke={ripe ? "#a87d26" : "#4f903a"} strokeWidth="3" />
        {[26, 34, 42].map(y => <Fragment key={y}><ellipse cx="-4" cy={y} rx="4" ry="7" transform={`rotate(-32 -4 ${y})`} fill={ripe ? "#ffce50" : "#9ac455"} stroke="#a17b2b" strokeWidth="1" /><ellipse cx="4" cy={y - 3} rx="4" ry="7" transform={`rotate(32 4 ${y - 3})`} fill={ripe ? "#ffe082" : "#b5d66a"} /></Fragment>)}
      </g>)}</> : <>
        <path d="M0 80V32" stroke="#397535" strokeWidth="4" strokeLinecap="round" />
        <path d="M0 65Q-29 69-23 46Q-5 44 0 65M0 55Q28 56 23 34Q5 33 0 55M0 42Q-20 42-14 23Q0 24 0 42" fill="#56a53b" stroke="#317336" strokeWidth="2" />
        {fruit && (crop === "carrot" ? <path d="m-12 65 10 24q5 5 7-1l9-25q-13-8-26 2" fill="#f68b2e" stroke="#bc5823" strokeWidth="2" /> : crop === "corn" ? <><ellipse cx="8" cy="52" rx="9" ry="19" fill="#ffd653" stroke="#c8912a" strokeWidth="2" /><path d="M-3 47 7 73 21 45 16 73H2Z" fill="#65a63a" /></> : crop === "pumpkin" || crop === "watermelon" ? <>
          <ellipse cx="0" cy="70" rx="23" ry="16" fill={crop === "pumpkin" ? "#f59030" : "#6ca83f"} stroke={crop === "pumpkin" ? "#ae5424" : "#326b35"} strokeWidth="2" />
          <path d="M-9 56q-9 15 0 28M0 55q-6 16 0 30M10 57q7 13 0 26" fill="none" stroke={crop === "pumpkin" ? "#cd6a25" : "#386e35"} strokeWidth="3" /><path d="m0 55 4-9" stroke="#447235" strokeWidth="4" />
        </> : crop === "potato" ? <>{[-12, 5, 15].map((dx, i) => <g key={dx}><ellipse cx={dx} cy={74 + i % 2 * 6} rx="10" ry="7" fill="#d5ac6d" stroke="#946b39" strokeWidth="2" /><circle cx={dx + 2} cy={73 + i % 2 * 6} r="1.5" fill="#946b39" /></g>)}</> : crop === "strawberry" ? <>{[-13, 10].map(dx => <g key={dx} transform={`translate(${dx} 61)`}><path d="M-9 0Q0-9 9 0Q11 9 0 16Q-11 9-9 0" fill="#ef4f4e" stroke="#b82f3c" strokeWidth="2" /><path d="m-8-1 8 4 8-4-6-3-2-5-3 5Z" fill="#428538" /><path d="M-3 6v1m7 0v1m-4 3v1" stroke="#ffde8c" strokeWidth="2" /></g>)}</> : <>{[-14, 11, -3].map((dx, i) => <g key={dx}><circle cx={dx} cy={56 + i % 2 * 13} r={crop === "blueberry" ? 8 : 11} fill={crop === "blueberry" ? "#617bce" : "#ee5a42"} stroke={crop === "blueberry" ? "#3e4995" : "#b6332f"} strokeWidth="2" /><path d={`m${dx - 4} ${52 + i % 2 * 13} 4 3 4-3`} fill="none" stroke={crop === "blueberry" ? "#b2c3f1" : "#4d8438"} strokeWidth="2" /></g>)}</>)}
      </>}
    </g>)}
  </svg>;
}

export function GardenPlots({ farm, now, busy }: { farm: FarmState; now: number; busy: boolean }) {
  return <>{Array.from({ length: 9 }, (_, i) => {
    const row = Math.floor(i / 3), col = i % 3;
    const plot = gardenPlot(farm, i, now);
    const planted = !["empty", "tilled", "harvested"].includes(plot.phase);
    const label = plot.phase === "empty" ? `Hoe bed ${i + 1}` : plot.phase === "tilled" ? `Plant bed ${i + 1}` : plot.phase === "planted" ? `Water bed ${i + 1}` : `Harvest bed ${i + 1}`;
    const status = plot.phase === "growing" ? cropTime(plot.remainingMs) : { empty: "Hoe soil", tilled: "Plant seeds", planted: "Water me", ready: "Ready!", harvested: "Collected" }[plot.phase];
    const contents = <><span className={styles.bedPlants}>{planted && <CropArt crop={plot.crop.id} growth={plot.phase === "planted" ? 0 : plot.growth} ripe={plot.phase === "ready"} />}{plot.phase === "tilled" && <span className={styles.seedFurrows} aria-hidden="true">≋ ≋ ≋</span>}{plot.phase === "harvested" && <span className={styles.harvestCheck} aria-hidden="true">✓</span>}</span><span className={styles.plotCaption}><span>{i + 1}{planted ? ` · ${plot.crop.label}` : ""}</span><strong>{status}</strong></span></>;
    return <div key={i} data-row={row} data-crop={planted ? plot.crop.id : undefined} data-phase={plot.phase} title={`Bed ${i + 1}: ${planted ? plot.crop.label : "soil"}, ${status}`} className={`${styles.fieldBed} ${styles.cropPlot} ${plot.phase === "ready" ? styles.ripePlot : ""} ${plot.phase === "growing" ? styles.wetBed : ""}`} style={{ left: `${[24, 50, 76][col] + (col - 1) * row * 3}%`, top: `${[44, 61, 81][row]}%`, width: `${22 + row * 3}%` }}>
      {plot.action ? <FarmWorkTarget target={plot.action} label={label} disabled={busy} className={styles.bedTarget} style={{}}>{contents}</FarmWorkTarget> : <div className={styles.growingPlot} role="img" aria-label={`Bed ${i + 1}: ${plot.crop.label}, ${plot.phase === "growing" ? `ready in ${status}` : "collected"}`}>{contents}</div>}
      {plot.phase === "growing" && <span className={styles.growthTrack} role="progressbar" aria-label={`Bed ${i + 1} crop growth`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.floor(plot.growth * 100)}><span style={{ width: `${plot.growth * 100}%` }} /></span>}
    </div>;
  })}</>;
}
